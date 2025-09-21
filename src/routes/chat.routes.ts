import { Router } from 'express'
import {
	deleteMessage,
	getOrderMessages,
	sendMessage,
} from '../controllers/chatController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

router.post('/messages', authMiddleware, sendMessage)
router.get('/orders/:orderId/messages', authMiddleware, getOrderMessages)
router.delete('/messages/:messageId', authMiddleware, deleteMessage)

export default router
