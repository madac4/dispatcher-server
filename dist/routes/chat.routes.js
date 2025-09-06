"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Send a message to an order chat
router.post('/messages', authMiddleware_1.authMiddleware, chatController_1.sendMessage);
// Get messages for a specific order
router.get('/orders/:orderId/messages', authMiddleware_1.authMiddleware, chatController_1.getOrderMessages);
// Get all order chats for the authenticated user
router.get('/orders', authMiddleware_1.authMiddleware, chatController_1.getUserOrderChats);
// Mark messages as read for an order
router.patch('/orders/:orderId/read', authMiddleware_1.authMiddleware, chatController_1.markMessagesAsRead);
// Get unread message count for an order
router.get('/orders/:orderId/unread-count', authMiddleware_1.authMiddleware, chatController_1.getUnreadCount);
// Delete a specific message
router.delete('/messages/:messageId', authMiddleware_1.authMiddleware, chatController_1.deleteMessage);
exports.default = router;
