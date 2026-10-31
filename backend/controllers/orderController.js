import crypto from 'crypto';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import ApiError from '../utils/apiError.js';
import cloudinary from 'cloudinary';

// Helper to generate cryptographically secure 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  const { category, itemName, pickupLocation, dropHostel, rewardAmount, expectedTime, specialInstructions } = req.body;

  // Strict input validation & boundaries
  if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
    return next(new ApiError('Please specify the item name(s)', 400));
  }
  if (itemName.trim().length > 100) {
    return next(new ApiError('Item name cannot exceed 100 characters', 400));
  }
  if (specialInstructions && typeof specialInstructions === 'string' && specialInstructions.trim().length > 500) {
    return next(new ApiError('Special instructions cannot exceed 500 characters', 400));
  }

  const requiredReward = Number(rewardAmount);
  if (isNaN(requiredReward) || requiredReward < 10) {
    return next(new ApiError('Reward amount must be at least ₹10', 400));
  }

  let escrowDeducted = false;
  let createdOrder = null;

  try {
    // Atomic escrow deduction: only succeeds if balance >= requiredReward
    const student = await User.findOneAndUpdate(
      { _id: req.user.id, walletBalance: { $gte: requiredReward } },
      { $inc: { walletBalance: -requiredReward } },
      { new: true }
    );

    if (!student) {
      return next(new ApiError('Insufficient wallet balance. Please deposit funds first.', 400));
    }
    escrowDeducted = true;

    // Handle image upload if present
    let attachmentImage = '';
    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'mock_cloud_name') {
        const uploadFromBuffer = () => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
              { folder: 'gate2hostel/orders' },
              (error, result) => {
                if (result) resolve(result.secure_url);
                else reject(error);
              }
            );
            stream.end(req.file.buffer);
          });
        };
        attachmentImage = await uploadFromBuffer();
      } else {
        // Base64 mock fallback
        const base64Image = req.file.buffer.toString('base64');
        attachmentImage = `data:${req.file.mimetype};base64,${base64Image}`;
      }
    }

    const otp = generateOTP();

    // Create Order
    createdOrder = await Order.create({
      student: req.user.id,
      category,
      itemName: itemName.trim(),
      pickupLocation,
      dropHostel,
      rewardAmount: requiredReward,
      expectedTime,
      specialInstructions: specialInstructions ? specialInstructions.trim() : '',
      attachmentImage,
      otp,
      otpAttempts: 0,
      otpSentAt: new Date(),
      status: 'pending'
    });

    // Create transaction log
    await Transaction.create({
      user: req.user.id,
      amount: -requiredReward,
      type: 'reward_payment',
      order: createdOrder._id,
      status: 'success',
      description: 'Order Reward Escrow'
    });

    // Emit live order feed update to all online users
    req.io.emit('order_created', {
      id: createdOrder._id,
      category,
      itemName: createdOrder.itemName,
      pickupLocation,
      dropHostel,
      rewardAmount: requiredReward,
      expectedTime
    });

    res.status(201).json({
      success: true,
      message: 'Order created and reward locked successfully',
      order: createdOrder
    });

  } catch (error) {
    if (createdOrder) {
      await Order.findByIdAndDelete(createdOrder._id).catch(() => {});
    }
    if (escrowDeducted) {
      // Rollback escrow if order creation or transaction logging failed
      await User.findByIdAndUpdate(req.user.id, { $inc: { walletBalance: requiredReward } });
    }
    next(error);
  }
};

// @desc    Get all orders (with filters, pagination & sorting)
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res, next) => {
  const { category, dropHostel, status, search, minReward, page = 1, limit = 10, sortBy = 'newest' } = req.query;

  try {
    let query = {};

    // Public discovery feed is strictly for pending orders for normal users
    if (req.user && req.user.role === 'admin' && status && typeof status === 'string') {
      query.status = status;
    } else {
      query.status = 'pending'; // Normal users strictly discover pending requests
    }

    if (category && typeof category === 'string' && category !== 'all') {
      query.category = category;
    }

    if (dropHostel && typeof dropHostel === 'string' && dropHostel !== 'all') {
      // Support grouped hostel prefix filters (group_mh -> /^MH-/, group_lh -> /^LH-/)
      if (dropHostel === 'group_mh') {
        query.dropHostel = { $regex: '^MH-', $options: 'i' };
      } else if (dropHostel === 'group_lh') {
        query.dropHostel = { $regex: '^LH-', $options: 'i' };
      } else {
        query.dropHostel = { $regex: `^${dropHostel.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
      }
    }

    if (minReward && !isNaN(Number(minReward))) {
      const minVal = Math.max(0, Number(minReward));
      query.rewardAmount = { $gte: minVal };
    }

    // Search query with 100 character length restriction & regex injection escaping
    if (search && typeof search === 'string') {
      if (search.trim().length > 100) {
        return next(new ApiError('Search query cannot exceed 100 characters', 400));
      }
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (sanitizedSearch) {
        query.$or = [
          { itemName: { $regex: sanitizedSearch, $options: 'i' } },
          { pickupLocation: { $regex: sanitizedSearch, $options: 'i' } },
          { dropHostel: { $regex: sanitizedSearch, $options: 'i' } }
        ];
      }
    }

    // Whitelist backend sorting
    const SORT_MAP = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      reward_desc: { rewardAmount: -1, createdAt: -1 },
      reward_asc: { rewardAmount: 1, createdAt: -1 }
    };
    const sortKey = (sortBy && typeof sortBy === 'string' && SORT_MAP[sortBy]) ? sortBy : 'newest';
    const sortObject = SORT_MAP[sortKey];

    // Sanitize pagination inputs
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const rawLimit = parseInt(limit, 10) || 10;
    const parsedLimit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 10 : rawLimit));
    const skip = (parsedPage - 1) * parsedLimit;

    // Total count for pagination metadata
    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    // Execute query with OTP projection exclusion, sorting, pagination, and lean()
    const orders = await Order.find(query)
      .select('-otp')
      .populate('student', 'name averageRating isVerifiedPartner')
      .sort(sortObject)
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages
      },
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('+otp')
      .populate('student', 'name phone hostel block roomNumber averageRating totalDeliveries isVerifiedPartner')
      .populate('partner', 'name phone averageRating completionRate totalDeliveries isVerifiedPartner');

    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    // Security check: Only the involved student, partner, or admin can inspect accepted orders
    const isOwner = order.student._id.toString() === req.user.id;
    const isPartner = order.partner && order.partner._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (order.status !== 'pending' && !isOwner && !isPartner && !isAdmin) {
      return next(new ApiError('Not authorized to view this order details', 403));
    }

    // Clean response: Exclude OTP if caller is not the owner (Student) or Admin
    const responseOrder = order.toObject();
    if (!isOwner && !isAdmin) {
      delete responseOrder.otp;
    }

    res.status(200).json({
      success: true,
      order: responseOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept order
// @route   PUT /api/orders/:id/accept
// @access  Private
export const acceptOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    if (order.status !== 'pending') {
      return next(new ApiError('Order is no longer available', 400));
    }

    // Safety: Cannot accept own order
    if (order.student.toString() === req.user.id) {
      return next(new ApiError('You cannot accept your own delivery request', 400));
    }

    // Update order
    order.partner = req.user.id;
    order.status = 'accepted';
    await order.save();

    // Trigger real-time order acceptance alert
    req.io.to(order._id.toString()).emit('order_status_change', {
      orderId: order._id,
      status: 'accepted',
      partnerId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete order via OTP verification
// @route   PUT /api/orders/:id/complete
// @access  Private
export const completeOrder = async (req, res, next) => {
  const { otp } = req.body;

  if (!otp || (typeof otp !== 'string' && typeof otp !== 'number')) {
    return next(new ApiError('Verification OTP is required', 400));
  }

  const cleanOtp = String(otp).trim();

  try {
    const order = await Order.findById(req.params.id).select('+otp');
    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    if (order.status !== 'accepted' && order.status !== 'delivered_to_hostel') {
      return next(new ApiError('Order cannot be completed in its current state', 400));
    }

    // Verify caller is the assigned partner
    if (!order.partner || order.partner.toString() !== req.user.id) {
      return next(new ApiError('Only the assigned delivery partner can submit verification', 403));
    }

    // Check if OTP verification is locked due to excessive failed attempts
    if (order.otpAttempts >= 5) {
      return next(new ApiError('Verification locked: Maximum OTP attempts exceeded for this order', 400));
    }

    // Enforce strict 30-minute validity window
    const OTP_EXPIRY_MS = 30 * 60 * 1000;
    const otpAge = Date.now() - new Date(order.otpSentAt || order.createdAt).getTime();
    if (otpAge > OTP_EXPIRY_MS) {
      return next(new ApiError('Verification OTP has expired. Please contact support or order creator.', 400));
    }

    // Compare OTP
    if (order.otp !== cleanOtp) {
      order.otpAttempts = (order.otpAttempts || 0) + 1;
      await order.save();
      const remaining = Math.max(0, 5 - order.otpAttempts);
      return next(new ApiError(
        order.otpAttempts >= 5
          ? 'Invalid verification OTP. Maximum attempts exceeded. Completion is locked.'
          : `Invalid verification OTP. ${remaining} attempt(s) remaining.`,
        400
      ));
    }

    // OTP matched! Atomically transition order status
    const completedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['accepted', 'delivered_to_hostel'] } },
      { $set: { status: 'completed', otpAttempts: 0 } },
      { new: true }
    );

    if (!completedOrder) {
      return next(new ApiError('Order cannot be completed in its current state or was already completed', 400));
    }

    // Atomic update to Partner profile - add reward funds & update deliveries
    const partnerUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $inc: {
          walletBalance: completedOrder.rewardAmount,
          totalDeliveries: 1
        }
      },
      { new: true }
    );
    
    // Recalculate partner completion rate
    const allAccepted = await Order.countDocuments({ partner: req.user.id });
    const allCompleted = await Order.countDocuments({ partner: req.user.id, status: 'completed' });
    partnerUser.completionRate = Math.round((allCompleted / allAccepted) * 100) || 100;
    
    // Assign trusted badges if they reach high performance
    if (partnerUser.totalDeliveries >= 10 && partnerUser.averageRating >= 4.7 && partnerUser.completionRate >= 95) {
      partnerUser.statusBadge = 'trusted';
    }

    await partnerUser.save();

    // Create reward transaction record for partner
    await Transaction.create({
      user: req.user.id,
      amount: completedOrder.rewardAmount,
      type: 'reward_received',
      order: completedOrder._id,
      status: 'success',
      description: 'Delivery Reward Received'
    });

    // Notify student via sockets
    req.io.to(completedOrder._id.toString()).emit('order_status_change', {
      orderId: completedOrder._id,
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      message: 'Order verified and completed. Wallet payout completed.',
      order: completedOrder
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    const isStudent = order.student.toString() === req.user.id;
    const isPartner = order.partner && order.partner.toString() === req.user.id;

    if (!isStudent && !isPartner) {
      return next(new ApiError('Not authorized to cancel this order', 403));
    }

    // Scenario 1: Pending order - Student cancels
    if (order.status === 'pending') {
      if (!isStudent) {
        return next(new ApiError('Only the student who placed the order can cancel it', 403));
      }

      const cancelledOrder = await Order.findOneAndUpdate(
        { _id: req.params.id, status: 'pending' },
        { $set: { status: 'cancelled' } },
        { new: true }
      );

      if (!cancelledOrder) {
        return next(new ApiError('Order cannot be cancelled in its current state', 400));
      }

      // Atomic refund reward to student wallet
      await User.findByIdAndUpdate(req.user.id, { $inc: { walletBalance: cancelledOrder.rewardAmount } });

      // Log refund transaction
      await Transaction.create({
        user: req.user.id,
        amount: cancelledOrder.rewardAmount,
        type: 'deposit_refund',
        order: cancelledOrder._id,
        status: 'success',
        description: 'Order Reward Refund'
      });

      req.io.emit('order_cancelled', { orderId: cancelledOrder._id });

      return res.status(200).json({
        success: true,
        message: 'Order cancelled. Reward refunded to wallet.',
        order: cancelledOrder
      });
    }

    // Scenario 2: Accepted order - Partner cancels (reverts back to pending, penalizes partner)
    if (order.status === 'accepted') {
      if (isPartner) {
        // Revert to pending
        const revertedOrder = await Order.findOneAndUpdate(
          { _id: req.params.id, status: 'accepted' },
          { $set: { status: 'pending', partner: null } },
          { new: true }
        );

        if (!revertedOrder) {
          return next(new ApiError('Order cannot be cancelled in its current state', 400));
        }

        // Penalize partner completion score
        const partnerUser = await User.findById(req.user.id);
        const allAccepted = await Order.countDocuments({ partner: req.user.id });
        const allCompleted = await Order.countDocuments({ partner: req.user.id, status: 'completed' });
        partnerUser.completionRate = Math.round((allCompleted / allAccepted) * 100) || 0;
        
        // Remove trusted badge if score falls below criteria
        if (partnerUser.completionRate < 95) {
          partnerUser.statusBadge = 'none';
        }
        await partnerUser.save();

        req.io.to(revertedOrder._id.toString()).emit('order_status_change', {
          orderId: revertedOrder._id,
          status: 'pending'
        });

        // Broadcast to public feed that it is active again
        req.io.emit('order_created', {
          id: revertedOrder._id,
          category: revertedOrder.category,
          itemName: revertedOrder.itemName,
          pickupLocation: revertedOrder.pickupLocation,
          dropHostel: revertedOrder.dropHostel,
          rewardAmount: revertedOrder.rewardAmount,
          expectedTime: revertedOrder.expectedTime
        });

        return res.status(200).json({
          success: true,
          message: 'Delivery cancelled. Request returned to public feed. Completion rating penalized.',
          order: revertedOrder
        });
      }

      if (isStudent) {
        // Student cancels an already accepted order
        const cancelledOrder = await Order.findOneAndUpdate(
          { _id: req.params.id, status: 'accepted' },
          { $set: { status: 'cancelled' } },
          { new: true }
        );

        if (!cancelledOrder) {
          return next(new ApiError('Order cannot be cancelled in its current state', 400));
        }

        // Atomic refund reward to student wallet
        await User.findByIdAndUpdate(cancelledOrder.student, { $inc: { walletBalance: cancelledOrder.rewardAmount } });

        // Log refund
        await Transaction.create({
          user: cancelledOrder.student,
          amount: cancelledOrder.rewardAmount,
          type: 'deposit_refund',
          order: cancelledOrder._id,
          status: 'success',
          description: 'Order Reward Refund'
        });

        req.io.to(cancelledOrder._id.toString()).emit('order_status_change', {
          orderId: cancelledOrder._id,
          status: 'cancelled'
        });

        return res.status(200).json({
          success: true,
          message: 'Accepted order cancelled. Reward refunded to student wallet.',
          order: cancelledOrder
        });
      }
    }

    return next(new ApiError('Completed or already cancelled orders cannot be modified', 400));

  } catch (error) {
    next(error);
  }
};

// @desc    Get active orders history for logged in user (both student & partner views)
// @route   GET /api/orders/user/history
// @access  Private
export const getUserOrderHistory = async (req, res, next) => {
  try {
    const rawOrders = await Order.find({
      $or: [
        { student: req.user.id },
        { partner: req.user.id }
      ]
    })
    .select('+otp')
    .populate('student', 'name email')
    .populate('partner', 'name email')
    .sort({ createdAt: -1 })
    .lean();

    // Only allow student owner to receive their own OTP code
    const orders = rawOrders.map((order) => {
      const isOwner =
        (order.student?._id ? order.student._id.toString() : order.student?.toString()) === req.user.id;
      if (!isOwner) {
        delete order.otp;
      }
      return order;
    });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};
