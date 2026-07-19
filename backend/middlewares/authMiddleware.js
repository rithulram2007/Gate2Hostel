import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'local_access_secret_token_123456789_gate2hostel'
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError('No user found with this id', 404));
    }

    if (user.isBanned) {
      return next(new ApiError('Your account has been banned. Please contact admin.', 403));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(`User role ${req.user.role} is not authorized to access this route`, 403)
      );
    }
    next();
  };
};
