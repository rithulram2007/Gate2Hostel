import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import errorHandler from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load Env variables
dotenv.config();

// Connect Database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs for local testing
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

// Basic Route / Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gate2Hostel API is running successfully.',
    timestamp: new Date()
  });
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
    }
    next();
  } catch (err) {
    // Allow unauthenticated connections for public feeds, but tag them
    next();
  }
});

// Online users tracker
const onlineUsers = new Map();

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}${socket.userId ? ` (User: ${socket.userId})` : ''}`);

  // Track authenticated users
  if (socket.userId) {
    onlineUsers.set(socket.userId, socket.id);
    io.emit('online_count', onlineUsers.size);
  }

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // Typing indicators for chat rooms
  socket.on('typing_start', ({ roomId, userName }) => {
    socket.to(roomId).emit('user_typing', { userName });
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
