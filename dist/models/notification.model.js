"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const notification_types_1 = require("../types/notification.types");
const notificationSchema = new mongoose_1.Schema({
    recipientId: {
        type: [String],
        required: true,
        ref: 'User',
        index: true,
    },
    senderId: {
        type: String,
        ref: 'User',
        index: true,
    },
    type: {
        type: String,
        enum: Object.values(notification_types_1.NotificationType),
        required: true,
        index: true,
    },
    priority: {
        type: String,
        enum: Object.values(notification_types_1.NotificationPriority),
        default: notification_types_1.NotificationPriority.MEDIUM,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(notification_types_1.NotificationStatus),
        default: notification_types_1.NotificationStatus.UNREAD,
        index: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 200,
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    actionUrl: {
        type: String,
        maxlength: 500,
    },
    actionText: {
        type: String,
        maxlength: 50,
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 },
    },
    readAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Compound indexes for efficient querying
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, unread: 1, createdAt: -1 });
// Index for metadata queries
notificationSchema.index({ 'metadata.orderId': 1 });
notificationSchema.index({ 'metadata.orderNumber': 1 });
// Text index for search functionality
notificationSchema.index({
    title: 'text',
    message: 'text',
});
// Virtual for unread status (for backward compatibility)
notificationSchema.virtual('unread').get(function () {
    return this.status === notification_types_1.NotificationStatus.UNREAD;
});
// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });
// Pre-save middleware to set readAt when status changes to READ
notificationSchema.pre('save', function (next) {
    if (this.isModified('status') &&
        this.status === notification_types_1.NotificationStatus.READ &&
        !this.readAt) {
        this.readAt = new Date();
    }
    next();
});
// Static method to get notification stats for a user
notificationSchema.statics.getUserStats = async function (recipientId) {
    const stats = await this.aggregate([
        { $match: { recipientId } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                unread: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', notification_types_1.NotificationStatus.UNREAD] },
                            1,
                            0,
                        ],
                    },
                },
                byType: {
                    $push: {
                        type: '$type',
                        count: 1,
                    },
                },
                byPriority: {
                    $push: {
                        priority: '$priority',
                        count: 1,
                    },
                },
            },
        },
        {
            $project: {
                total: 1,
                unread: 1,
                byType: {
                    $arrayToObject: {
                        $map: {
                            input: '$byType',
                            as: 'item',
                            in: {
                                k: '$$item.type',
                                v: { $sum: '$$item.count' },
                            },
                        },
                    },
                },
                byPriority: {
                    $arrayToObject: {
                        $map: {
                            input: '$byPriority',
                            as: 'item',
                            in: {
                                k: '$$item.priority',
                                v: { $sum: '$$item.count' },
                            },
                        },
                    },
                },
            },
        },
    ]);
    return (stats[0] || {
        total: 0,
        unread: 0,
        byType: {},
        byPriority: {},
    });
};
// Static method to mark multiple notifications as read
notificationSchema.statics.markAsRead = async function (notificationIds, recipientId) {
    return this.updateMany({
        _id: { $in: notificationIds },
        recipientId,
        status: notification_types_1.NotificationStatus.UNREAD,
    }, {
        status: notification_types_1.NotificationStatus.READ,
        readAt: new Date(),
    });
};
// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function (recipientId) {
    return this.updateMany({
        recipientId,
        status: notification_types_1.NotificationStatus.UNREAD,
    }, {
        status: notification_types_1.NotificationStatus.READ,
        readAt: new Date(),
    });
};
// Static method to clean up expired notifications
notificationSchema.statics.cleanupExpired = async function () {
    return await this.deleteMany({
        expiresAt: { $lt: new Date() },
    });
};
const Notification = (0, mongoose_1.model)('Notification', notificationSchema);
exports.default = Notification;
