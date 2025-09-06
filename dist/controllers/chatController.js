"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.deleteMessage = exports.markMessagesAsRead = exports.getUserOrderChats = exports.getOrderMessages = exports.sendMessage = void 0;
const message_dto_1 = require("../dto/message.dto");
const chatMessage_model_1 = __importDefault(require("../models/chatMessage.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const orderChat_model_1 = __importDefault(require("../models/orderChat.model"));
const socket_service_1 = require("../services/socket.service");
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
exports.sendMessage = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const { orderId, message } = req.body;
    if (!orderId || !message) {
        return next(new ErrorHandler_1.ErrorHandler('Order ID and message are required', 400));
    }
    // add userId
    const order = await order_model_1.default.findOne({ _id: orderId });
    if (!order) {
        return next(new ErrorHandler_1.ErrorHandler('Order not found or access denied', 404));
    }
    const newMessage = new chatMessage_model_1.default({
        orderId,
        userId,
        message,
        isRead: false,
    });
    const savedMessage = await newMessage.save();
    let orderChat = await orderChat_model_1.default.findOne({ orderId });
    if (!orderChat) {
        orderChat = new orderChat_model_1.default({
            orderId,
            messages: [savedMessage._id],
            lastMessage: savedMessage._id,
            unreadCount: 1,
        });
    }
    else {
        orderChat.messages.push(savedMessage._id);
        orderChat.lastMessage = savedMessage._id;
        orderChat.unreadCount += 1;
    }
    await orderChat.save();
    const populatedMessage = (await chatMessage_model_1.default.findById(savedMessage._id).populate('userId', 'email'));
    const messageDTO = new message_dto_1.MessageDTO(populatedMessage);
    socket_service_1.socketService.broadcastMessage(orderId, messageDTO);
    res.status(201).json((0, response_types_1.SuccessResponse)(messageDTO, 'Message sent successfully'));
});
exports.getOrderMessages = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const { orderId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    // add userId
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
// Get all order chats for a user
const getUserOrderChats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Get user's orders with chat information
        const orders = await order_model_1.default.find({ userId })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const orderIds = orders.map(order => order._id);
        // Get chat information for these orders
        const orderChats = await orderChat_model_1.default.find({ orderId: { $in: orderIds } })
            .populate('lastMessage')
            .lean();
        // Combine order and chat information
        const orderChatData = orders.map(order => {
            const chat = orderChats.find(c => c.orderId === order._id);
            return {
                order,
                chat: chat || null,
                unreadCount: chat?.unreadCount || 0,
                lastMessage: chat?.lastMessage || null,
            };
        });
        const total = await order_model_1.default.countDocuments({ userId });
        res.status(200).json({
            success: true,
            message: 'Order chats retrieved successfully',
            data: {
                orderChats: orderChatData,
                total,
                page,
                limit,
                hasMore: skip + limit < total,
            },
        });
    }
    catch (error) {
        console.error('Error getting user order chats:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while retrieving order chats', 500));
    }
};
exports.getUserOrderChats = getUserOrderChats;
// Mark messages as read
const markMessagesAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const { orderId } = req.params;
        // Verify order exists and user has access
        const order = await order_model_1.default.findOne({ _id: orderId, userId });
        if (!order) {
            return next(new ErrorHandler_1.ErrorHandler('Order not found or access denied', 404));
        }
        // Mark all unread messages as read
        await chatMessage_model_1.default.updateMany({ orderId, isRead: false, userId: { $ne: userId } }, { isRead: true });
        // Update unread count in order chat
        await orderChat_model_1.default.findOneAndUpdate({ orderId }, { unreadCount: 0 }, { upsert: true });
        res.status(200).json((0, response_types_1.SuccessResponse)(null, 'Messages marked as read'));
    }
    catch (error) {
        console.error('Error marking messages as read:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while marking messages as read', 500));
    }
};
exports.markMessagesAsRead = markMessagesAsRead;
// Delete a message
const deleteMessage = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const { messageId } = req.params;
        // Find message and verify ownership
        const message = await chatMessage_model_1.default.findById(messageId);
        if (!message) {
            return next(new ErrorHandler_1.ErrorHandler('Message not found', 404));
        }
        // Verify user owns the message or has admin access
        if (message.userId !== userId) {
            return next(new ErrorHandler_1.ErrorHandler('Access denied', 403));
        }
        await chatMessage_model_1.default.findByIdAndDelete(messageId);
        // Update order chat
        const orderChat = await orderChat_model_1.default.findOne({ orderId: message.orderId });
        if (orderChat) {
            orderChat.messages = orderChat.messages.filter(msgId => msgId.toString() !== messageId);
            // Update last message if this was the last message
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
// Get unread message count for an order
exports.getUnreadCount = (0, ErrorHandler_1.CatchAsyncErrors)(async (req, res, next) => {
    const userId = req.user.id;
    const { orderId } = req.params;
    const order = await order_model_1.default.findOne({ _id: orderId });
    if (!order) {
        return next(new ErrorHandler_1.ErrorHandler('Order not found or access denied', 404));
    }
    const count = await chatMessage_model_1.default.countDocuments({
        orderId,
        isRead: false,
        userId: { $ne: userId },
    });
    res.status(200).json((0, response_types_1.SuccessResponse)({ count }, 'Unread count retrieved'));
});
