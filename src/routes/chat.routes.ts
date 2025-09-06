import { Router } from 'express'
import {
	deleteMessage,
	getOrderMessages,
	getUnreadCount,
	getUserOrderChats,
	markMessagesAsRead,
	sendMessage,
} from '../controllers/chatController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

// Send a message to an order chat
router.post('/messages', authMiddleware, sendMessage)

// Get messages for a specific order
router.get('/orders/:orderId/messages', authMiddleware, getOrderMessages)

// Get all order chats for the authenticated user
router.get('/orders', authMiddleware, getUserOrderChats)

// Mark messages as read for an order
router.patch('/orders/:orderId/read', authMiddleware, markMessagesAsRead)

// Get unread message count for an order
router.get('/orders/:orderId/unread-count', authMiddleware, getUnreadCount)

// Delete a specific message
router.delete('/messages/:messageId', authMiddleware, deleteMessage)

export default router
