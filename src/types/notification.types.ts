import { Model } from 'mongoose'
import { IUser } from './auth.types'

export enum NotificationType {
	ORDER_CREATED = 'order_created',
	ORDER_UPDATED = 'order_updated',
	ORDER_DELETED = 'order_deleted',
	NEW_MESSAGE = 'new_message',
	USER_JOINED = 'user_joined',
	FILE_UPLOADED = 'file_uploaded',
	FILE_DELETED = 'file_deleted',
	SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export enum NotificationStatus {
	UNREAD = 'unread',
	READ = 'read',
	ARCHIVED = 'archived',
}

export interface INotification {
	_id?: string
	recipientId: string | IUser
	senderId?: string | IUser
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
		[key: string]: any
	}
	actionUrl?: string
	actionText?: string
	expiresAt?: Date
	readAt?: Date
	createdAt: Date
	updatedAt: Date
}

export interface INotificationModel extends Model<INotification> {
	getUserStats(recipientId: string): Promise<INotificationStats>
	markAsRead(notificationIds: string[], recipientId: string): Promise<void>
	markAllAsRead(recipientId: string): Promise<void>
	cleanupExpired(): Promise<{ deletedCount: number }>
}

export interface INotificationCreateRequest {
	recipientId: string | IUser
	senderId?: string
	type: NotificationType
	title: string
	message: string
	metadata?: {
		orderId?: string
		orderNumber?: string
		chatId?: string
		fileId?: string
		userId?: string
		teamId?: string
		[key: string]: any
	}
	actionUrl?: string
	actionText?: string
	expiresAt?: Date
}

export interface INotificationUpdateRequest {
	status?: NotificationStatus
	readAt?: Date
}

export interface INotificationQuery {
	unreadOnly?: boolean
}

export interface INotificationStats {
	total: number
	unread: number
	byType: Record<NotificationType, number>
}

export interface INotificationResponse {
	success: boolean
	message: string
	data?: INotification | INotification[]
	stats?: INotificationStats
	total?: number
	page?: number
	limit?: number
}
