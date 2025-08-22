"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatStatus = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["ALL"] = "all";
    OrderStatus["PENDING"] = "pending";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["REQUIRES_INVOICE"] = "requires_invoice";
    OrderStatus["REQUIRES_CHARGE"] = "requires_charge";
    OrderStatus["CHARGED"] = "charged";
    OrderStatus["ACTIVE"] = "active";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
const formatStatus = (status) => {
    return status
        .replace('_', ' ')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
exports.formatStatus = formatStatus;
