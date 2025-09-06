import { IUser } from '../types/auth.types'
import { IChatMessage } from '../types/chat.types'

export class MessageDTO {
	id: string
	orderId: string
	user: {
		id: string | null
		email: string | null
	}
	message: string
	messageType: 'text' | 'system'
	senderType: 'user' | 'admin' | 'system'
	isRead: boolean
	createdAt: Date
	updatedAt: Date

	constructor(model: IChatMessage) {
		this.id = model._id || ''
		this.orderId = model.orderId || ''
		this.message = model.message
		this.messageType = model.messageType
		this.senderType = model.senderType
		this.isRead = model.isRead
		this.createdAt = model.createdAt
		this.updatedAt = model.updatedAt
		this.isRead = model.isRead
		this.user = {
			id: (model.userId as IUser)?._id || null,
			email: (model.userId as IUser)?.email || null,
		}
		this.createdAt = model.createdAt
		this.updatedAt = model.updatedAt
	}
}
