import { model, Schema } from 'mongoose'
import { IOrderChat } from '../types/chat.types'

const orderChatSchema: Schema = new Schema<IOrderChat>(
  {
    orderId: { type: String, required: true, unique: true, ref: 'Order' },
    messages: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    unreadCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
)

orderChatSchema.index({ orderId: 1 })
orderChatSchema.index({ updatedAt: -1 })

export default model<IOrderChat>('OrderChat', orderChatSchema)
