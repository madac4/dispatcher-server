"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const notification_model_1 = __importDefault(require("../models/notification.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const notification_types_1 = require("../types/notification.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const socket_service_1 = require("./socket.service");
class NotificationService {
    async createNotification(notificationData) {
        try {
            const notification = new notification_model_1.default({
                ...notificationData,
                status: notification_types_1.NotificationStatus.UNREAD,
            });
            const savedNotification = await notification.save();
            await this.sendRealtimeNotification(savedNotification);
            return savedNotification;
        }
        catch (error) {
            throw new ErrorHandler_1.ErrorHandler(`Failed to create notification: ${error.message}`, 500);
        }
    }
    async notifyOrderCreated(orderId, orderNumber, senderId) {
        try {
            const adminsAndModerators = await user_model_1.default.find({
                role: { $in: [auth_types_1.UserRole.ADMIN, auth_types_1.UserRole.MODERATOR] },
            }).select('_id email');
            if (adminsAndModerators.length === 0) {
                console.log('No admins or moderators found to notify');
                return;
            }
            const recipientIds = adminsAndModerators.map(user => user._id.toString());
            recipientIds.map(async (id) => {
                const notificationData = {
                    recipientId: id,
                    senderId,
                    type: notification_types_1.NotificationType.ORDER_CREATED,
                    title: 'New Order Created',
                    message: `A new order #${orderNumber} has been created.`,
                    metadata: {
                        orderId,
                        orderNumber,
                    },
                    actionUrl: `/dashboard/orders/${orderNumber}`,
                    actionText: 'View Order',
                };
                await this.createNotification(notificationData);
                console.log(`Order creation notification sent to admin/moderator ${id}`);
            });
        }
        catch (error) {
            console.error('Failed to send order creation notification:', error);
        }
    }
    async getUserNotifications(userId, query) {
        try {
            const { unreadOnly, page, limit } = query;
            const filter = { recipientId: userId };
            if (unreadOnly)
                filter.status = notification_types_1.NotificationStatus.UNREAD;
            const skip = (page - 1) * limit;
            const notifications = await notification_model_1.default.find(filter)
                .populate('senderId', 'email')
                .skip(skip)
                .limit(limit)
                .lean();
            const total = await notification_model_1.default.countDocuments(filter);
            const meta = (0, response_types_1.CreatePaginationMeta)(total, page, limit);
            return (0, response_types_1.PaginatedResponse)(notifications, meta);
        }
        catch (error) {
            throw new ErrorHandler_1.ErrorHandler(`Failed to get notifications: ${error.message}`, 500);
        }
    }
    /**
     * Get notification statistics for a user
     */
    async getUserNotificationStats(userId) {
        try {
            const stats = await notification_model_1.default.getUserStats(userId);
            return stats;
        }
        catch (error) {
            throw new ErrorHandler_1.ErrorHandler(`Failed to get notification stats: ${error.message}`, 500);
        }
    }
    async markNotificationsAsRead(notificationIds, userId) {
        await notification_model_1.default.markAsRead(notificationIds, userId);
    }
    async markAllNotificationsAsRead(userId) {
        try {
            await notification_model_1.default.markAllAsRead(userId);
        }
        catch (error) {
            throw new ErrorHandler_1.ErrorHandler(`Failed to mark all notifications as read: ${error.message}`, 500);
        }
    }
    /**
     * Update notification
     */
    async updateNotification(notificationId, userId, updateData) {
        try {
            const notification = await notification_model_1.default.findOneAndUpdate({ _id: notificationId, recipientId: userId }, updateData, { new: true });
            if (!notification) {
                throw new ErrorHandler_1.ErrorHandler('Notification not found', 404);
            }
            return notification;
        }
        catch (error) {
            if (error instanceof ErrorHandler_1.ErrorHandler)
                throw error;
            throw new ErrorHandler_1.ErrorHandler(`Failed to update notification: ${error.message}`, 500);
        }
    }
    /**
     * Delete notification
     */
    async deleteNotification(notificationId, userId) {
        try {
            const result = await notification_model_1.default.deleteOne({
                _id: notificationId,
                recipientId: userId,
            });
            if (result.deletedCount === 0) {
                throw new ErrorHandler_1.ErrorHandler('Notification not found', 404);
            }
        }
        catch (error) {
            if (error instanceof ErrorHandler_1.ErrorHandler)
                throw error;
            throw new ErrorHandler_1.ErrorHandler(`Failed to delete notification: ${error.message}`, 500);
        }
    }
    async sendRealtimeNotification(notification) {
        try {
            const userId = typeof notification.recipientId === 'string'
                ? notification.recipientId
                : notification.recipientId._id;
            socket_service_1.socketService.sendNotification(userId, {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                metadata: notification.metadata,
                actionUrl: notification.actionUrl,
                actionText: notification.actionText,
                createdAt: notification.createdAt,
            });
        }
        catch (error) {
            console.error('Failed to send real-time notification:', error);
        }
    }
    /**
     * Clean up expired notifications
     */
    async cleanupExpiredNotifications() {
        try {
            return await notification_model_1.default.cleanupExpired();
        }
        catch (error) {
            throw new ErrorHandler_1.ErrorHandler(`Failed to cleanup expired notifications: ${error.message}`, 500);
        }
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
