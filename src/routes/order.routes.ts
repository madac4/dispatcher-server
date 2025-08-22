import { Router } from 'express'
import upload from '../config/multer'
import {
	createOrder,
	deleteOrderFile,
	downloadOrderFile,
	duplicateOrder,
	getOrderByNumber,
	getOrderFiles,
	getOrders,
	getStatuses,
	uploadOrderFile,
} from '../controllers/orderController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

router.get('/paginated', authMiddleware, getOrders)
router.get('/statuses/:type', authMiddleware, getStatuses)
router.post('/create', authMiddleware, upload.array('files'), createOrder)
router.post('/duplicate/:orderId', authMiddleware, duplicateOrder)
// router.put('/:id', updateOrder)
router.get('/:orderNumber', authMiddleware, getOrderByNumber)
// router.delete('/:id', deleteOrder)
// router.patch('/:id/status', updateOrderStatus)
// router.post('/calculate-costs', calculateOrderCosts)

// File management routes
router.post(
	'/:orderId/files',
	authMiddleware,
	upload.single('file'),
	uploadOrderFile,
)
router.get('/:orderId/files', authMiddleware, getOrderFiles)
router.get('/:orderId/files/:filename', authMiddleware, downloadOrderFile)
router.delete('/:orderId/files/:filename', authMiddleware, deleteOrderFile)

export default router
