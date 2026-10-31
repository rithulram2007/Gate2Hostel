import express from 'express';
import multer from 'multer';
import {
  createOrder,
  getOrders,
  getOrderById,
  acceptOrder,
  completeOrder,
  cancelOrder,
  getUserOrderHistory
} from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { otpLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// Configure Multer for In-Memory uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image attachments are allowed'), false);
    }
  }
});

router.route('/')
  .post(protect, upload.single('image'), createOrder)
  .get(protect, getOrders);

router.get('/history', protect, getUserOrderHistory);

router.route('/:id')
  .get(protect, getOrderById);

router.put('/:id/accept', protect, acceptOrder);
router.put('/:id/complete', protect, otpLimiter, completeOrder);
router.put('/:id/cancel', protect, cancelOrder);

export default router;
