import { NextFunction, Request, Response } from 'express'
import { notificationService } from '../services/notification.service'
import {
	INotificationCreateRequest,
	INotificationUpdateRequest,
} from '../types/notification.types'
import { PaginationQuery } from '../types/response.types'
import { CatchAsyncErrors, ErrorHandler } from '../utils/ErrorHandler'

export const getNotifications = CatchAsyncErrors(
	async (req: Request, res: Response) => {
		const userId = req.user.id

		const payload = req.query as unknown as PaginationQuery

		const query = {
			page: payload.page || 1,
			limit: payload.limit || 20,
			unreadOnly: payload.unreadOnly || false,
			search: payload.search || '',
			status: payload.status,
			type: payload.type,
			startDate: payload.startDate,
			endDate: payload.endDate,
		}

		const result = await notificationService.getUserNotifications(
			userId,
			query,
		)

		res.status(200).json(result)
	},
)

export const getNotificationStats = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.id

		const stats = await notificationService.getUserNotificationStats(userId)

		res.status(200).json({
			success: true,
			message: 'Notification stats retrieved successfully',
			data: stats,
		})
	},
)

export const markNotificationsAsRead = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.id
		const { notificationIds } = req.body

		if (!notificationIds || !Array.isArray(notificationIds)) {
			return next(
				new ErrorHandler('Notification IDs array is required', 400),
			)
		}

		await notificationService.markNotificationsAsRead(
			notificationIds,
			userId,
		)

		res.status(200).json({
			success: true,
			message: 'Notifications marked as read successfully',
		})
	},
)

export const markAllNotificationsAsRead = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.id

		await notificationService.markAllNotificationsAsRead(userId)

		res.status(200).json({
			success: true,
			message: 'All notifications marked as read successfully',
		})
	},
)

export const updateNotification = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.id
		const notificationId = req.params.id
		const updateData: INotificationUpdateRequest = req.body

		const notification = await notificationService.updateNotification(
			notificationId,
			userId,
			updateData,
		)

		res.status(200).json({
			success: true,
			message: 'Notification updated successfully',
			data: notification,
		})
	},
)

export const deleteNotification = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user.id
		const notificationId = req.params.id

		await notificationService.deleteNotification(notificationId, userId)

		res.status(200).json({
			success: true,
			message: 'Notification deleted successfully',
		})
	},
)

export const createNotification = CatchAsyncErrors(
	async (req: Request, res: Response, next: NextFunction) => {
		const notificationData: INotificationCreateRequest = req.body

		const notification =
			await notificationService.createNotification(notificationData)

		res.status(201).json({
			success: true,
			message: 'Notification created successfully',
			data: notification,
		})
	},
)
