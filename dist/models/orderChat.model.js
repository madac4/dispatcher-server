"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const orderChatSchema = new mongoose_1.Schema({
    orderId: { type: String, required: true, unique: true, ref: 'Order' },
    messages: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'ChatMessage' }],
    lastMessage: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ChatMessage' },
    unreadCount: { type: Number, default: 0 },
}, {
    timestamps: true,
});
orderChatSchema.index({ orderId: 1 });
orderChatSchema.index({ updatedAt: -1 });
exports.default = (0, mongoose_1.model)('OrderChat', orderChatSchema);
