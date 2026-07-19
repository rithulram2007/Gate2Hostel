import express from 'express';
import { getAnalytics, getAllUsers, toggleBanUser } from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/analytics', protect, authorize('admin'), getAnalytics);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:userId/ban', protect, authorize('admin'), toggleBanUser);

export default router;
