"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("../controllers/notifications.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rolesMiddleware_1 = require("../middleware/rolesMiddleware");
const auth_types_1 = require("../types/auth.types");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.get('/', notifications_controller_1.getNotifications);
router.get('/stats', notifications_controller_1.getNotificationStats);
// Mark specific notifications as read
router.patch('/mark-read', notifications_controller_1.markNotificationsAsRead);
// Mark all notifications as read
router.patch('/mark-all-read', notifications_controller_1.markAllNotificationsAsRead);
// Update notification
router.patch('/:id', notifications_controller_1.updateNotification);
// Delete notification
router.delete('/:id', notifications_controller_1.deleteNotification);
// Create notification (admin/moderator only)
router.post('/', (0, rolesMiddleware_1.rolesMiddleware)([auth_types_1.UserRole.ADMIN, auth_types_1.UserRole.MODERATOR]), notifications_controller_1.createNotification);
exports.default = router;
