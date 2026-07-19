import express from 'express';
import multer from 'multer';
import { getProfile, updateProfile, updateProfilePhoto, depositWallet, getPublicProfile, paySecurityDeposit, refundSecurityDeposit } from '../controllers/profileController.js';
import { protect } from '../middlewares/authMiddleware.js';

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
      cb(new Error('Only image file uploads are supported.'), false);
    }
  }
});

router.get('/me', protect, getProfile);
router.put('/update', protect, updateProfile);
router.post('/photo', protect, upload.single('photo'), updateProfilePhoto);
router.post('/wallet/deposit', protect, depositWallet);
router.post('/partner/verify', protect, paySecurityDeposit);
router.post('/partner/refund', protect, refundSecurityDeposit);
router.get('/public/:userId', protect, getPublicProfile);

export default router;
