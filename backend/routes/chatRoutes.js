import express from 'express';
import { getChatMessages, sendChatMessage } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/:orderId')
  .get(protect, getChatMessages)
  .post(protect, sendChatMessage);

export default router;
