import Order from '../models/Order.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import ApiError from '../utils/apiError.js';
import cloudinary from 'cloudinary';

// Helper to generate secure OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  const { category, itemName, pickupLocation, dropHostel, rewardAmount, expectedTime, specialInstructions } = req.body;

  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return next(new ApiError('Student profile not found', 404));
    }

    // Verify wallet has enough funds for the reward
    const requiredReward = Number(rewardAmount);
    if (student.walletBalance < requiredReward) {
      return next(new ApiError('Insufficient wallet balance. Please deposit funds first.', 400));
    }

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

    // Deduct reward from student wallet
    student.walletBalance -= requiredReward;
    await student.save();

    // Create Order
    const order = await Order.create({
      student: req.user.id,
      category,
      itemName,
      pickupLocation,
      dropHostel,
      rewardAmount: requiredReward,
      expectedTime,
      specialInstructions: specialInstructions || '',
      attachmentImage,
      otp,
      status: 'pending'
    });

    // Create transaction log
    await Transaction.create({
      user: req.user.id,
      amount: -requiredReward,
      type: 'reward_payment',
      order: order._id,
      status: 'success',
      description: 'Order Reward Escrow'
    });

    // Emit live order feed update to all online users
    req.io.emit('order_created', {
      id: order._id,
      category,
      itemName,
      pickupLocation,
      dropHostel,
      rewardAmount: requiredReward,
      expectedTime
    });

    res.status(201).json({
      success: true,
      message: 'Order created and reward locked successfully',
      order
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (with filters)
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res, next) => {
  const { category, dropHostel, status, search, minReward } = req.query;

  try {
    let query = {};

    // Filters
    if (status) {
      query.status = status;
    } else {
      query.status = 'pending'; // Default to active requests
    }

    if (category) {
      query.category = category;
    }

    if (dropHostel) {
      query.dropHostel = dropHostel;
    }

    if (minReward) {
      query.rewardAmount = { $gte: Number(minReward) };
    }

    // Search query on item names/pickup points
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { pickupLocation: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('student', 'name averageRating isVerifiedPartner')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
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

  if (!otp) {
    return next(new ApiError('Verification OTP is required', 400));
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    if (order.status !== 'accepted' && order.status !== 'delivered_to_hostel') {
      return next(new ApiError('Order cannot be completed in its current state', 400));
    }

    // Verify caller is the assigned partner
    if (order.partner.toString() !== req.user.id) {
      return next(new ApiError('Only the assigned delivery partner can submit verification', 403));
    }

    // Compare OTP
    if (order.otp !== otp) {
      return next(new ApiError('Invalid verification OTP. Delivery completion rejected.', 400));
    }

    // OTP matched! Change status
    order.status = 'completed';
    await order.save();

    // Update Partner profile - add reward funds & update analytics
    const partnerUser = await User.findById(req.user.id);
    partnerUser.walletBalance += order.rewardAmount;
    partnerUser.totalDeliveries += 1;
    
    // Recalculate partner completion rate (in MERN, simple score updates)
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
      amount: order.rewardAmount,
      type: 'reward_received',
      order: order._id,
      status: 'success',
      description: 'Delivery Reward Received'
    });

    // Notify student via sockets
    req.io.to(order._id.toString()).emit('order_status_change', {
      orderId: order._id,
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      message: 'Order verified and completed. Wallet payout completed.',
      order
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

      order.status = 'cancelled';
      await order.save();

      // Refund reward to student wallet
      const studentUser = await User.findById(req.user.id);
      studentUser.walletBalance += order.rewardAmount;
      await studentUser.save();

      // Log refund transaction
      await Transaction.create({
        user: req.user.id,
        amount: order.rewardAmount,
        type: 'deposit_refund',
        order: order._id,
        status: 'success',
        description: 'Order Reward Refund'
      });

      req.io.emit('order_cancelled', { orderId: order._id });

      return res.status(200).json({
        success: true,
        message: 'Order cancelled. Reward refunded to wallet.',
        order
      });
    }

    // Scenario 2: Accepted order - Partner cancels (reverts back to pending, penalizes partner)
    if (order.status === 'accepted') {
      if (isPartner) {
        // Revert to pending
        order.partner = null;
        order.status = 'pending';
        await order.save();

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

        req.io.to(order._id.toString()).emit('order_status_change', {
          orderId: order._id,
          status: 'pending'
        });

        // Broadcast to public feed that it is active again
        req.io.emit('order_created', {
          id: order._id,
          category: order.category,
          itemName: order.itemName,
          pickupLocation: order.pickupLocation,
          dropHostel: order.dropHostel,
          rewardAmount: order.rewardAmount,
          expectedTime: order.expectedTime
        });

        return res.status(200).json({
          success: true,
          message: 'Delivery cancelled. Request returned to public feed. Completion rating penalized.',
          order
        });
      }

      if (isStudent) {
        // Student cancels an already accepted order
        order.status = 'cancelled';
        await order.save();

        // Refund reward to student wallet
        const studentUser = await User.findById(order.student);
        studentUser.walletBalance += order.rewardAmount;
        await studentUser.save();

        // Log refund
        await Transaction.create({
          user: order.student,
          amount: order.rewardAmount,
          type: 'deposit_refund',
          order: order._id,
          status: 'success',
          description: 'Order Reward Refund'
        });

        req.io.to(order._id.toString()).emit('order_status_change', {
          orderId: order._id,
          status: 'cancelled'
        });

        return res.status(200).json({
          success: true,
          message: 'Accepted order cancelled. Reward refunded to student wallet.',
          order
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
    const orders = await Order.find({
      $or: [
        { student: req.user.id },
        { partner: req.user.id }
      ]
    })
    .populate('student', 'name email')
    .populate('partner', 'name email')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};
