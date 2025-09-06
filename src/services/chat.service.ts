import ChatMessage from '../models/chatMessage.model'
import OrderChat from '../models/orderChat.model'
import { IChatMessage } from '../types/chat.types'

export class ChatService {
	static async sendSystemMessage(
		orderId: string,
		message: string,
		senderType: 'admin' | 'system' | 'user' = 'system',
	): Promise<IChatMessage> {
		const systemMessage = new ChatMessage({
			orderId,
			userId: null,
			message,
			messageType: 'system',
			senderType,
			isRead: false,
		})

		const savedMessage = await systemMessage.save()

		await OrderChat.findOneAndUpdate(
			{ orderId },
			{
				$push: { messages: savedMessage._id },
				$set: { lastMessage: savedMessage._id },
				$inc: { unreadCount: 1 },
			},
			{ upsert: true },
		)

		return savedMessage
	}

	static async getChatStats(orderId: string) {
		const totalMessages = await ChatMessage.countDocuments({ orderId })
		const unreadMessages = await ChatMessage.countDocuments({
			orderId,
			isRead: false,
		})
		const userMessages = await ChatMessage.countDocuments({
			orderId,
			senderType: 'user',
		})
		const adminMessages = await ChatMessage.countDocuments({
			orderId,
			senderType: 'admin',
		})
		const systemMessages = await ChatMessage.countDocuments({
			orderId,
			senderType: 'system',
		})

		return {
			totalMessages,
			unreadMessages,
			userMessages,
			adminMessages,
			systemMessages,
		}
	}

	// Search messages in an order chat
	static async searchMessages(
		orderId: string,
		searchTerm: string,
		userId: string,
	) {
		const messages = await ChatMessage.find({
			orderId,
			message: { $regex: searchTerm, $options: 'i' },
		})
			.sort({ createdAt: -1 })
			.populate('userId', 'firstName lastName email')
			.lean()

		return messages
	}

	// Get recent activity for all user orders
	static async getRecentActivity(userId: string, limit: number = 10) {
		const recentMessages = await ChatMessage.find({
			userId: { $ne: userId }, // Messages from others
		})
			.sort({ createdAt: -1 })
			.limit(limit)
			.populate('orderId', 'orderNumber commodity')
			.populate('userId', 'firstName lastName email')
			.lean()

		return recentMessages
	}

	// Archive old messages (for performance)
	static async archiveOldMessages(orderId: string, daysOld: number = 90) {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - daysOld)

		const oldMessages = await ChatMessage.find({
			orderId,
			createdAt: { $lt: cutoffDate },
		})

		// Here you would implement archiving logic
		// For now, we'll just mark them as archived
		await ChatMessage.updateMany(
			{ orderId, createdAt: { $lt: cutoffDate } },
			{ $set: { archived: true } },
		)

		return oldMessages.length
	}

	// Get chat participants for an order
	static async getChatParticipants(orderId: string) {
		const participants = await ChatMessage.aggregate([
			{ $match: { orderId } },
			{ $group: { _id: '$userId' } },
			{
				$lookup: {
					from: 'users',
					localField: '_id',
					foreignField: '_id',
					as: 'userInfo',
				},
			},
			{ $unwind: '$userInfo' },
			{
				$project: {
					userId: '$_id',
					firstName: '$userInfo.firstName',
					lastName: '$userInfo.lastName',
					email: '$userInfo.email',
				},
			},
		])

		return participants
	}

	// Mark all messages as read for a user in an order
	static async markAllAsRead(orderId: string, userId: string) {
		await ChatMessage.updateMany(
			{
				orderId,
				isRead: false,
				userId: { $ne: userId },
			},
			{ isRead: true },
		)

		await OrderChat.findOneAndUpdate({ orderId }, { unreadCount: 0 })
	}

	// Get message history with pagination
	static async getMessageHistory(
		orderId: string,
		page: number = 1,
		limit: number = 50,
	) {
		const skip = (page - 1) * limit

		const messages = await ChatMessage.find({ orderId })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate('userId', 'firstName lastName email')
			.lean()

		const total = await ChatMessage.countDocuments({ orderId })

		return {
			messages: messages.reverse(), // Return in chronological order
			total,
			page,
			limit,
			hasMore: skip + limit < total,
		}
	}
}
