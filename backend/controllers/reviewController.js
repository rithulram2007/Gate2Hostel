import Review from '../models/Review.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';

// @desc    Submit a review for a completed order
// @route   POST /api/reviews/:orderId
// @access  Private
export const createReview = async (req, res, next) => {
  const { orderId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new ApiError('Rating must be between 1 and 5', 400));
  }

  if (comment && typeof comment === 'string' && comment.trim().length > 500) {
    return next(new ApiError('Review comment cannot exceed 500 characters', 400));
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ApiError('Order not found', 404));
    }

    if (order.status !== 'completed') {
      return next(new ApiError('Reviews can only be submitted for completed orders', 400));
    }

    const isStudent = order.student.toString() === req.user.id;
    const isPartner = order.partner && order.partner.toString() === req.user.id;

    if (!isStudent && !isPartner) {
      return next(new ApiError('Only participants of this order can leave a review', 403));
    }

    // Determine reviewee: if I'm the student, I review the partner and vice versa
    let revieweeId;
    if (isStudent) {
      revieweeId = order.partner;
    } else {
      revieweeId = order.student;
    }

    if (!revieweeId) {
      return next(new ApiError('Cannot determine the other party to review', 400));
    }

    // Check for duplicate
    const existing = await Review.findOne({ order: orderId, reviewer: req.user.id });
    if (existing) {
      return next(new ApiError('You have already reviewed this order', 400));
    }

    const reviewerUser = await User.findById(req.user.id).select('name');

    const review = await Review.create({
      order: orderId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      reviewerName: reviewerUser.name,
      rating: Number(rating),
      comment: comment || ''
    });

    // Update complaintsCount if rating is very low (1 star = auto flag)
    if (Number(rating) === 1) {
      await User.findByIdAndUpdate(revieweeId, { $inc: { complaintsCount: 1 } });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError('You have already reviewed this order', 400));
    }
    next(error);
  }
};

// @desc    Get reviews for a specific user (public profile)
// @route   GET /api/reviews/user/:userId
// @access  Private
export const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name profilePhoto')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};
