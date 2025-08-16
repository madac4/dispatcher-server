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

// Apply authentication middleware to all chat routes
router.use(authMiddleware)

// Send a message to an order chat
router.post('/messages', sendMessage)

// Get messages for a specific order
router.get('/orders/:orderId/messages', getOrderMessages)

// Get all order chats for the authenticated user
router.get('/orders', getUserOrderChats)

// Mark messages as read for an order
router.patch('/orders/:orderId/read', markMessagesAsRead)

// Get unread message count for an order
router.get('/orders/:orderId/unread-count', getUnreadCount)

// Delete a specific message
router.delete('/messages/:messageId', deleteMessage)

export default router
