import { Router } from 'express'
import {
	createNotification,
	deleteNotification,
	getNotificationStats,
	getNotifications,
	markAllNotificationsAsRead,
	markNotificationsAsRead,
	updateNotification,
} from '../controllers/notifications.controller'
import { authMiddleware } from '../middleware/authMiddleware'
import { rolesMiddleware } from '../middleware/rolesMiddleware'
import { UserRole } from '../types/auth.types'

const router = Router()

router.use(authMiddleware)

router.get('/', getNotifications)
router.get('/stats', getNotificationStats)

// Mark specific notifications as read
router.patch('/mark-read', markNotificationsAsRead)

// Mark all notifications as read
router.patch('/mark-all-read', markAllNotificationsAsRead)

// Update notification
router.patch('/:id', updateNotification)

// Delete notification
router.delete('/:id', deleteNotification)

// Create notification (admin/moderator only)
router.post(
	'/',
	rolesMiddleware([UserRole.ADMIN, UserRole.MODERATOR]),
	createNotification,
)

export default router
