"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageDTO = void 0;
class MessageDTO {
    constructor(model) {
        this.id = model._id || '';
        this.orderId = model.orderId || '';
        this.message = model.message;
        this.messageType = model.messageType;
        this.senderType = model.senderType;
        this.isRead = model.isRead;
        this.createdAt = model.createdAt;
        this.updatedAt = model.updatedAt;
        this.isRead = model.isRead;
        this.user = {
            id: model.userId?._id || null,
            email: model.userId?.email || null,
        };
        this.createdAt = model.createdAt;
        this.updatedAt = model.updatedAt;
    }
}
exports.MessageDTO = MessageDTO;
