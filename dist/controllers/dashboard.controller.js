"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboardCards = void 0;
const order_model_1 = __importDefault(require("../models/order.model"));
const order_types_1 = require("../types/order.types");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.getAdminDashboardCards = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const activeStatuses = [order_types_1.OrderStatus.PENDING, order_types_1.OrderStatus.PROCESSING];
    const completedStatuses = [
        order_types_1.OrderStatus.REQUIRES_INVOICE,
        order_types_1.OrderStatus.REQUIRES_CHARGE,
    ];
    const paidStatuses = [order_types_1.OrderStatus.CHARGED];
    const archivedStatuses = [order_types_1.OrderStatus.FINISHED, order_types_1.OrderStatus.CANCELLED];
    const activeOrders = await order_model_1.default.find({
        status: { $in: activeStatuses },
    }).countDocuments();
    const ordersThatRequireInvoiceOrCharge = await order_model_1.default.find({
        status: { $in: completedStatuses },
    }).countDocuments();
    const ordersThatArePaid = await order_model_1.default.find({
        status: { $in: paidStatuses },
    }).countDocuments();
    const ordersThatAreArchived = await order_model_1.default.find({
        status: { $in: archivedStatuses },
    }).countDocuments();
    const response = [
        {
            title: 'Active Orders',
            value: activeOrders,
            description: 'Total active orders created',
        },
        {
            title: 'Orders to Charge',
            value: ordersThatRequireInvoiceOrCharge,
            description: 'Total orders that require a charge',
        },
        {
            title: 'Paid Orders',
            value: ordersThatArePaid,
            description: 'Total paid accounts',
        },
        {
            title: 'Finished Orders',
            value: ordersThatAreArchived,
            description: 'Total finished orders',
        },
    ];
    res.status(200).json((0, response_types_1.SuccessResponse)(response, 'Dashboard cards retrieved successfully'));
});
