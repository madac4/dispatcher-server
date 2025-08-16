// React Hook for Real-time Chat Integration
// This hook provides easy integration with the Socket.IO chat system

import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export const useChat = (token, orderId) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState([])
  const typingTimeoutRef = useRef(null)

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!token) return

    const newSocket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    setSocket(newSocket)

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to chat server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from chat server')
    })

    // Chat events
    newSocket.on('new-message', data => {
      setMessages(prev => [...prev, data.message])
      if (data.message.userId !== 'current-user-id') {
        setUnreadCount(prev => prev + 1)
      }
    })

    newSocket.on('user-typing', data => {
      if (data.isTyping) {
        setTypingUsers(prev => new Set([...prev, data.userId]))
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.userId)
          return newSet
        })
      }
    })

    newSocket.on('user-joined-order', data => {
      setOnlineUsers(prev => [...prev, data.userId])
    })

    newSocket.on('user-left-order', data => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId))
    })

    newSocket.on('order-updated', data => {
      // Handle order updates
      console.log('Order updated:', data)
    })

    return () => {
      newSocket.disconnect()
    }
  }, [token])

  // Join order room when orderId changes
  useEffect(() => {
    if (socket && orderId && isConnected) {
      socket.emit('join-order-room', orderId)
      console.log(`Joined order room: ${orderId}`)

      return () => {
        socket.emit('leave-order-room', orderId)
        console.log(`Left order room: ${orderId}`)
      }
    }
  }, [socket, orderId, isConnected])

  // Send message
  const sendMessage = useCallback(
    async (message, attachments = []) => {
      if (!socket || !orderId) return

      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId,
            message,
            messageType: attachments.length > 0 ? 'file' : 'text',
            senderType: 'user',
            attachments,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        // Message will be added via Socket.IO event
      } catch (error) {
        console.error('Error sending message:', error)
        throw error
      }
    },
    [socket, orderId, token],
  )

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!socket || !orderId) return

    socket.emit('typing-start', orderId)

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
  }, [socket, orderId])

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!socket || !orderId) return

    socket.emit('typing-stop', orderId)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [socket, orderId])

  // Mark messages as read
  const markAsRead = useCallback(() => {
    if (!socket || !orderId) return

    socket.emit('mark-read', orderId)
    setUnreadCount(0)
  }, [socket, orderId])

  // Load chat history
  const loadMessages = useCallback(
    async (page = 1, limit = 50) => {
      if (!orderId) return

      try {
        const response = await fetch(`/api/chat/orders/${orderId}/messages?page=${page}&limit=${limit}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load messages')
        }

        const data = await response.json()
        setMessages(data.data.messages)
        setUnreadCount(0)
      } catch (error) {
        console.error('Error loading messages:', error)
        throw error
      }
    },
    [orderId, token],
  )

  // Search messages
  const searchMessages = useCallback(
    async searchTerm => {
      if (!orderId) return

      try {
        const response = await fetch(
          `/api/chat/orders/${orderId}/messages/search?q=${encodeURIComponent(searchTerm)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          throw new Error('Failed to search messages')
        }

        const data = await response.json()
        return data.data.messages
      } catch (error) {
        console.error('Error searching messages:', error)
        throw error
      }
    },
    [orderId, token],
  )

  return {
    // State
    isConnected,
    messages,
    typingUsers: Array.from(typingUsers),
    unreadCount,
    onlineUsers,

    // Actions
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    loadMessages,
    searchMessages,
  }
}

// Usage Example in React Component:
/*
import React, { useState, useEffect } from 'react'
import { useChat } from './useChatHook'

const OrderChat = ({ orderId, token }) => {
  const [message, setMessage] = useState('')
  const {
    isConnected,
    messages,
    typingUsers,
    unreadCount,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    loadMessages
  } = useChat(token, orderId)

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    markAsRead()
  }, [messages, markAsRead])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      await sendMessage(message)
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleTyping = (e) => {
    setMessage(e.target.value)
    startTyping()
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Order Chat</h3>
        <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>

      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg._id} className={`message ${msg.userId === 'current-user-id' ? 'own' : 'other'}`}>
            <div className="message-content">{msg.message}</div>
            <div className="message-time">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(', ')} is typing...
          </div>
        )}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>

      <div className="online-users">
        <h4>Online Users ({onlineUsers.length})</h4>
        {onlineUsers.map(userId => (
          <div key={userId} className="online-user">
            {userId}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrderChat
*/
