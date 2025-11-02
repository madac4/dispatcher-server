"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.getOrderMessages = exports.sendMessage = void 0;
const message_dto_1 = require("../dto/message.dto");
const chatMessage_model_1 = __importDefault(require("../models/chatMessage.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const orderChat_model_1 = __importDefault(require("../models/orderChat.model"));
const notification_service_1 = require("../services/notification.service");
const socket_service_1 = require("../services/socket.service");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.sendMessage = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { id: userId, email: userEmail } = req.user;
    const { orderId, message } = req.body;
    if (!orderId || !message) {
        return next(new ErrorHandler_1.ErrorHandler('Order ID and message are required', 400));
    }
    const order = await order_model_1.default.findOne({ _id: orderId });
    if (!order) {
        return next(new ErrorHandler_1.ErrorHandler('Order not found or access denied', 404));
    }
    const newMessage = new chatMessage_model_1.default({
        orderId,
        userId,
        message,
    });
    const savedMessage = await newMessage.save();
    let orderChat = await orderChat_model_1.default.findOne({ orderId });
    if (!orderChat) {
        orderChat = new orderChat_model_1.default({
            orderId,
            messages: [savedMessage._id],
            lastMessage: savedMessage._id,
        });
    }
    else {
        orderChat.messages.push(savedMessage._id);
        orderChat.lastMessage = savedMessage._id;
    }
    await orderChat.save();
    const populatedMessage = (await chatMessage_model_1.default.findById(savedMessage._id).populate('userId', 'email'));
    const messageDTO = new message_dto_1.MessageDTO(populatedMessage);
    socket_service_1.socketService.broadcastMessage(orderId, messageDTO);
    notification_service_1.notificationService.notifyOrderMessage(orderId, userId, userEmail, message);
    res.status(201).json((0, response_types_1.SuccessResponse)(messageDTO, 'Message sent successfully'));
});
exports.getOrderMessages = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const { orderId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const order = await order_model_1.default.findOne({ _id: orderId });
    if (!order) {
        return next(new ErrorHandler_1.ErrorHandler('Order not found or access denied', 404));
    }
    const messages = await chatMessage_model_1.default.find({ orderId })
        .populate('userId', 'email')
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await chatMessage_model_1.default.countDocuments({ orderId });
    await orderChat_model_1.default.findOneAndUpdate({ orderId }, { unreadCount: 0 }, { upsert: true });
    const messagesDTO = messages.map(message => new message_dto_1.MessageDTO(message));
    const meta = (0, response_types_1.CreatePaginationMeta)(total, page, limit);
    res.status(200).json((0, response_types_1.PaginatedResponse)(messagesDTO, meta));
});
const deleteMessage = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const { messageId } = req.params;
        const message = await chatMessage_model_1.default.findById(messageId);
        if (!message) {
            return next(new ErrorHandler_1.ErrorHandler('Message not found', 404));
        }
        if (message.userId !== userId) {
            return next(new ErrorHandler_1.ErrorHandler('Access denied', 403));
        }
        await chatMessage_model_1.default.findByIdAndDelete(messageId);
        const orderChat = await orderChat_model_1.default.findOne({ orderId: message.orderId });
        if (orderChat) {
            orderChat.messages = orderChat.messages.filter(msgId => msgId.toString() !== messageId);
            if (orderChat.lastMessage?.toString() === messageId) {
                const lastMessage = await chatMessage_model_1.default.findOne({
                    orderId: message.orderId,
                }).sort({ createdAt: -1 });
                orderChat.lastMessage = lastMessage?._id || null;
            }
            await orderChat.save();
        }
        res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Message deleted successfully'));
    }
    catch (error) {
        console.error('Error deleting message:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while deleting message', 500));
    }
};
exports.deleteMessage = deleteMessage;
