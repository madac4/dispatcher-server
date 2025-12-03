"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const notification_dto_1 = require("../dto/notification.dto");
const notification_model_1 = __importDefault(require("../models/notification.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const auth_types_1 = require("../types/auth.types");
const notification_types_1 = require("../types/notification.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
const email_service_1 = require("./email.service");
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
            if (!adminsAndModerators.length) {
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
            const emailData = {
                orderNumber,
                actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${orderNumber}`,
                actionText: 'View Order',
                title: `New Order Created - #${orderNumber}`,
            };
            if (!process.env.ADMIN_EMAIL) {
                throw new ErrorHandler_1.ErrorHandler('Admin email not found', 500);
            }
            await email_service_1.EmailService.sendEmail('newOrderEmail', emailData, process.env.ADMIN_EMAIL, emailData.title);
        }
        catch (error) {
            console.error('Failed to send order creation notification:', error);
        }
    }
    async notifyOrderModerated(orderId, moderatorId) {
        try {
            const order = await order_model_1.default.findById(orderId).populate('userId', 'email');
            const moderator = await user_model_1.default.findById(moderatorId);
            if (!order) {
                throw new ErrorHandler_1.ErrorHandler('Order not found', 404);
            }
            const orderUser = order.userId;
            const notificationData = {
                recipientId: orderUser._id,
                senderId: moderatorId,
                type: notification_types_1.NotificationType.ORDER_UPDATED,
                title: `Order #${order.orderNumber} is now moderated`,
                message: `Your order is now moderated by ${moderator?.email}.`,
                metadata: {
                    orderId,
                    moderatorId,
                },
                actionUrl: `/dashboard/orders/${order.orderNumber}`,
                actionText: 'View Order',
            };
            await this.createNotification(notificationData);
            const emailData = {
                orderNumber: order.orderNumber,
                moderatorEmail: moderator?.email,
                actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${order.orderNumber}`,
                actionText: 'View Order',
                title: `New Order Moderator - #${order.orderNumber}`,
            };
            if (!process.env.ADMIN_EMAIL) {
                throw new ErrorHandler_1.ErrorHandler('Admin email not found', 500);
            }
            await email_service_1.EmailService.sendEmail('newModeratorEmail', emailData, orderUser.email, emailData.title);
        }
        catch (error) {
            console.error('Failed to send order creation notification:', error);
        }
    }
    async notifyOrderFileUploaded(orderId, uploadedBy, uploadedByEmail, filename) {
        try {
            const order = await order_model_1.default.findById(orderId)
                .populate('userId', 'email')
                .populate('moderatorId', 'email');
            if (!order) {
                throw new ErrorHandler_1.ErrorHandler('Order not found', 404);
            }
            const orderUser = order.userId;
            const recipientId = orderUser._id.toString() === uploadedBy
                ? order.moderatorId._id
                : orderUser._id;
            const recipientEmail = orderUser._id.toString() === uploadedBy
                ? order.moderatorId.email
                : orderUser.email;
            const notificationData = {
                recipientId,
                senderId: uploadedBy,
                type: notification_types_1.NotificationType.ORDER_UPDATED,
                title: `New file uploaded to order #${order.orderNumber}`,
                message: `A new file has been uploaded to your order #${order.orderNumber}.`,
                metadata: {
                    orderId,
                },
                actionUrl: `/dashboard/orders/${order.orderNumber}`,
                actionText: 'View File',
            };
            await this.createNotification(notificationData);
            const emailData = {
                orderNumber: order.orderNumber,
                fileName: filename,
                uploadedBy: uploadedByEmail,
                actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${order.orderNumber}`,
                actionText: 'View File',
                title: `New File Uploaded to Order #${order.orderNumber}`,
            };
            if (!process.env.ADMIN_EMAIL) {
                throw new ErrorHandler_1.ErrorHandler('Admin email not found', 500);
            }
            await email_service_1.EmailService.sendEmail('newFileUploadEmail', emailData, recipientEmail, emailData.title);
        }
        catch (error) {
            console.error('Failed to send order creation notification:', error);
        }
    }
    async notifyOrderMessage(orderId, senderId, senderEmail, message) {
        try {
            const order = await order_model_1.default.findById(orderId)
                .populate('userId', 'email')
                .populate('moderatorId', 'email');
            if (!order) {
                throw new ErrorHandler_1.ErrorHandler('Order not found', 404);
            }
            const orderUser = order.userId;
            const recipientId = orderUser._id.toString() === senderId
                ? order.moderatorId._id
                : orderUser._id;
            const recipientEmail = orderUser._id.toString() === senderId
                ? order.moderatorId.email
                : orderUser.email;
            const notificationData = {
                recipientId,
                senderId,
                type: notification_types_1.NotificationType.ORDER_UPDATED,
                title: `New message from ${senderEmail}`,
                message,
                metadata: {
                    orderId,
                },
                actionUrl: `/dashboard/orders/${order.orderNumber}`,
                actionText: 'View Message',
            };
            await this.createNotification(notificationData);
            const emailData = {
                orderNumber: order.orderNumber,
                senderEmail: senderEmail,
                actionUrl: `${process.env.FRONTEND_ORIGIN}/dashboard/orders/${order.orderNumber}`,
                actionText: 'View Message',
                title: `New Message from ${senderEmail}`,
                message: message,
            };
            if (!process.env.ADMIN_EMAIL)
                throw new ErrorHandler_1.ErrorHandler('Admin email not found', 500);
            await email_service_1.EmailService.sendEmail('newMessageEmail', emailData, recipientEmail, emailData.title);
        }
        catch (error) {
            console.error('Failed to send order creation notification:', error);
        }
    }
    async getUserNotifications(userId, query) {
        try {
            const { unreadOnly, page, limit, status, type, startDate, endDate } = query;
            const filter = { recipientId: userId };
            if (unreadOnly) {
                filter.status = notification_types_1.NotificationStatus.UNREAD;
            }
            else if (status) {
                filter.status = status;
            }
            if (type) {
                filter.type = type;
            }
            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) {
                    filter.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    // Set end date to end of day
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    filter.createdAt.$lte = end;
                }
            }
            const skip = (page - 1) * limit;
            const notifications = await notification_model_1.default.find(filter)
                .populate('senderId', 'email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
            const total = await notification_model_1.default.countDocuments(filter);
            const meta = (0, response_types_1.CreatePaginationMeta)(total, page, limit);
            const notificationsDTO = notifications.map(notification => new notification_dto_1.NotificationDTO(notification));
            return (0, response_types_1.PaginatedResponse)(notificationsDTO, meta);
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
     * Notify user when invoice is created
     */
    async notifyInvoiceCreated(invoiceId, invoiceNumber, userId, adminId) {
        try {
            const notificationData = {
                recipientId: userId,
                senderId: adminId,
                type: notification_types_1.NotificationType.INVOICE_CREATED,
                title: 'New Invoice Received',
                message: `You have received a new invoice #${invoiceNumber}.`,
                metadata: {
                    invoiceId,
                    invoiceNumber,
                },
                actionUrl: `/dashboard/invoices/${invoiceId}`,
                actionText: 'View Invoice',
            };
            await this.createNotification(notificationData);
            console.log(`Invoice creation notification sent to user ${userId}`);
        }
        catch (error) {
            console.error('Failed to send invoice creation notification:', error);
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
