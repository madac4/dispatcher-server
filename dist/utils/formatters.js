"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatStatus = void 0;
const order_types_1 = require("../types/order.types");
const formatStatus = (status) => {
    switch (status) {
        case order_types_1.OrderStatus.PENDING:
            return 'Pending';
        case order_types_1.OrderStatus.PROCESSING:
            return 'Processing';
        case order_types_1.OrderStatus.REQUIRES_INVOICE:
            return 'Requires Invoice';
        case order_types_1.OrderStatus.REQUIRES_CHARGE:
            return 'Requires Charge';
        case order_types_1.OrderStatus.CHARGED:
            return 'Charged';
        case order_types_1.OrderStatus.CANCELLED:
            return 'Cancelled';
        case order_types_1.OrderStatus.FINISHED:
            return 'Active';
    }
};
exports.formatStatus = formatStatus;
