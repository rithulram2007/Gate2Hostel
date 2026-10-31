import express from 'express';
import { register, login, googleLogin, refresh, logout } from '../controllers/authController.js';
import { loginLimiter, registerLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
