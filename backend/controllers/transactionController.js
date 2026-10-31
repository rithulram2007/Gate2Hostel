import Transaction from '../models/Transaction.js';
import ApiError from '../utils/ApiError.js';

const VALID_TYPES = [
  'deposit',
  'withdrawal',
  'reward_payment',
  'reward_received',
  'security_deposit',
  'deposit_refund'
];

// @desc    Get user's transaction history (paginated, filtered, newest first)
// @route   GET /api/transactions
// @access  Private (strictly authenticated user)
export const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    // Build query strictly scoped to authenticated user ID
    const query = { user: req.user.id || req.user._id };

    // Validate type filter if provided
    if (type) {
      const typeList = String(type)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (typeList.length === 0 || !typeList.every((t) => VALID_TYPES.includes(t))) {
        return next(
          new ApiError(
            `Invalid transaction type filter. Allowed types: ${VALID_TYPES.join(', ')}`,
            400
          )
        );
      }

      query.type = typeList.length === 1 ? typeList[0] : { $in: typeList };
    }

    // Sanitize pagination inputs
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const rawLimit = parseInt(limit, 10) || 10;
    const parsedLimit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 10 : rawLimit));
    const skip = (parsedPage - 1) * parsedLimit;

    // Total count for pagination metadata
    const total = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    // Query transactions (utilizing index { user: 1, createdAt: -1 })
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate('order', 'itemName category status rewardAmount');

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};
