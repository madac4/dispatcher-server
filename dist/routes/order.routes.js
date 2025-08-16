"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// router.get('/', getOrders)
router.post('/', orderController_1.createOrder);
// router.put('/:id', updateOrder)
router.get('/:id', orderController_1.getOrderById);
// router.delete('/:id', deleteOrder)
// router.patch('/:id/status', updateOrderStatus)
// router.post('/calculate-costs', calculateOrderCosts)
exports.default = router;
