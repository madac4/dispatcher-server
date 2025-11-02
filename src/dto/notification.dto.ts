import { IUser } from '../types/auth.types'
import {
	INotification,
	NotificationStatus,
	NotificationType,
} from '../types/notification.types'

export class NotificationDTO {
	id: string
	recipientId: string
	senderId?: string
	type: NotificationType
	status: NotificationStatus
	title: string
	message: string
	metadata?: {
		orderId?: string
		orderNumber?: string
		chatId?: string
		fileId?: string
		userId?: string
		teamId?: string
		fileName?: string
		messageId?: string
		[key: string]: unknown
	}
	actionUrl?: string
	actionText?: string
	expiresAt?: string
	readAt?: string
	createdAt: string
	updatedAt: string
	unread: boolean
	constructor(notification: INotification) {
		this.id = notification._id || ''
		this.recipientId = (notification.recipientId as string) || ''
		this.senderId = (notification.senderId as IUser)?._id || ''
		this.type = notification.type || ''
		this.status = notification.status || ''
		this.title = notification.title || ''
		this.message = notification.message || ''
		this.metadata = notification.metadata || {}
		this.actionUrl = notification.actionUrl || ''
		this.actionText = notification.actionText || ''
		this.expiresAt = notification.expiresAt?.toISOString() || ''
		this.readAt = notification.readAt?.toISOString() || ''
		this.createdAt = notification.createdAt?.toISOString() || ''
		this.updatedAt = notification.updatedAt?.toISOString() || ''
		this.unread = notification.status === NotificationStatus.UNREAD
	}
}
