"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const chatMessage_model_1 = __importDefault(require("../models/chatMessage.model"));
const orderChat_model_1 = __importDefault(require("../models/orderChat.model"));
class ChatService {
    static async sendSystemMessage(orderId, message, senderType = 'system') {
        const systemMessage = new chatMessage_model_1.default({
            orderId,
            userId: null,
            message,
            messageType: 'system',
            senderType,
            isRead: false,
        });
        const savedMessage = await systemMessage.save();
        await orderChat_model_1.default.findOneAndUpdate({ orderId }, {
            $push: { messages: savedMessage._id },
            $set: { lastMessage: savedMessage._id },
            $inc: { unreadCount: 1 },
        }, { upsert: true });
        return savedMessage;
    }
    static async sendUserMessage(orderId, message, userId) {
        const userMessage = new chatMessage_model_1.default({
            orderId,
            userId,
            message,
            messageType: 'text',
            senderType: 'user',
            isRead: false,
        });
        const savedMessage = await userMessage.save();
        await orderChat_model_1.default.findOneAndUpdate({ orderId }, {
            $push: { messages: savedMessage._id },
            $set: { lastMessage: savedMessage._id },
            $inc: { unreadCount: 1 },
        }, { upsert: true });
        return savedMessage;
    }
    static async getChatStats(orderId) {
        const totalMessages = await chatMessage_model_1.default.countDocuments({ orderId });
        const unreadMessages = await chatMessage_model_1.default.countDocuments({
            orderId,
            isRead: false,
        });
        const userMessages = await chatMessage_model_1.default.countDocuments({
            orderId,
            senderType: 'user',
        });
        const adminMessages = await chatMessage_model_1.default.countDocuments({
            orderId,
            senderType: 'admin',
        });
        const systemMessages = await chatMessage_model_1.default.countDocuments({
            orderId,
            senderType: 'system',
        });
        return {
            totalMessages,
            unreadMessages,
            userMessages,
            adminMessages,
            systemMessages,
        };
    }
    // Search messages in an order chat
    static async searchMessages(orderId, searchTerm, userId) {
        const messages = await chatMessage_model_1.default.find({
            orderId,
            message: { $regex: searchTerm, $options: 'i' },
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'firstName lastName email')
            .lean();
        return messages;
    }
    // Get recent activity for all user orders
    static async getRecentActivity(userId, limit = 10) {
        const recentMessages = await chatMessage_model_1.default.find({
            userId: { $ne: userId }, // Messages from others
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('orderId', 'orderNumber commodity')
            .populate('userId', 'firstName lastName email')
            .lean();
        return recentMessages;
    }
    // Archive old messages (for performance)
    static async archiveOldMessages(orderId, daysOld = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const oldMessages = await chatMessage_model_1.default.find({
            orderId,
            createdAt: { $lt: cutoffDate },
        });
        // Here you would implement archiving logic
        // For now, we'll just mark them as archived
        await chatMessage_model_1.default.updateMany({ orderId, createdAt: { $lt: cutoffDate } }, { $set: { archived: true } });
        return oldMessages.length;
    }
    // Get chat participants for an order
    static async getChatParticipants(orderId) {
        const participants = await chatMessage_model_1.default.aggregate([
            { $match: { orderId } },
            { $group: { _id: '$userId' } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    userId: '$_id',
                    firstName: '$userInfo.firstName',
                    lastName: '$userInfo.lastName',
                    email: '$userInfo.email',
                },
            },
        ]);
        return participants;
    }
    // Mark all messages as read for a user in an order
    static async markAllAsRead(orderId, userId) {
        await chatMessage_model_1.default.updateMany({
            orderId,
            isRead: false,
            userId: { $ne: userId },
        }, { isRead: true });
        await orderChat_model_1.default.findOneAndUpdate({ orderId }, { unreadCount: 0 });
    }
    // Get message history with pagination
    static async getMessageHistory(orderId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const messages = await chatMessage_model_1.default.find({ orderId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'firstName lastName email')
            .lean();
        const total = await chatMessage_model_1.default.countDocuments({ orderId });
        return {
            messages: messages.reverse(), // Return in chronological order
            total,
            page,
            limit,
            hasMore: skip + limit < total,
        };
    }
}
exports.ChatService = ChatService;
