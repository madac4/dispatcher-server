import { Router } from 'express';
import upload from '../config/multer';
import {
  createOrder,
  deleteOrderFile,
  downloadOrderFile,
  duplicateOrder,
  getOrderByNumber,
  getOrderFiles,
  getOrders,
  getStatuses,
  updateOrderStatus,
  uploadOrderFile,
} from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rolesMiddleware } from '../middleware/rolesMiddleware';
import { UserRole } from '../types/auth.types';

const router = Router();

router.get('/paginated', authMiddleware, getOrders);
router.get('/statuses/:type', authMiddleware, getStatuses);
router.post(
  '/create',
  authMiddleware,
  rolesMiddleware([UserRole.USER]),
  upload.array('files'),
  createOrder
);
router.post('/duplicate/:orderId', authMiddleware, duplicateOrder);
router.get('/:orderNumber', authMiddleware, getOrderByNumber);
router.get('/:orderId/files/:filename', authMiddleware, downloadOrderFile);

router.put(
  '/:orderId/status',
  authMiddleware,
  rolesMiddleware([UserRole.ADMIN]),
  updateOrderStatus
);

// File management routes
router.post('/:orderId/files', authMiddleware, upload.single('file'), uploadOrderFile);
router.get('/:orderId/files', authMiddleware, getOrderFiles);
router.get('/:orderId/files/:filename', authMiddleware, downloadOrderFile);
router.delete('/:orderId/files/:filename', authMiddleware, deleteOrderFile);

export default router;
