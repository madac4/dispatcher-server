"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const chatMessageSchema = new mongoose_1.Schema({
    orderId: { type: String, required: true, index: true, ref: 'Order' },
    userId: { type: String, index: true, ref: 'User' },
    message: { type: String, required: true },
    messageType: {
        type: String,
        enum: ['text', 'file', 'system'],
        default: 'text',
    },
    senderType: {
        type: String,
        enum: ['user', 'admin', 'system'],
        default: 'user',
    },
    isRead: { type: Boolean, default: false },
}, {
    timestamps: true,
});
chatMessageSchema.index({ orderId: 1, createdAt: -1 });
chatMessageSchema.index({ orderId: 1, isRead: 1 });
exports.default = (0, mongoose_1.model)('ChatMessage', chatMessageSchema);
