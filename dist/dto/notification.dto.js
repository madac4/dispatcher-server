"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDTO = void 0;
const notification_types_1 = require("../types/notification.types");
class NotificationDTO {
    constructor(notification) {
        this.id = notification._id || '';
        this.recipientId = notification.recipientId || '';
        this.senderId = notification.senderId?._id || '';
        this.type = notification.type || '';
        this.status = notification.status || '';
        this.title = notification.title || '';
        this.message = notification.message || '';
        this.metadata = notification.metadata || {};
        this.actionUrl = notification.actionUrl || '';
        this.actionText = notification.actionText || '';
        this.expiresAt = notification.expiresAt?.toISOString() || '';
        this.readAt = notification.readAt?.toISOString() || '';
        this.createdAt = notification.createdAt?.toISOString() || '';
        this.updatedAt = notification.updatedAt?.toISOString() || '';
        this.unread = notification.status === notification_types_1.NotificationStatus.UNREAD;
    }
}
exports.NotificationDTO = NotificationDTO;
