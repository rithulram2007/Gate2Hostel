import express from 'express';
import { fileComplaint, getComplaints, updateComplaintStatus } from '../controllers/complaintController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, fileComplaint);
router.get('/', protect, authorize('admin'), getComplaints);
router.put('/:id', protect, authorize('admin'), updateComplaintStatus);

export default router;
