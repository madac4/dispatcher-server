export interface IChatMessage {
  _id?: string
  orderId: string
  userId: string
  message: string
  messageType: 'text' | 'file' | 'system'
  senderType: 'user' | 'admin' | 'system'
  attachments?: Array<{
    filename: string
    originalname: string
    contentType: string
    size: number
    url?: string
  }>
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

export interface ICreateMessageRequest {
  orderId: string
  message: string
  messageType?: 'text' | 'file' | 'system'
  senderType?: 'user' | 'admin' | 'system'
  attachments?: Array<{
    filename: string
    originalname: string
    contentType: string
    size: number
  }>
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
