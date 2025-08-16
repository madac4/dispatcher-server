import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { Server as SocketIOServer } from 'socket.io'
import { IChatMessage } from '../types/chat.types'

interface AuthenticatedSocket {
  userId: string
  orderIds: string[]
}

export class SocketService {
  private io: SocketIOServer | null = null
  private userSockets: Map<string, string[]> = new Map() // userId -> socketIds[]
  private orderRooms: Map<string, string[]> = new Map() // orderId -> userIds[]

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    this.setupMiddleware()
    this.setupEventHandlers()

    console.log('Socket.IO server initialized')
  }

  private setupMiddleware() {
    if (!this.io) return

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

        if (!token) {
          return next(new Error('Authentication error: No token provided'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
        socket.data.userId = decoded.id
        next()
      } catch (error) {
        next(new Error('Authentication error: Invalid token'))
      }
    })
  }

  private setupEventHandlers() {
    if (!this.io) return

    this.io.on('connection', socket => {
      const userId = socket.data.userId
      console.log(`User ${userId} connected: ${socket.id}`)

      // Store user's socket connection
      this.addUserSocket(userId, socket.id)

      // Join user's order rooms
      this.joinUserOrderRooms(socket, userId)

      // Handle joining specific order room
      socket.on('join-order-room', (orderId: string) => {
        this.joinOrderRoom(socket, orderId, userId)
      })

      // Handle leaving order room
      socket.on('leave-order-room', (orderId: string) => {
        this.leaveOrderRoom(socket, orderId, userId)
      })

      // Handle typing indicator
      socket.on('typing-start', (orderId: string) => {
        socket.to(`order-${orderId}`).emit('user-typing', {
          userId,
          orderId,
          isTyping: true,
        })
      })

      socket.on('typing-stop', (orderId: string) => {
        socket.to(`order-${orderId}`).emit('user-typing', {
          userId,
          orderId,
          isTyping: false,
        })
      })

      // Handle message read receipts
      socket.on('mark-read', (orderId: string) => {
        socket.to(`order-${orderId}`).emit('message-read', {
          userId,
          orderId,
          timestamp: new Date(),
        })
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        this.removeUserSocket(userId, socket.id)
        console.log(`User ${userId} disconnected: ${socket.id}`)
      })
    })
  }

  private addUserSocket(userId: string, socketId: string) {
    const userSockets = this.userSockets.get(userId) || []
    userSockets.push(socketId)
    this.userSockets.set(userId, userSockets)
  }

  private removeUserSocket(userId: string, socketId: string) {
    const userSockets = this.userSockets.get(userId) || []
    const updatedSockets = userSockets.filter(id => id !== socketId)

    if (updatedSockets.length === 0) {
      this.userSockets.delete(userId)
    } else {
      this.userSockets.set(userId, updatedSockets)
    }
  }

  private async joinUserOrderRooms(socket: any, userId: string) {
    console.log(`User ${userId} ready to join order rooms`)
  }

  private joinOrderRoom(socket: any, orderId: string, userId: string) {
    const roomName = `order-${orderId}`
    socket.join(roomName)

    // Track users in this order room
    const roomUsers = this.orderRooms.get(orderId) || []
    if (!roomUsers.includes(userId)) {
      roomUsers.push(userId)
      this.orderRooms.set(orderId, roomUsers)
    }

    console.log(`User ${userId} joined order room: ${orderId}`)

    // Notify others in the room
    socket.to(roomName).emit('user-joined-order', {
      userId,
      orderId,
      timestamp: new Date(),
    })
  }

  private leaveOrderRoom(socket: any, orderId: string, userId: string) {
    const roomName = `order-${orderId}`
    socket.leave(roomName)

    // Remove user from room tracking
    const roomUsers = this.orderRooms.get(orderId) || []
    const updatedUsers = roomUsers.filter(id => id !== userId)

    if (updatedUsers.length === 0) {
      this.orderRooms.delete(orderId)
    } else {
      this.orderRooms.set(orderId, updatedUsers)
    }

    console.log(`User ${userId} left order room: ${orderId}`)

    // Notify others in the room
    socket.to(roomName).emit('user-left-order', {
      userId,
      orderId,
      timestamp: new Date(),
    })
  }

  // Broadcast new message to all users in an order room
  broadcastMessage(orderId: string, message: IChatMessage) {
    if (!this.io) return

    const roomName = `order-${orderId}`
    this.io.to(roomName).emit('new-message', {
      orderId,
      message,
      timestamp: new Date(),
    })

    console.log(`Message broadcasted to order room: ${orderId}`)
  }

  // Broadcast order status update
  broadcastOrderUpdate(orderId: string, update: any) {
    if (!this.io) return

    const roomName = `order-${orderId}`
    this.io.to(roomName).emit('order-updated', {
      orderId,
      update,
      timestamp: new Date(),
    })

    console.log(`Order update broadcasted to room: ${orderId}`)
  }

  // Send notification to specific user
  sendNotification(userId: string, notification: any) {
    if (!this.io) return

    const userSockets = this.userSockets.get(userId) || []
    userSockets.forEach(socketId => {
      this.io!.to(socketId).emit('notification', notification)
    })

    console.log(`Notification sent to user: ${userId}`)
  }

  // Get connected users for an order
  getOrderUsers(orderId: string): string[] {
    return this.orderRooms.get(orderId) || []
  }

  // Get user's socket connections
  getUserSockets(userId: string): string[] {
    return this.userSockets.get(userId) || []
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    const userSockets = this.userSockets.get(userId) || []
    return userSockets.length > 0
  }

  // Get online users for multiple orders
  getOnlineUsersForOrders(orderIds: string[]): Map<string, string[]> {
    const result = new Map<string, string[]>()

    orderIds.forEach(orderId => {
      const users = this.orderRooms.get(orderId) || []
      const onlineUsers = users.filter(userId => this.isUserOnline(userId))
      result.set(orderId, onlineUsers)
    })

    return result
  }
}

// Export singleton instance
export const socketService = new SocketService()
