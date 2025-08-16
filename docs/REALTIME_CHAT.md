# Real-Time Chat Implementation

## Overview

The dispatcher server now includes a complete real-time chat system using Socket.IO for instant messaging between users and order-specific conversations.

## 🚀 Features

### Real-Time Communication

- ✅ **Instant messaging** - Messages appear instantly without page refresh
- ✅ **Typing indicators** - See when someone is typing
- ✅ **Read receipts** - Know when messages are read
- ✅ **Online status** - See who's currently online
- ✅ **Order-specific rooms** - Separate chat for each order
- ✅ **File attachments** - Send files in chat messages
- ✅ **System messages** - Automatic notifications for order updates

### Advanced Features

- ✅ **Message history** - Load previous messages with pagination
- ✅ **Message search** - Search through chat history
- ✅ **Unread counts** - Track unread messages per order
- ✅ **User notifications** - Push notifications for new messages
- ✅ **Order status updates** - Real-time order status changes
- ✅ **Message archiving** - Automatic archiving of old messages

## 🏗️ Architecture

### Backend Components

1. **Socket.IO Service** (`src/services/socket.service.ts`)

   - Manages WebSocket connections
   - Handles room management
   - Broadcasts messages and updates

2. **Chat Controller** (`src/controllers/chatController.ts`)

   - REST API endpoints for chat operations
   - Integrates with Socket.IO for real-time updates

3. **Chat Models**

   - `ChatMessage` - Individual chat messages
   - `OrderChat` - Chat sessions for orders

4. **Chat Service** (`src/services/chat.service.ts`)
   - Business logic for chat operations
   - System message handling
   - Chat statistics and analytics

### Frontend Integration

1. **Socket.IO Client** - Connect to real-time server
2. **React Hook** - Easy integration with React components
3. **Event Handlers** - Handle real-time events

## 📡 API Endpoints

### REST API (HTTP)

```
POST   /api/chat/messages                    - Send a message
GET    /api/chat/orders/:orderId/messages    - Get order messages
GET    /api/chat/orders                      - Get all user order chats
PATCH  /api/chat/orders/:orderId/read        - Mark messages as read
GET    /api/chat/orders/:orderId/unread-count - Get unread count
DELETE /api/chat/messages/:messageId         - Delete a message
```

### Socket.IO Events

#### Client → Server

```javascript
// Join order chat room
socket.emit('join-order-room', orderId)

// Leave order chat room
socket.emit('leave-order-room', orderId)

// Start typing indicator
socket.emit('typing-start', orderId)

// Stop typing indicator
socket.emit('typing-stop', orderId)

// Mark messages as read
socket.emit('mark-read', orderId)
```

#### Server → Client

```javascript
// New message received
socket.on('new-message', data => {
  // data: { orderId, message, timestamp }
})

// Order updated
socket.on('order-updated', data => {
  // data: { orderId, update, timestamp }
})

// User typing
socket.on('user-typing', data => {
  // data: { userId, orderId, isTyping }
})

// Message read
socket.on('message-read', data => {
  // data: { userId, orderId, timestamp }
})

// User joined/left order
socket.on('user-joined-order', data => {})
socket.on('user-left-order', data => {})

// Notifications
socket.on('notification', data => {})
```

## 🔧 Setup & Installation

### Backend Setup

1. **Install Dependencies**

   ```bash
   npm install socket.io
   npm install @types/socket.io --save-dev
   ```

2. **Server Configuration**
   The Socket.IO server is automatically initialized in `src/server.ts`:

   ```typescript
   import { socketService } from './services/socket.service'

   // Initialize Socket.IO
   socketService.initialize(server)
   ```

3. **Authentication**
   Socket.IO connections are authenticated using JWT tokens:
   ```typescript
   // Client sends token in connection
   const socket = io('http://localhost:3000', {
     auth: { token: 'your-jwt-token' },
   })
   ```

### Frontend Setup

1. **Install Socket.IO Client**

   ```bash
   npm install socket.io-client
   ```

2. **Basic Connection**

   ```javascript
   import { io } from 'socket.io-client'

   const socket = io('http://localhost:3000', {
     auth: { token: 'your-jwt-token' },
   })
   ```

3. **Using React Hook**

   ```javascript
   import { useChat } from './useChatHook'

   const { messages, sendMessage, isConnected } = useChat(token, orderId)
   ```

## 💬 Usage Examples

### Basic Chat Implementation

```javascript
// Connect to Socket.IO
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' },
})

// Join order chat room
socket.emit('join-order-room', 'order-id-123')

// Listen for new messages
socket.on('new-message', data => {
  console.log('New message:', data.message)
  // Add message to UI
})

// Send message via REST API
const response = await fetch('/api/chat/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    orderId: 'order-id-123',
    message: 'Hello, how is my order?',
    messageType: 'text',
    senderType: 'user',
  }),
})
```

### React Component Example

```jsx
import React, { useState } from 'react'
import { useChat } from './useChatHook'

const OrderChat = ({ orderId, token }) => {
  const [message, setMessage] = useState('')
  const { messages, sendMessage, isConnected, typingUsers, unreadCount } = useChat(token, orderId)

  const handleSend = async () => {
    if (!message.trim()) return
    await sendMessage(message)
    setMessage('')
  }

  return (
    <div className="chat">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg._id} className="message">
            {msg.message}
          </div>
        ))}
      </div>

      {typingUsers.length > 0 && <div className="typing">{typingUsers.join(', ')} is typing...</div>}

      <div className="input">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}
```

## 🔐 Security

### Authentication

- All Socket.IO connections require valid JWT tokens
- Users can only access their own order chats
- Server validates user permissions for each operation

### Authorization

- Users can only send messages to their own orders
- Message deletion restricted to message owner
- Order access validated on every operation

## 📊 Performance

### Optimization Features

- **Message pagination** - Load messages in chunks
- **Room-based broadcasting** - Messages only sent to relevant users
- **Connection pooling** - Efficient Socket.IO connection management
- **Message archiving** - Old messages archived for performance

### Scalability

- **Horizontal scaling** - Multiple server instances supported
- **Redis adapter** - For multi-server deployments
- **Connection limits** - Prevent resource exhaustion

## 🚨 Error Handling

### Connection Errors

```javascript
socket.on('connect_error', error => {
  console.error('Connection failed:', error)
  // Implement reconnection logic
})
```

### Message Errors

```javascript
try {
  await sendMessage(message)
} catch (error) {
  console.error('Failed to send message:', error)
  // Show user-friendly error message
}
```

## 🔄 Migration from REST-only

If you're migrating from the REST-only implementation:

1. **Keep existing REST endpoints** - They still work for non-real-time operations
2. **Add Socket.IO connection** - For real-time features
3. **Update UI components** - Use real-time events for instant updates
4. **Gradual migration** - You can use both systems simultaneously

## 🧪 Testing

### Backend Testing

```javascript
// Test Socket.IO connection
const io = require('socket.io-client')
const socket = io('http://localhost:3000', {
  auth: { token: 'test-token' },
})

socket.on('connect', () => {
  console.log('Connected successfully')
})
```

### Frontend Testing

```javascript
// Test chat functionality
const { sendMessage, messages } = useChat(token, orderId)

// Send test message
await sendMessage('Test message')

// Verify message appears in real-time
expect(messages).toContainEqual(
  expect.objectContaining({
    message: 'Test message',
  }),
)
```

## 📈 Monitoring

### Key Metrics

- **Connection count** - Number of active Socket.IO connections
- **Message rate** - Messages per second
- **Room occupancy** - Users per order chat room
- **Error rates** - Connection and message errors

### Logging

```javascript
// Server logs connection events
console.log(`User ${userId} connected: ${socket.id}`)
console.log(`User ${userId} joined order room: ${orderId}`)
console.log(`Message broadcasted to order room: ${orderId}`)
```

## 🎯 Best Practices

1. **Always handle connection errors** - Implement reconnection logic
2. **Use typing indicators sparingly** - Don't spam typing events
3. **Implement message queuing** - Queue messages when offline
4. **Handle disconnections gracefully** - Save draft messages
5. **Limit message size** - Prevent large message abuse
6. **Rate limit messages** - Prevent spam

## 🔮 Future Enhancements

- **Voice messages** - Audio recording and playback
- **Video calls** - Integrated video chat
- **Message reactions** - Like, heart, thumbs up
- **Message threading** - Reply to specific messages
- **Chat export** - Export chat history
- **Message encryption** - End-to-end encryption
- **Push notifications** - Mobile push notifications
- **Chat bots** - Automated responses

## 📞 Support

For issues or questions about the real-time chat implementation:

1. Check the server logs for connection errors
2. Verify JWT token is valid and not expired
3. Ensure CORS is properly configured
4. Check Socket.IO client version compatibility

The real-time chat system is now fully functional and ready for production use!
