import Message from '../models/Message.js';
import Order from '../models/Order.js';
import ApiError from '../utils/apiError.js';

// @desc    Get historical chat messages for an order room
// @route   GET /api/chat/:orderId
// @access  Private
export const getChatMessages = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    // Auth Check
    const isOwner = order.student.toString() === req.user.id;
    const isPartner = order.partner && order.partner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isPartner && !isAdmin) {
      return next(new ApiError('You are not authorized to view this room chat history', 403));
    }

    const messages = await Message.find({ order: orderId })
      .populate('sender', 'name profilePhoto')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post message to order room chat
// @route   POST /api/chat/:orderId
// @access  Private
export const sendChatMessage = async (req, res, next) => {
  const { orderId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return next(new ApiError('Content content cannot be blank', 400));
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    // Auth Check
    const isOwner = order.student.toString() === req.user.id;
    const isPartner = order.partner && order.partner.toString() === req.user.id;

    if (!isOwner && !isPartner) {
      return next(new ApiError('You are not authorization to send messages to this order', 403));
    }

    const message = await Message.create({
      order: orderId,
      sender: req.user.id,
      content: content.trim()
    });

    const populated = await Message.findById(message._id).populate('sender', 'name profilePhoto');

    // Broadcast live event in order rooms
    req.io.to(orderId).emit('new_message', populated);

    res.status(201).json({
      success: true,
      message: populated
    });
  } catch (error) {
    next(error);
  }
};
export default { getChatMessages, sendChatMessage };
