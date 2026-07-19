import express from 'express';
import { register, login, googleLogin, refresh, logout } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
