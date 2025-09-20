import { model, Schema } from 'mongoose'
import { IChatMessage } from '../types/chat.types'

const chatMessageSchema: Schema = new Schema<IChatMessage>(
	{
		orderId: { type: String, required: true, ref: 'Order' },
		userId: { type: String, index: true, ref: 'User' },
		message: { type: String, required: true },
		messageType: {
			type: String,
			enum: ['text', 'system'],
			default: 'text',
		},
		senderType: {
			type: String,
			enum: ['user', 'admin', 'system'],
			default: 'user',
		},
		isRead: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	},
)

chatMessageSchema.index({ orderId: 1, createdAt: -1 })
chatMessageSchema.index({ orderId: 1, isRead: 1 })

export default model<IChatMessage>('ChatMessage', chatMessageSchema)
