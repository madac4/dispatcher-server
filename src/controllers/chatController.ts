import { NextFunction, Request, Response } from 'express'
import ChatMessage from '../models/chatMessage.model'
import Order from '../models/order.model'
import OrderChat from '../models/orderChat.model'
import { socketService } from '../services/socket.service'
import { ICreateMessageRequest } from '../types/chat.types'
import { SuccessResponse } from '../types/response.types'
import { ErrorHandler } from '../utils/ErrorHandler'

// Send a message to an order chat
export const sendMessage = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.id
		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const messageData: ICreateMessageRequest = req.body
		const {
			orderId,
			message,
			messageType = 'text',
			senderType = 'user',
			attachments = [],
		} = messageData

		// Validate required fields
		if (!orderId || !message) {
			return next(
				new ErrorHandler('Order ID and message are required', 400),
			)
		}

		// Verify order exists and user has access
		const order = await Order.findOne({ _id: orderId, userId })
		if (!order) {
			return next(
				new ErrorHandler('Order not found or access denied', 404),
			)
		}

		// Create new message
		const newMessage = new ChatMessage({
			orderId,
			userId,
			message,
			messageType,
			senderType,
			attachments,
			isRead: false,
		})

		const savedMessage = await newMessage.save()

		// Update or create order chat
		let orderChat = await OrderChat.findOne({ orderId })

		if (!orderChat) {
			// Create new chat session for this order
			orderChat = new OrderChat({
				orderId,
				messages: [savedMessage._id as any],
				lastMessage: savedMessage._id as any,
				unreadCount: 1,
			})
		} else {
			// Update existing chat session
			orderChat.messages.push(savedMessage._id as any)
			orderChat.lastMessage = savedMessage._id as any
			orderChat.unreadCount += 1
		}

		await orderChat.save()

		// Populate user information for response
		const populatedMessage = await ChatMessage.findById(
			savedMessage._id,
		).populate('userId', 'firstName lastName email')

		// Broadcast message to all users in the order room via Socket.IO
		socketService.broadcastMessage(orderId, populatedMessage as any)

		res.status(201).json(
			SuccessResponse(populatedMessage, 'Message sent successfully'),
		)
	} catch (error) {
		console.error('Error sending message:', error)
		return next(
			new ErrorHandler(
				'Internal server error while sending message',
				500,
			),
		)
	}
}

// Get chat messages for an order
export const getOrderMessages = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.id
		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const { orderId } = req.params
		const page = parseInt(req.query.page as string) || 1
		const limit = parseInt(req.query.limit as string) || 50
		const skip = (page - 1) * limit

		// Verify order exists and user has access
		const order = await Order.findOne({ _id: orderId, userId })
		if (!order) {
			return next(
				new ErrorHandler('Order not found or access denied', 404),
			)
		}

		// Get messages with pagination
		const messages = await ChatMessage.find({ orderId })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate('userId', 'firstName lastName email')
			.lean()

		// Get total count
		const total = await ChatMessage.countDocuments({ orderId })

		// Mark messages as read if they're from other users
		const unreadMessages = messages.filter(
			msg => !msg.isRead && msg.userId !== userId,
		)

		if (unreadMessages.length > 0) {
			await ChatMessage.updateMany(
				{ _id: { $in: unreadMessages.map(msg => msg._id) } },
				{ isRead: true },
			)
		}

		// Update unread count in order chat
		await OrderChat.findOneAndUpdate(
			{ orderId },
			{ unreadCount: 0 },
			{ upsert: true },
		)

		res.status(200).json({
			success: true,
			message: 'Messages retrieved successfully',
			data: {
				messages: messages.reverse(), // Return in chronological order
				total,
				page,
				limit,
				hasMore: skip + limit < total,
			},
		})
	} catch (error) {
		console.error('Error getting messages:', error)
		return next(
			new ErrorHandler(
				'Internal server error while retrieving messages',
				500,
			),
		)
	}
}

// Get all order chats for a user
export const getUserOrderChats = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.id
		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const page = parseInt(req.query.page as string) || 1
		const limit = parseInt(req.query.limit as string) || 10
		const skip = (page - 1) * limit

		// Get user's orders with chat information
		const orders = await Order.find({ userId })
			.sort({ updatedAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean()

		const orderIds = orders.map(order => order._id)

		// Get chat information for these orders
		const orderChats = await OrderChat.find({ orderId: { $in: orderIds } })
			.populate('lastMessage')
			.lean()

		// Combine order and chat information
		const orderChatData = orders.map(order => {
			const chat = orderChats.find(c => c.orderId === order._id)
			return {
				order,
				chat: chat || null,
				unreadCount: chat?.unreadCount || 0,
				lastMessage: chat?.lastMessage || null,
			}
		})

		const total = await Order.countDocuments({ userId })

		res.status(200).json({
			success: true,
			message: 'Order chats retrieved successfully',
			data: {
				orderChats: orderChatData,
				total,
				page,
				limit,
				hasMore: skip + limit < total,
			},
		})
	} catch (error) {
		console.error('Error getting user order chats:', error)
		return next(
			new ErrorHandler(
				'Internal server error while retrieving order chats',
				500,
			),
		)
	}
}

// Mark messages as read
export const markMessagesAsRead = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.id
		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const { orderId } = req.params

		// Verify order exists and user has access
		const order = await Order.findOne({ _id: orderId, userId })
		if (!order) {
			return next(
				new ErrorHandler('Order not found or access denied', 404),
			)
		}

		// Mark all unread messages as read
		await ChatMessage.updateMany(
			{ orderId, isRead: false, userId: { $ne: userId } },
			{ isRead: true },
		)

		// Update unread count in order chat
		await OrderChat.findOneAndUpdate(
			{ orderId },
			{ unreadCount: 0 },
			{ upsert: true },
		)

		res.status(200).json(SuccessResponse(null, 'Messages marked as read'))
	} catch (error) {
		console.error('Error marking messages as read:', error)
		return next(
			new ErrorHandler(
				'Internal server error while marking messages as read',
				500,
			),
		)
	}
}

// Delete a message
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

		// Find message and verify ownership
		const message = await ChatMessage.findById(messageId)
		if (!message) {
			return next(new ErrorHandler('Message not found', 404))
		}

		// Verify user owns the message or has admin access
		if (message.userId !== userId) {
			return next(new ErrorHandler('Access denied', 403))
		}

		await ChatMessage.findByIdAndDelete(messageId)

		// Update order chat
		const orderChat = await OrderChat.findOne({ orderId: message.orderId })
		if (orderChat) {
			orderChat.messages = orderChat.messages.filter(
				msgId => msgId.toString() !== messageId,
			)

			// Update last message if this was the last message
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

// Get unread message count for an order
export const getUnreadCount = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const userId = req.user.id
		if (!userId)
			return next(new ErrorHandler('User not authenticated', 401))

		const { orderId } = req.params

		// Verify order exists and user has access
		const order = await Order.findOne({ _id: orderId, userId })
		if (!order) {
			return next(
				new ErrorHandler('Order not found or access denied', 404),
			)
		}

		const unreadCount = await ChatMessage.countDocuments({
			orderId,
			isRead: false,
			userId: { $ne: userId },
		})

		res.status(200).json(
			SuccessResponse({ unreadCount }, 'Unread count retrieved'),
		)
	} catch (error) {
		console.error('Error getting unread count:', error)
		return next(
			new ErrorHandler(
				'Internal server error while getting unread count',
				500,
			),
		)
	}
}
