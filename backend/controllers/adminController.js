import User from '../models/User.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import ApiError from '../utils/apiError.js';

// @desc    Get platform analytics dashboard
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPartners = await User.countDocuments({ isVerifiedPartner: true });
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    // Revenue aggregation (total reward value processed)
    const revenueStats = await Transaction.aggregate([
      { $match: { type: 'reward_received', status: 'success' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);

    // Top 5 delivery partners by deliveries
    const topPartners = await User.find({ totalDeliveries: { $gt: 0 } })
      .select('name email averageRating totalDeliveries completionRate isVerifiedPartner')
      .sort({ totalDeliveries: -1 })
      .limit(5);

    // Orders by category breakdown
    const categoryBreakdown = await Order.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
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

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name email role averageRating totalDeliveries completionRate complaintsCount isBanned isVerifiedPartner walletBalance createdAt')
      .sort({ createdAt: -1 });

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
