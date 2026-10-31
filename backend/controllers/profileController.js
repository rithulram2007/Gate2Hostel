import User from '../models/User.js';
import Review from '../models/Review.js';
import Transaction from '../models/Transaction.js';
import ApiError from '../utils/apiError.js';
import cloudinary from 'cloudinary';

// @desc    Get current user profile
// @route   GET /api/profile/me
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details
// @route   PUT /api/profile/update
// @access  Private
export const updateProfile = async (req, res, next) => {
  const { name, hostel, block, roomNumber, phone, role } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    // Update fields
    if (name) user.name = name;
    if (hostel) user.hostel = hostel;
    if (block) user.block = block;
    if (roomNumber) user.roomNumber = roomNumber;
    if (phone) user.phone = phone;
    if (role && ['student', 'partner'].includes(role)) {
      user.role = role;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile picture
// @route   POST /api/profile/photo
// @access  Private
export const updateProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ApiError('Please upload an image file', 400));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    let photoUrl = '';

    // Handle Cloudinary upload if keys are not mocks
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'mock_cloud_name') {
      // Buffer upload helper
      const uploadFromBuffer = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            { folder: 'gate2hostel/profiles' },
            (error, result) => {
              if (result) {
                resolve(result.secure_url);
              } else {
                reject(error);
              }
            }
          );
          stream.end(req.file.buffer);
        });
      };
      
      photoUrl = await uploadFromBuffer();
    } else {
      // Local fallback representation for mock testing (encode as base64 data URI)
      const base64Image = req.file.buffer.toString('base64');
      photoUrl = `data:${req.file.mimetype};base64,${base64Image}`;
    }

    user.profilePhoto = photoUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      profilePhoto: photoUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deposit wallet amount (Simulated)
// @route   POST /api/profile/wallet/deposit
// @access  Private
export const depositWallet = async (req, res, next) => {
  const { amount } = req.body;

  // Strict input safety checks
  if (amount === undefined || amount === null || typeof amount === 'boolean' || amount === '') {
    return next(new ApiError('Please provide a valid deposit amount', 400));
  }

  const numericAmount = Number(amount);

  if (isNaN(numericAmount) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return next(new ApiError('Please provide a valid positive deposit amount', 400));
  }

  if (numericAmount > 10000) {
    return next(new ApiError('Maximum deposit amount per transaction is ₹10,000', 400));
  }

  // Normalize to 2 decimal places
  const normalizedAmount = Math.round(numericAmount * 100) / 100;

  if (normalizedAmount <= 0) {
    return next(new ApiError('Please provide a valid positive deposit amount', 400));
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    user.walletBalance = Math.round((user.walletBalance + normalizedAmount) * 100) / 100;
    await user.save();

    // Log ledger transaction
    try {
      await Transaction.create({
        user: user._id,
        amount: normalizedAmount,
        type: 'deposit',
        status: 'success',
        description: 'Wallet Top-up'
      });
    } catch (txErr) {
      // Rollback wallet balance if transaction logging fails to preserve consistency
      user.walletBalance = Math.max(0, Math.round((user.walletBalance - normalizedAmount) * 100) / 100);
      await user.save();
      throw txErr;
    }

    res.status(200).json({
      success: true,
      message: `Successfully deposited ₹${normalizedAmount} into wallet`,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pay security deposit (₹500) to become Verified Partner
// @route   POST /api/profile/partner/verify
// @access  Private
export const paySecurityDeposit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    if (user.isVerifiedPartner) {
      return next(new ApiError('You are already a Verified Partner', 400));
    }

    if (user.walletBalance < 500) {
      return next(new ApiError('Insufficient wallet balance. You need ₹500 to pay the security deposit.', 400));
    }

    // Process payment
    user.walletBalance = Math.round((user.walletBalance - 500) * 100) / 100;
    user.isVerifiedPartner = true;
    user.securityDepositPaid = true;
    await user.save();

    // Log transaction
    await Transaction.create({
      user: user._id,
      amount: -500,
      type: 'security_deposit',
      status: 'success',
      description: 'Partner Security Deposit'
    });

    res.status(200).json({
      success: true,
      message: 'Verified Partner badge activated. ₹500 security deposit paid.',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund security deposit and deactivate Verified status
// @route   POST /api/profile/partner/refund
// @access  Private
export const refundSecurityDeposit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    if (!user.isVerifiedPartner || !user.securityDepositPaid) {
      return next(new ApiError('No security deposit found to refund', 400));
    }

    // Process refund
    user.walletBalance = Math.round((user.walletBalance + 500) * 100) / 100;
    user.isVerifiedPartner = false;
    user.securityDepositPaid = false;
    await user.save();

    // Log transaction
    await Transaction.create({
      user: user._id,
      amount: 500,
      type: 'deposit_refund',
      status: 'success',
      description: 'Security Deposit Refund'
    });

    res.status(200).json({
      success: true,
      message: 'Security deposit refunded. Verified Partner badge deactivated.',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user public profile with ratings & reviews
// @route   GET /api/profile/public/:userId
// @access  Private
export const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select(
      'name email profilePhoto role hostel block roomNumber averageRating totalReviews totalDeliveries completionRate complaintsCount statusBadge isVerifiedPartner'
    );

    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    // Retrieve reviews referencing this user
    const reviews = await Review.find({ reviewee: req.params.userId })
      .select('rating comment reviewerName createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      profile: user,
      reviews
    });
  } catch (error) {
    next(error);
  }
};
