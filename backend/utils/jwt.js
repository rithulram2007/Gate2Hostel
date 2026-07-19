import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET || 'local_access_secret_token_123456789_gate2hostel',
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'local_refresh_secret_token_987654321_gate2hostel',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

export const sendRefreshTokenCookie = (res, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Lax works best locally across ports
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);
};
