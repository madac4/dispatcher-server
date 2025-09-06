import { IUser } from './auth.types'

export interface IChatMessage {
	_id?: string
	orderId: string
	userId: string | IUser | null
	message: string
	messageType: 'text' | 'system'
	senderType: 'user' | 'admin' | 'system'
	isRead: boolean
	createdAt: Date
	updatedAt: Date
}
export interface IOrderChat {
	_id?: string
	orderId: string
	messages: IChatMessage[]
	lastMessage?: IChatMessage
	unreadCount: number
	createdAt: Date
	updatedAt: Date
}

export type MessagePayload = {
	orderId: string
	message: string
}

export interface IUpdateMessageRequest {
	message?: string
	isRead?: boolean
}

export interface IChatResponse {
	success: boolean
	message: string
	data?: IChatMessage | IOrderChat
	messages?: IChatMessage[]
	total?: number
	page?: number
	limit?: number
}
