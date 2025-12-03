import { NotificationDTO } from '../dto/notification.dto'
import Notification from '../models/notification.model'
import Order from '../models/order.model'
import User from '../models/user.model'
import { IUser, UserRole } from '../types/auth.types'
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
import { EmailService } from './email.service'
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

			if (!adminsAndModerators.length) {
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

			const emailData = {
				orderNumber,
				actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${orderNumber}`,
				actionText: 'View Order',
				title: `New Order Created - #${orderNumber}`,
			}

			if (!process.env.ADMIN_EMAIL) {
				throw new ErrorHandler('Admin email not found', 500)
			}

			await EmailService.sendEmail(
				'newOrderEmail',
				emailData,
				process.env.ADMIN_EMAIL,
				emailData.title,
			)
		} catch (error: any) {
			console.error('Failed to send order creation notification:', error)
		}
	}

	async notifyOrderModerated(
		orderId: string,
		moderatorId: string,
	): Promise<void> {
		try {
			const order = await Order.findById(orderId).populate(
				'userId',
				'email',
			)
			const moderator = await User.findById(moderatorId)

			if (!order) {
				throw new ErrorHandler('Order not found', 404)
			}

			const orderUser = order.userId as IUser

			const notificationData: INotificationCreateRequest = {
				recipientId: orderUser._id,
				senderId: moderatorId,
				type: NotificationType.ORDER_UPDATED,
				title: `Order #${order.orderNumber} is now moderated`,
				message: `Your order is now moderated by ${moderator?.email}.`,
				metadata: {
					orderId,
					moderatorId,
				},
				actionUrl: `/dashboard/orders/${order.orderNumber}`,
				actionText: 'View Order',
			}

			await this.createNotification(notificationData)

			const emailData = {
				orderNumber: order.orderNumber,
				moderatorEmail: moderator?.email,
				actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${order.orderNumber}`,
				actionText: 'View Order',
				title: `New Order Moderator - #${order.orderNumber}`,
			}

			if (!process.env.ADMIN_EMAIL) {
				throw new ErrorHandler('Admin email not found', 500)
			}

			await EmailService.sendEmail(
				'newModeratorEmail',
				emailData,
				orderUser.email,
				emailData.title,
			)
		} catch (error: any) {
			console.error('Failed to send order creation notification:', error)
		}
	}

	async notifyOrderFileUploaded(
		orderId: string,
		uploadedBy: string,
		uploadedByEmail: string,
		filename: string,
	): Promise<void> {
		try {
			const order = await Order.findById(orderId)
				.populate('userId', 'email')
				.populate('moderatorId', 'email')

			if (!order) {
				throw new ErrorHandler('Order not found', 404)
			}

			const orderUser = order.userId as IUser

			const recipientId =
				orderUser._id.toString() === uploadedBy
					? order.moderatorId._id
					: orderUser._id
			const recipientEmail =
				orderUser._id.toString() === uploadedBy
					? order.moderatorId.email
					: orderUser.email

			const notificationData: INotificationCreateRequest = {
				recipientId,
				senderId: uploadedBy,
				type: NotificationType.ORDER_UPDATED,
				title: `New file uploaded to order #${order.orderNumber}`,
				message: `A new file has been uploaded to your order #${order.orderNumber}.`,
				metadata: {
					orderId,
				},
				actionUrl: `/dashboard/orders/${order.orderNumber}`,
				actionText: 'View File',
			}

			await this.createNotification(notificationData)

			const emailData = {
				orderNumber: order.orderNumber,
				fileName: filename,
				uploadedBy: uploadedByEmail,
				actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${order.orderNumber}`,
				actionText: 'View File',
				title: `New File Uploaded to Order #${order.orderNumber}`,
			}

			if (!process.env.ADMIN_EMAIL) {
				throw new ErrorHandler('Admin email not found', 500)
			}

			await EmailService.sendEmail(
				'newFileUploadEmail',
				emailData,
				recipientEmail,
				emailData.title,
			)
		} catch (error: any) {
			console.error('Failed to send order creation notification:', error)
		}
	}

	async notifyOrderMessage(
		orderId: string,
		senderId: string,
		senderEmail: string,
		message: string,
	): Promise<void> {
		try {
			const order = await Order.findById(orderId)
				.populate('userId', 'email')
				.populate('moderatorId', 'email')

			if (!order) {
				throw new ErrorHandler('Order not found', 404)
			}

			const orderUser = order.userId as IUser

			const recipientId =
				orderUser._id.toString() === senderId
					? order.moderatorId._id
					: orderUser._id

			const recipientEmail =
				orderUser._id.toString() === senderId
					? order.moderatorId.email
					: orderUser.email

			const notificationData: INotificationCreateRequest = {
				recipientId,
				senderId,
				type: NotificationType.ORDER_UPDATED,
				title: `New message from ${senderEmail}`,
				message,
				metadata: {
					orderId,
				},
				actionUrl: `/dashboard/orders/${order.orderNumber}`,
				actionText: 'View Message',
			}

			await this.createNotification(notificationData)

			const emailData = {
				orderNumber: order.orderNumber,
				senderEmail: senderEmail,
				actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${order.orderNumber}`,
				actionText: 'View Message',
				title: `New Message from ${senderEmail}`,
				message: message,
			}

			if (!process.env.ADMIN_EMAIL)
				throw new ErrorHandler('Admin email not found', 500)

			await EmailService.sendEmail(
				'newMessageEmail',
				emailData,
				recipientEmail,
				emailData.title,
			)
		} catch (error: any) {
			console.error('Failed to send order creation notification:', error)
		}
	}

	async getUserNotifications(
		userId: string,
		query: PaginationQuery,
	): Promise<PaginatedModel<NotificationDTO>> {
		try {
			const { unreadOnly, page, limit, status, type, startDate, endDate } = query

			const filter: any = { recipientId: userId }
			
			if (unreadOnly) {
				filter.status = NotificationStatus.UNREAD
			} else if (status) {
				filter.status = status
			}
			
			if (type) {
				filter.type = type
			}
			
			if (startDate || endDate) {
				filter.createdAt = {}
				if (startDate) {
					filter.createdAt.$gte = new Date(startDate as string)
				}
				if (endDate) {
					// Set end date to end of day
					const end = new Date(endDate as string)
					end.setHours(23, 59, 59, 999)
					filter.createdAt.$lte = end
				}
			}

			const skip = (page - 1) * limit

			const notifications = await Notification.find(filter)
				.populate('senderId', 'email')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean()

			const total = await Notification.countDocuments(filter)

			const meta: PaginationMeta = CreatePaginationMeta(
				total,
				page,
				limit,
			)

			const notificationsDTO = notifications.map(
				notification => new NotificationDTO(notification),
			)

			return PaginatedResponse(notificationsDTO, meta)
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
	 * Notify user when invoice is created
	 */
	async notifyInvoiceCreated(
		invoiceId: string,
		invoiceNumber: string,
		userId: string,
		adminId: string,
	): Promise<void> {
		try {
			const notificationData: INotificationCreateRequest = {
				recipientId: userId,
				senderId: adminId,
				type: NotificationType.INVOICE_CREATED,
				title: 'New Invoice Received',
				message: `You have received a new invoice #${invoiceNumber}.`,
				metadata: {
					invoiceId,
					invoiceNumber,
				},
				actionUrl: `/dashboard/invoices/${invoiceId}`,
				actionText: 'View Invoice',
			}

			await this.createNotification(notificationData)

			console.log(`Invoice creation notification sent to user ${userId}`)
		} catch (error: any) {
			console.error(
				'Failed to send invoice creation notification:',
				error,
			)
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
