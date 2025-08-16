"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Apply authentication middleware to all chat routes
router.use(authMiddleware_1.authMiddleware);
// Send a message to an order chat
router.post('/messages', chatController_1.sendMessage);
// Get messages for a specific order
router.get('/orders/:orderId/messages', chatController_1.getOrderMessages);
// Get all order chats for the authenticated user
router.get('/orders', chatController_1.getUserOrderChats);
// Mark messages as read for an order
router.patch('/orders/:orderId/read', chatController_1.markMessagesAsRead);
// Get unread message count for an order
router.get('/orders/:orderId/unread-count', chatController_1.getUnreadCount);
// Delete a specific message
router.delete('/messages/:messageId', chatController_1.deleteMessage);
exports.default = router;
