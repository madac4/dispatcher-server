import Notification from '../models/notification.model'
import User from '../models/user.model'
import { UserRole } from '../types/auth.types'
import {
	INotification,
	INotificationCreateRequest,
	INotificationModel,
	INotificationStats,
	INotificationUpdateRequest,
	NotificationStatus,
	NotificationType,
} from '../types/notification.types'
import {
	CreatePaginationMeta,
	PaginatedModel,
	PaginatedResponse,
	PaginationMeta,
	PaginationQuery,
} from '../types/response.types'
import { ErrorHandler } from '../utils/ErrorHandler'
import { socketService } from './socket.service'

export class NotificationService {
	async createNotification(
		notificationData: INotificationCreateRequest,
	): Promise<INotification> {
		try {
			const notification = new Notification({
				...notificationData,
				status: NotificationStatus.UNREAD,
			})

			const savedNotification = await notification.save()

			await this.sendRealtimeNotification(savedNotification)

			return savedNotification
		} catch (error: any) {
			throw new ErrorHandler(
				`Failed to create notification: ${error.message}`,
				500,
			)
		}
	}

	async notifyOrderCreated(
		orderId: string,
		orderNumber: string,
		senderId: string,
	): Promise<void> {
		try {
			const adminsAndModerators = await User.find({
				role: { $in: [UserRole.ADMIN, UserRole.MODERATOR] },
			}).select('_id email')

			if (adminsAndModerators.length === 0) {
				console.log('No admins or moderators found to notify')
				return
			}

			const recipientIds = adminsAndModerators.map(user =>
				user._id.toString(),
			)

			recipientIds.map(async id => {
				const notificationData: INotificationCreateRequest = {
					recipientId: id,
					senderId,
					type: NotificationType.ORDER_CREATED,
					title: 'New Order Created',
					message: `A new order #${orderNumber} has been created.`,
					metadata: {
						orderId,
						orderNumber,
					},
					actionUrl: `/dashboard/orders/${orderNumber}`,
					actionText: 'View Order',
				}

				await this.createNotification(notificationData)

				console.log(
					`Order creation notification sent to admin/moderator ${id}`,
				)
			})
		} catch (error: any) {
			console.error('Failed to send order creation notification:', error)
		}
	}

	async getUserNotifications(
		userId: string,
		query: PaginationQuery,
	): Promise<PaginatedModel<INotification>> {
		try {
			const { unreadOnly, page, limit } = query

			const filter: any = { recipientId: userId }
			if (unreadOnly) filter.status = NotificationStatus.UNREAD

			const skip = (page - 1) * limit

			const notifications = await Notification.find(filter)
				.populate('senderId', 'email')
				.skip(skip)
				.limit(limit)
				.lean()

			const total = await Notification.countDocuments(filter)

			const meta: PaginationMeta = CreatePaginationMeta(
				total,
				page,
				limit,
			)

			return PaginatedResponse(notifications, meta)
		} catch (error: any) {
			throw new ErrorHandler(
				`Failed to get notifications: ${error.message}`,
				500,
			)
		}
	}

	/**
	 * Get notification statistics for a user
	 */
	async getUserNotificationStats(
		userId: string,
	): Promise<INotificationStats> {
		try {
			const stats = await (
				Notification as INotificationModel
			).getUserStats(userId)
			return stats
		} catch (error: any) {
			throw new ErrorHandler(
				`Failed to get notification stats: ${error.message}`,
				500,
			)
		}
	}

	async markNotificationsAsRead(
		notificationIds: string[],
		userId: string,
	): Promise<void> {
		await Notification.markAsRead(notificationIds, userId)
	}

	async markAllNotificationsAsRead(userId: string): Promise<void> {
		try {
			await (Notification as INotificationModel).markAllAsRead(userId)
		} catch (error: any) {
			throw new ErrorHandler(
				`Failed to mark all notifications as read: ${error.message}`,
				500,
			)
		}
	}

	/**
	 * Update notification
	 */
	async updateNotification(
		notificationId: string,
		userId: string,
		updateData: INotificationUpdateRequest,
	): Promise<INotification> {
		try {
			const notification = await Notification.findOneAndUpdate(
				{ _id: notificationId, recipientId: userId },
				updateData,
				{ new: true },
			)

			if (!notification) {
				throw new ErrorHandler('Notification not found', 404)
			}

			return notification
		} catch (error: any) {
			if (error instanceof ErrorHandler) throw error
			throw new ErrorHandler(
				`Failed to update notification: ${error.message}`,
				500,
			)
		}
	}

	/**
	 * Delete notification
	 */
	async deleteNotification(
		notificationId: string,
		userId: string,
	): Promise<void> {
		try {
			const result = await Notification.deleteOne({
				_id: notificationId,
				recipientId: userId,
			})

			if (result.deletedCount === 0) {
				throw new ErrorHandler('Notification not found', 404)
			}
		} catch (error: any) {
			if (error instanceof ErrorHandler) throw error
			throw new ErrorHandler(
				`Failed to delete notification: ${error.message}`,
				500,
			)
		}
	}

	private async sendRealtimeNotification(
		notification: INotification,
	): Promise<void> {
		try {
			const userId =
				typeof notification.recipientId === 'string'
					? notification.recipientId
					: notification.recipientId._id

			socketService.sendNotification(userId, {
				id: notification._id,
				type: notification.type,
				title: notification.title,
				message: notification.message,
				metadata: notification.metadata,
				actionUrl: notification.actionUrl,
				actionText: notification.actionText,
				createdAt: notification.createdAt,
			})
		} catch (error: any) {
			console.error('Failed to send real-time notification:', error)
		}
	}

	/**
	 * Clean up expired notifications
	 */
	async cleanupExpiredNotifications(): Promise<{ deletedCount: number }> {
		try {
			return await (Notification as INotificationModel).cleanupExpired()
		} catch (error: any) {
			throw new ErrorHandler(
				`Failed to cleanup expired notifications: ${error.message}`,
				500,
			)
		}
	}
}

export const notificationService = new NotificationService()
