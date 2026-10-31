import express from 'express';
import { getTransactions } from '../controllers/transactionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All transaction routes are strictly authenticated
router.use(protect);

router.get('/', getTransactions);

export default router;
