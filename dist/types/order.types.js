"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatStatus = exports.OrderStatusType = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["ALL"] = "all";
    OrderStatus["PENDING"] = "pending";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["REQUIRES_INVOICE"] = "requires_invoice";
    OrderStatus["REQUIRES_CHARGE"] = "requires_charge";
    OrderStatus["CHARGED"] = "charged";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["FINISHED"] = "finished";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OrderStatusType;
(function (OrderStatusType) {
    OrderStatusType["ALL"] = "all";
    OrderStatusType["ACTIVE"] = "active";
    OrderStatusType["COMPLETED"] = "completed";
    OrderStatusType["PAID"] = "paid";
    OrderStatusType["ARCHIVED"] = "archived";
})(OrderStatusType || (exports.OrderStatusType = OrderStatusType = {}));
const formatStatus = (status) => {
    return status
        .replace('_', ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
exports.formatStatus = formatStatus;
