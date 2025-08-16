// Socket.IO Client Example for Real-time Chat
// This is an example of how to integrate Socket.IO in your frontend

import { io } from 'socket.io-client'

class ChatClient {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.currentOrderId = null
    this.messageHandlers = new Map()
    this.typingUsers = new Set()
  }

  // Connect to Socket.IO server
  connect(token) {
    this.socket = io('http://localhost:3000', {
      auth: {
        token: token, // JWT token for authentication
      },
      transports: ['websocket', 'polling'],
    })

    this.setupEventListeners()
  }

  // Setup Socket.IO event listeners
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server')
      this.isConnected = true
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server')
      this.isConnected = false
    })

    this.socket.on('connect_error', error => {
      console.error('Socket.IO connection error:', error)
    })

    // Listen for new messages
    this.socket.on('new-message', data => {
      console.log('New message received:', data)
      this.handleNewMessage(data)
    })

    // Listen for order updates
    this.socket.on('order-updated', data => {
      console.log('Order updated:', data)
      this.handleOrderUpdate(data)
    })

    // Listen for user typing indicators
    this.socket.on('user-typing', data => {
      console.log('User typing:', data)
      this.handleUserTyping(data)
    })

    // Listen for message read receipts
    this.socket.on('message-read', data => {
      console.log('Message read:', data)
      this.handleMessageRead(data)
    })

    // Listen for user join/leave notifications
    this.socket.on('user-joined-order', data => {
      console.log('User joined order:', data)
      this.handleUserJoined(data)
    })

    this.socket.on('user-left-order', data => {
      console.log('User left order:', data)
      this.handleUserLeft(data)
    })

    // Listen for notifications
    this.socket.on('notification', data => {
      console.log('Notification received:', data)
      this.handleNotification(data)
    })
  }

  // Join an order chat room
  joinOrderRoom(orderId) {
    if (!this.isConnected) {
      console.error('Socket not connected')
      return
    }

    this.currentOrderId = orderId
    this.socket.emit('join-order-room', orderId)
    console.log(`Joined order room: ${orderId}`)
  }

  // Leave an order chat room
  leaveOrderRoom(orderId) {
    if (!this.isConnected) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('leave-order-room', orderId)
    this.currentOrderId = null
    console.log(`Left order room: ${orderId}`)
  }

  // Send typing indicator
  startTyping(orderId) {
    if (!this.isConnected) return
    this.socket.emit('typing-start', orderId)
  }

  stopTyping(orderId) {
    if (!this.isConnected) return
    this.socket.emit('typing-stop', orderId)
  }

  // Mark messages as read
  markMessagesAsRead(orderId) {
    if (!this.isConnected) return
    this.socket.emit('mark-read', orderId)
  }

  // Disconnect from Socket.IO server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // Event handlers
  handleNewMessage(data) {
    const { orderId, message, timestamp } = data

    // Add message to UI
    this.addMessageToUI(message)

    // Update unread count
    this.updateUnreadCount(orderId)

    // Play notification sound if not focused
    if (!document.hasFocus()) {
      this.playNotificationSound()
    }
  }

  handleOrderUpdate(data) {
    const { orderId, update, timestamp } = data

    // Update order status in UI
    this.updateOrderStatus(orderId, update)

    // Show notification
    this.showNotification(`Order ${update.order?.orderNumber} updated`)
  }

  handleUserTyping(data) {
    const { userId, orderId, isTyping } = data

    if (isTyping) {
      this.typingUsers.add(userId)
      this.showTypingIndicator(userId)
    } else {
      this.typingUsers.delete(userId)
      this.hideTypingIndicator(userId)
    }
  }

  handleMessageRead(data) {
    const { userId, orderId, timestamp } = data

    // Update read receipts in UI
    this.updateReadReceipts(orderId, userId, timestamp)
  }

  handleUserJoined(data) {
    const { userId, orderId, timestamp } = data

    // Show user joined notification
    this.showUserStatus(userId, 'joined')
  }

  handleUserLeft(data) {
    const { userId, orderId, timestamp } = data

    // Show user left notification
    this.showUserStatus(userId, 'left')
  }

  handleNotification(data) {
    // Show notification in UI
    this.showNotification(data.message)
  }

  // UI Helper Methods (implement these based on your UI framework)
  addMessageToUI(message) {
    // Add message to chat UI
    console.log('Adding message to UI:', message)
  }

  updateUnreadCount(orderId) {
    // Update unread message count
    console.log('Updating unread count for order:', orderId)
  }

  updateOrderStatus(orderId, update) {
    // Update order status in UI
    console.log('Updating order status:', orderId, update)
  }

  showTypingIndicator(userId) {
    // Show typing indicator for user
    console.log('User typing:', userId)
  }

  hideTypingIndicator(userId) {
    // Hide typing indicator for user
    console.log('User stopped typing:', userId)
  }

  updateReadReceipts(orderId, userId, timestamp) {
    // Update read receipts
    console.log('Message read by:', userId, 'at:', timestamp)
  }

  showUserStatus(userId, status) {
    // Show user join/leave status
    console.log('User', status, ':', userId)
  }

  showNotification(message) {
    // Show notification
    console.log('Notification:', message)
  }

  playNotificationSound() {
    // Play notification sound
    console.log('Playing notification sound')
  }
}

// Usage Example:
/*
const chatClient = new ChatClient()

// Connect with JWT token
chatClient.connect('your-jwt-token-here')

// Join an order chat room
chatClient.joinOrderRoom('order-id-here')

// Send typing indicators
chatClient.startTyping('order-id-here')
// ... user types ...
chatClient.stopTyping('order-id-here')

// Mark messages as read
chatClient.markMessagesAsRead('order-id-here')

// Leave order room
chatClient.leaveOrderRoom('order-id-here')

// Disconnect
chatClient.disconnect()
*/

export default ChatClient
