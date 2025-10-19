"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationStatus = exports.NotificationType = void 0;
var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER_CREATED"] = "order_created";
    NotificationType["ORDER_UPDATED"] = "order_updated";
    NotificationType["ORDER_DELETED"] = "order_deleted";
    NotificationType["NEW_MESSAGE"] = "new_message";
    NotificationType["USER_JOINED"] = "user_joined";
    NotificationType["FILE_UPLOADED"] = "file_uploaded";
    NotificationType["FILE_DELETED"] = "file_deleted";
    NotificationType["SYSTEM_ANNOUNCEMENT"] = "system_announcement";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["UNREAD"] = "unread";
    NotificationStatus["READ"] = "read";
    NotificationStatus["ARCHIVED"] = "archived";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
