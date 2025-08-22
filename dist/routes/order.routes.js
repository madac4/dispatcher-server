"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("../config/multer"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/paginated', authMiddleware_1.authMiddleware, orderController_1.getOrders);
router.get('/statuses/:type', authMiddleware_1.authMiddleware, orderController_1.getStatuses);
router.post('/create', authMiddleware_1.authMiddleware, multer_1.default.array('files'), orderController_1.createOrder);
router.post('/duplicate/:orderId', authMiddleware_1.authMiddleware, orderController_1.duplicateOrder);
// router.put('/:id', updateOrder)
router.get('/:orderNumber', authMiddleware_1.authMiddleware, orderController_1.getOrderByNumber);
// router.delete('/:id', deleteOrder)
// router.patch('/:id/status', updateOrderStatus)
// router.post('/calculate-costs', calculateOrderCosts)
// File management routes
router.post('/:orderId/files', authMiddleware_1.authMiddleware, multer_1.default.single('file'), orderController_1.uploadOrderFile);
router.get('/:orderId/files', authMiddleware_1.authMiddleware, orderController_1.getOrderFiles);
router.get('/:orderId/files/:filename', authMiddleware_1.authMiddleware, orderController_1.downloadOrderFile);
router.delete('/:orderId/files/:filename', authMiddleware_1.authMiddleware, orderController_1.deleteOrderFile);
exports.default = router;
