import express from 'express';
import { createReview, getUserReviews } from '../controllers/reviewController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/:orderId', protect, createReview);
router.get('/user/:userId', protect, getUserReviews);

export default router;
