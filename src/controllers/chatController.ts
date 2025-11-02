import { NextFunction, Request, Response } from 'express'
import { MessageDTO } from '../dto/message.dto'
import ChatMessage from '../models/chatMessage.model'
import Order from '../models/order.model'
import OrderChat from '../models/orderChat.model'
import { notificationService } from '../services/notification.service'
import { socketService } from '../services/socket.service'
import { IChatMessage, MessagePayload } from '../types/chat.types'
import {
	CreatePaginationMeta,
	PaginatedResponse,
	PaginationMeta,
	SuccessResponse,
} from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'

export const sendMessage = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { id: userId, email: userEmail } = req.user

		const { orderId, message }: MessagePayload = req.body

		if (!orderId || !message) {
			return next(
				new ErrorHandler('Order ID and message are required', 400),
			)
		}

		const order = await Order.findOne({ _id: orderId })
		if (!order) {
			return next(
				new ErrorHandler('Order not found or access denied', 404),
			)
		}

		const newMessage = new ChatMessage({
			orderId,
			userId,
			message,
		})

		const savedMessage = await newMessage.save()

		let orderChat = await OrderChat.findOne({ orderId })

		if (!orderChat) {
			orderChat = new OrderChat({
				orderId,
				messages: [savedMessage._id as any],
				lastMessage: savedMessage._id as any,
			})
		} else {
			orderChat.messages.push(savedMessage._id as any)
			orderChat.lastMessage = savedMessage._id as any
		}

		await orderChat.save()

		const populatedMessage = (await ChatMessage.findById(
			savedMessage._id,
		).populate('userId', 'email')) as IChatMessage

		const messageDTO = new MessageDTO(populatedMessage)

		socketService.broadcastMessage(orderId, messageDTO)

		notificationService.notifyOrderMessage(
			orderId,
			userId,
			userEmail,
			message,
		)

		res.status(201).json(
			SuccessResponse(messageDTO, 'Message sent successfully'),
		)
	},
)

export const getOrderMessages = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const { orderId } = req.params
		const page = parseInt(req.query.page as string) || 1
		const limit = parseInt(req.query.limit as string) || 50
		const skip = (page - 1) * limit

		const order = await Order.findOne({ _id: orderId })
		if (!order) {
			return next(
				new ErrorHandler('Order not found or access denied', 404),
			)
		}

		const messages = await ChatMessage.find({ orderId })
			.populate('userId', 'email')
			.skip(skip)
			.limit(limit)
			.lean()

		const total = await ChatMessage.countDocuments({ orderId })

		await OrderChat.findOneAndUpdate(
			{ orderId },
			{ unreadCount: 0 },
			{ upsert: true },
		)

		const messagesDTO = messages.map(message => new MessageDTO(message))

		const meta: PaginationMeta = CreatePaginationMeta(total, page, limit)

		res.status(200).json(PaginatedResponse(messagesDTO, meta))
	},
)

export const deleteMessage = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.id
		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const { messageId } = req.params

		const message = await ChatMessage.findById(messageId)
		if (!message) {
			return next(new ErrorHandler('Message not found', 404))
		}

		if (message.userId !== userId) {
			return next(new ErrorHandler('Access denied', 403))
		}

		await ChatMessage.findByIdAndDelete(messageId)

		const orderChat = await OrderChat.findOne({ orderId: message.orderId })
		if (orderChat) {
			orderChat.messages = orderChat.messages.filter(
				msgId => msgId.toString() !== messageId,
			)

			if (orderChat.lastMessage?.toString() === messageId) {
				const lastMessage = await ChatMessage.findOne({
					orderId: message.orderId,
				}).sort({ createdAt: -1 })
				orderChat.lastMessage = (lastMessage?._id as any) || null
			}

			await orderChat.save()
		}

		res.status(200).json(
			SuccessResponse(null, 'Message deleted successfully'),
		)
	} catch (error) {
		console.error('Error deleting message:', error)
		return next(
			new ErrorHandler(
				'Internal server error while deleting message',
				500,
			),
		)
	}
}
