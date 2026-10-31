import User from '../models/User.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import ApiError from '../utils/apiError.js';

// @desc    Get platform analytics dashboard
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalPartners,
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      revenueStats,
      topPartners,
      categoryBreakdown
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerifiedPartner: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ status: 'pending' }),
      Transaction.aggregate([
        { $match: { type: 'reward_received', status: 'success' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),
      User.find({ totalDeliveries: { $gt: 0 } })
        .select('name email averageRating totalDeliveries completionRate isVerifiedPartner')
        .sort({ totalDeliveries: -1 })
        .limit(5)
        .lean(),
      Order.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalPartners,
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        topPartners,
        categoryBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    let query = {};

    if (role && typeof role === 'string') query.role = role;
    if (search && typeof search === 'string') {
      if (search.trim().length > 100) {
        return next(new ApiError('Search query cannot exceed 100 characters', 400));
      }
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (sanitizedSearch) {
        query.$or = [
          { name: { $regex: sanitizedSearch, $options: 'i' } },
          { email: { $regex: sanitizedSearch, $options: 'i' } }
        ];
      }
    }

    const users = await User.find(query)
      .select('name email role averageRating totalDeliveries completionRate complaintsCount isBanned isVerifiedPartner walletBalance createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ban/Unban a user
// @route   PUT /api/admin/users/:userId/ban
// @access  Private/Admin
export const toggleBanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    // Prevent admin from banning themselves
    if (user._id.toString() === req.user.id) {
      return next(new ApiError('You cannot ban yourself', 400));
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isBanned ? `User ${user.name} has been banned` : `User ${user.name} has been unbanned`,
      user
    });
  } catch (error) {
    next(error);
  }
};
