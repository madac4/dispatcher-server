"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = exports.SocketService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_io_1 = require("socket.io");
class SocketService {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // userId -> socketIds[]
        this.orderRooms = new Map(); // orderId -> userIds[]
    }
    initialize(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_ORIGINS?.split(',') || ['http://localhost:3000'],
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });
        this.setupMiddleware();
        this.setupEventHandlers();
        console.log('Socket.IO server initialized');
    }
    setupMiddleware() {
        if (!this.io)
            return;
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                socket.data.userId = decoded.id;
                next();
            }
            catch (error) {
                next(new Error('Authentication error: Invalid token'));
            }
        });
    }
    setupEventHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', socket => {
            const userId = socket.data.userId;
            console.log(`User ${userId} connected: ${socket.id}`);
            // Store user's socket connection
            this.addUserSocket(userId, socket.id);
            // Join user's order rooms
            this.joinUserOrderRooms(socket, userId);
            // Handle joining specific order room
            socket.on('join-order-room', (orderId) => {
                this.joinOrderRoom(socket, orderId, userId);
            });
            // Handle leaving order room
            socket.on('leave-order-room', (orderId) => {
                this.leaveOrderRoom(socket, orderId, userId);
            });
            // Handle typing indicator
            socket.on('typing-start', (orderId) => {
                socket.to(`order-${orderId}`).emit('user-typing', {
                    userId,
                    orderId,
                    isTyping: true,
                });
            });
            socket.on('typing-stop', (orderId) => {
                socket.to(`order-${orderId}`).emit('user-typing', {
                    userId,
                    orderId,
                    isTyping: false,
                });
            });
            // Handle message read receipts
            socket.on('mark-read', (orderId) => {
                socket.to(`order-${orderId}`).emit('message-read', {
                    userId,
                    orderId,
                    timestamp: new Date(),
                });
            });
            // Handle disconnection
            socket.on('disconnect', () => {
                this.removeUserSocket(userId, socket.id);
                console.log(`User ${userId} disconnected: ${socket.id}`);
            });
        });
    }
    addUserSocket(userId, socketId) {
        const userSockets = this.userSockets.get(userId) || [];
        userSockets.push(socketId);
        this.userSockets.set(userId, userSockets);
    }
    removeUserSocket(userId, socketId) {
        const userSockets = this.userSockets.get(userId) || [];
        const updatedSockets = userSockets.filter(id => id !== socketId);
        if (updatedSockets.length === 0) {
            this.userSockets.delete(userId);
        }
        else {
            this.userSockets.set(userId, updatedSockets);
        }
    }
    async joinUserOrderRooms(socket, userId) {
        console.log(`User ${userId} ready to join order rooms`);
    }
    joinOrderRoom(socket, orderId, userId) {
        const roomName = `order-${orderId}`;
        socket.join(roomName);
        // Track users in this order room
        const roomUsers = this.orderRooms.get(orderId) || [];
        if (!roomUsers.includes(userId)) {
            roomUsers.push(userId);
            this.orderRooms.set(orderId, roomUsers);
        }
        console.log(`User ${userId} joined order room: ${orderId}`);
        // Notify others in the room
        socket.to(roomName).emit('user-joined-order', {
            userId,
            orderId,
            timestamp: new Date(),
        });
    }
    leaveOrderRoom(socket, orderId, userId) {
        const roomName = `order-${orderId}`;
        socket.leave(roomName);
        // Remove user from room tracking
        const roomUsers = this.orderRooms.get(orderId) || [];
        const updatedUsers = roomUsers.filter(id => id !== userId);
        if (updatedUsers.length === 0) {
            this.orderRooms.delete(orderId);
        }
        else {
            this.orderRooms.set(orderId, updatedUsers);
        }
        console.log(`User ${userId} left order room: ${orderId}`);
        // Notify others in the room
        socket.to(roomName).emit('user-left-order', {
            userId,
            orderId,
            timestamp: new Date(),
        });
    }
    // Broadcast new message to all users in an order room
    broadcastMessage(orderId, message) {
        if (!this.io)
            return;
        const roomName = `order-${orderId}`;
        this.io.to(roomName).emit('new-message', {
            orderId,
            message,
            timestamp: new Date(),
        });
        console.log(`Message broadcasted to order room: ${orderId}`);
    }
    // Broadcast order status update
    broadcastOrderUpdate(orderId, update) {
        if (!this.io)
            return;
        const roomName = `order-${orderId}`;
        this.io.to(roomName).emit('order-updated', {
            orderId,
            update,
            timestamp: new Date(),
        });
        console.log(`Order update broadcasted to room: ${orderId}`);
    }
    // Send notification to specific user
    sendNotification(userId, notification) {
        if (!this.io)
            return;
        const userSockets = this.userSockets.get(userId) || [];
        userSockets.forEach(socketId => {
            this.io.to(socketId).emit('notification', notification);
        });
        console.log(`Notification sent to user: ${userId}`);
    }
    // Get connected users for an order
    getOrderUsers(orderId) {
        return this.orderRooms.get(orderId) || [];
    }
    // Get user's socket connections
    getUserSockets(userId) {
        return this.userSockets.get(userId) || [];
    }
    // Check if user is online
    isUserOnline(userId) {
        const userSockets = this.userSockets.get(userId) || [];
        return userSockets.length > 0;
    }
    // Get online users for multiple orders
    getOnlineUsersForOrders(orderIds) {
        const result = new Map();
        orderIds.forEach(orderId => {
            const users = this.orderRooms.get(orderId) || [];
            const onlineUsers = users.filter(userId => this.isUserOnline(userId));
            result.set(orderId, onlineUsers);
        });
        return result;
    }
}
exports.SocketService = SocketService;
// Export singleton instance
exports.socketService = new SocketService();
