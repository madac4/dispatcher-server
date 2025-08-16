"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.deleteMessage = exports.markMessagesAsRead = exports.getUserOrderChats = exports.getOrderMessages = exports.sendMessage = void 0;
const chatMessage_model_1 = __importDefault(require("../models/chatMessage.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const orderChat_model_1 = __importDefault(require("../models/orderChat.model"));
const response_types_1 = require("../types/response.types");
const ErrorHandler_1 = require("../utils/ErrorHandler");
// Send a message to an order chat
const sendMessage = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const messageData = req.body;
        const { orderId, message, messageType = 'text', senderType = 'user', attachments = [] } = messageData;
        // Validate required fields
        if (!orderId || !message) {
            return next(new ErrorHandler_1.ErrorHandler('Order ID and message are required', 400));
        }
        // Verify order exists and user has access
        const order = await order_model_1.default.findOne({ _id: orderId, userId });
        if (!order) {
            return next(new ErrorHandler_1.ErrorHandler('Order not found or access denied', 404));
        }
        // Create new message
        const newMessage = new chatMessage_model_1.default({
            orderId,
            userId,
            message,
            messageType,
            senderType,
            attachments,
            isRead: false,
        });
        const savedMessage = await newMessage.save();
        // Update or create order chat
        let orderChat = await orderChat_model_1.default.findOne({ orderId });
        if (!orderChat) {
            // Create new chat session for this order
            orderChat = new orderChat_model_1.default({
                orderId,
                messages: [savedMessage._id],
                lastMessage: savedMessage._id,
                unreadCount: 1,
            });
        }
        else {
            // Update existing chat session
            orderChat.messages.push(savedMessage._id);
            orderChat.lastMessage = savedMessage._id;
            orderChat.unreadCount += 1;
        }
        await orderChat.save();
        // Populate user information for response
        const populatedMessage = await chatMessage_model_1.default.findById(savedMessage._id).populate('userId', 'firstName lastName email');
        res.status(201).json((0, response_types_1.SuccessResponse)(populatedMessage, 'Message sent successfully'));
    }
    catch (error) {
        console.error('Error sending message:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while sending message', 500));
    }
};
exports.sendMessage = sendMessage;
// Get chat messages for an order
const getOrderMessages = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId)
            return next(new ErrorHandler_1.ErrorHandler('User not authenticated', 401));
        const { orderId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        // Verify order exists and user has access
        const order = await order_model_1.default.findOne({ _id: orderId, userId });
        if (!order) {
            return next(new ErrorHandler_1.ErrorHandler('Order not found or access denied', 404));
        }
        // Get messages with pagination
        const messages = await chatMessage_model_1.default.find({ orderId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'firstName lastName email')
            .lean();
        // Get total count
        const total = await chatMessage_model_1.default.countDocuments({ orderId });
        // Mark messages as read if they're from other users
        const unreadMessages = messages.filter(msg => !msg.isRead && msg.userId !== userId);
        if (unreadMessages.length > 0) {
            await chatMessage_model_1.default.updateMany({ _id: { $in: unreadMessages.map(msg => msg._id) } }, { isRead: true });
        }
        // Update unread count in order chat
        await orderChat_model_1.default.findOneAndUpdate({ orderId }, { unreadCount: 0 }, { upsert: true });
        res.status(200).json({
            success: true,
            message: 'Messages retrieved successfully',
            data: {
                messages: messages.reverse(), // Return in chronological order
                total,
                page,
                limit,
                hasMore: skip + limit < total,
            },
        });
    }
    catch (error) {
        console.error('Error getting messages:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while retrieving messages', 500));
    }
};
exports.getOrderMessages = getOrderMessages;
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
        const orders = await order_model_1.default.find({ userId }).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean();
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
                const lastMessage = await chatMessage_model_1.default.findOne({ orderId: message.orderId }).sort({ createdAt: -1 });
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
const getUnreadCount = async (req, res, next) => {
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
        const unreadCount = await chatMessage_model_1.default.countDocuments({
            orderId,
            isRead: false,
            userId: { $ne: userId },
        });
        res.status(200).json((0, response_types_1.SuccessResponse)({ unreadCount }, 'Unread count retrieved'));
    }
    catch (error) {
        console.error('Error getting unread count:', error);
        return next(new ErrorHandler_1.ErrorHandler('Internal server error while getting unread count', 500));
    }
};
exports.getUnreadCount = getUnreadCount;
