"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.deleteNotification = exports.updateNotification = exports.markAllNotificationsAsRead = exports.markNotificationsAsRead = exports.getNotificationStats = exports.getNotifications = void 0;
const notification_service_1 = require("../services/notification.service");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.getNotifications = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res) => {
    const userId = req.user.id;
    const payload = req.query;
    const query = {
        page: payload.page || 1,
        limit: payload.limit || 20,
        unreadOnly: payload.unreadOnly || false,
        search: payload.search || '',
        status: payload.status,
        type: payload.type,
        startDate: payload.startDate,
        endDate: payload.endDate,
    };
    const result = await notification_service_1.notificationService.getUserNotifications(userId, query);
    res.status(200).json(result);
});
exports.getNotificationStats = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const stats = await notification_service_1.notificationService.getUserNotificationStats(userId);
    res.status(200).json({
        success: true,
        message: 'Notification stats retrieved successfully',
        data: stats,
    });
});
exports.markNotificationsAsRead = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds)) {
        return next(new ErrorHandler_1.ErrorHandler('Notification IDs array is required', 400));
    }
    await notification_service_1.notificationService.markNotificationsAsRead(notificationIds, userId);
    res.status(200).json({
        success: true,
        message: 'Notifications marked as read successfully',
    });
});
exports.markAllNotificationsAsRead = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    await notification_service_1.notificationService.markAllNotificationsAsRead(userId);
    res.status(200).json({
        success: true,
        message: 'All notifications marked as read successfully',
    });
});
exports.updateNotification = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const updateData = req.body;
    const notification = await notification_service_1.notificationService.updateNotification(notificationId, userId, updateData);
    res.status(200).json({
        success: true,
        message: 'Notification updated successfully',
        data: notification,
    });
});
exports.deleteNotification = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const notificationId = req.params.id;
    await notification_service_1.notificationService.deleteNotification(notificationId, userId);
    res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
    });
});
exports.createNotification = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const notificationData = req.body;
    const notification = await notification_service_1.notificationService.createNotification(notificationData);
    res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification,
    });
});
