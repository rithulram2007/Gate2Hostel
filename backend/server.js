import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import validateEnv from './utils/validateEnv.js';
import connectDB from './config/db.js';
import errorHandler from './middlewares/errorMiddleware.js';
import User from './models/User.js';
import Order from './models/Order.js';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';

// Load Env variables and validate critical secrets fail-fast
dotenv.config();
validateEnv();

// Connect Database
connectDB();

const app = express();
const server = http.createServer(app);

// Reverse proxy compatibility (Nginx, Render, Cloudflare)
app.set('trust proxy', 1);

// Socket.IO Setup with restricted CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach Socket.IO to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// NoSQL Query Injection Sanitizer
const sanitizeNoSql = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeNoSql(obj[key]);
      }
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitizeNoSql(req.body);
  if (req.params) sanitizeNoSql(req.params);
  if (req.query) sanitizeNoSql(req.query);
  next();
});

// Global Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 general requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', limiter);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gate2Hostel API is running successfully.',
    timestamp: new Date()
  });
});

// Socket.IO Strict Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Access token required'));
    }
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('name role isBanned');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    if (user.isBanned) {
      return next(new Error('Authentication error: Account is banned'));
    }
    socket.userId = user._id.toString();
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      role: user.role
    };
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
});

// Online users tracker
const onlineUsers = new Map();

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user.id} - ${socket.user.name})`);

  // Track authenticated users
  if (socket.userId) {
    onlineUsers.set(socket.userId, socket.id);
    io.emit('online_count', onlineUsers.size);
  }

  // Room authorization check before joining
  socket.on('join_room', async (roomId) => {
    try {
      if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
        socket.emit('room_error', { message: 'Invalid order room identifier' });
        return;
      }

      const order = await Order.findById(roomId).select('student partner');
      if (!order) {
        socket.emit('room_error', { message: 'Order room does not exist' });
        return;
      }

      const isStudent = order.student.toString() === socket.user.id;
      const isPartner = order.partner && order.partner.toString() === socket.user.id;
      const isAdmin = socket.user.role === 'admin';

      if (!isStudent && !isPartner && !isAdmin) {
        socket.emit('room_error', { message: 'Unauthorized: You are not a participant of this order room' });
        return;
      }

      socket.join(roomId);
      console.log(`User ${socket.user.id} (${socket.user.name}) authorized and joined room ${roomId}`);
    } catch (error) {
      socket.emit('room_error', { message: 'Failed to authorize and join room' });
    }
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.user.id} left room ${roomId}`);
  });

  // Typing indicators for chat rooms using verified authenticated socket identity
  socket.on('typing_start', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', { userName: socket.user.name });
  });

  socket.on('typing_stop', ({ roomId }) => {
    socket.to(roomId).emit('user_stopped_typing');
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online_count', onlineUsers.size);
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
