import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import { generateAccessToken, generateRefreshToken, sendRefreshTokenCookie } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';
// Initialize Google OAuth Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'mock_client_id');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  const { name, email, password, hostel, block, roomNumber, phone } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ApiError('User already exists with this email address', 400));
    }

    // Double check email domain suffix
    if (!email.endsWith('@vitstudent.ac.in')) {
      return next(new ApiError('Registration restricted to @vitstudent.ac.in domains only.', 400));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      hostel: hostel || '',
      block: block || '',
      roomNumber: roomNumber || '',
      phone: phone || '',
      isVerified: true // Auto-verify locally for instant testing (avoiding hard SMTP block)
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    sendRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hostel: user.hostel,
        block: user.block,
        roomNumber: user.roomNumber,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isVerifiedPartner: user.isVerifiedPartner,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return next(new ApiError('Please provide an email and password', 400));
  }

  try {
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ApiError('Invalid email or password', 401));
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ApiError('Invalid email or password', 401));
    }

    if (user.isBanned) {
      return next(new ApiError('Your account has been banned. Please contact admin.', 403));
    }

    // Create tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    sendRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hostel: user.hostel,
        block: user.block,
        roomNumber: user.roomNumber,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isVerifiedPartner: user.isVerifiedPartner,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google Sign In / Sign Up
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
    return next(new ApiError('Google ID Token is required', 400));
  }

  // Strictly reject arbitrary mock tokens in development and production
  if (idToken.startsWith('mock_token_')) {
    if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_MOCKS !== 'true') {
      return next(new ApiError('Invalid or unsupported Google ID Token', 401));
    }
  }

  try {
    let payload;
    
    // Support testing bypass strictly when explicit test environment flag is set
    if (process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_MOCKS === 'true' && idToken.startsWith('mock_token_')) {
      const mockEmail = idToken.replace('mock_token_', '') + '@vitstudent.ac.in';
      payload = {
        email: mockEmail,
        name: idToken.replace('mock_token_', ''),
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
        sub: `mock_google_id_${idToken}`
      };
    } else {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    }

    const { email, name, picture, sub: googleId } = payload;

    // Verify VIT email domain
    if (!email.endsWith('@vitstudent.ac.in')) {
      return next(new ApiError('Only VIT student email accounts (@vitstudent.ac.in) are allowed.', 400));
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Link googleId if not present
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user, placeholder credentials for profile details
      user = await User.create({
        name,
        email,
        googleId,
        profilePhoto: picture || '',
        isVerified: true,
        hostel: '',
        block: '',
        roomNumber: '',
        phone: ''
      });
    }

    if (user.isBanned) {
      return next(new ApiError('Your account has been banned. Please contact admin.', 403));
    }

    // Create tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    sendRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hostel: user.hostel,
        block: user.block,
        roomNumber: user.roomNumber,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isVerifiedPartner: user.isVerifiedPartner,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Google Auth Validation Error:', error);
    return next(new ApiError('Google ID Token verification failed', 400));
  }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return next(new ApiError('Refresh Token not found', 401));
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ApiError('No user matches the token credentials', 401));
    }

    if (user.isBanned) {
      return next(new ApiError('User account is banned', 403));
    }

    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    return next(new ApiError('Invalid or expired Refresh Token', 401));
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res, next) => {
  res.cookie('refreshToken', 'none', {
    httpOnly: true,
    expires: new Date(Date.now() + 5 * 1000)
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};
