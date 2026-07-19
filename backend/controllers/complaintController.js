import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';

// @desc    File a complaint against another user
// @route   POST /api/complaints
// @access  Private
export const fileComplaint = async (req, res, next) => {
  const { reportedUserId, orderId, reason } = req.body;

  if (!reportedUserId || !reason) {
    return next(new ApiError('Reported user and reason are required', 400));
  }

  try {
    // Prevent self-reporting
    if (reportedUserId === req.user.id) {
      return next(new ApiError('You cannot file a complaint against yourself', 400));
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return next(new ApiError('Reported user not found', 404));
    }

    const complaint = await Complaint.create({
      reporter: req.user.id,
      reportedUser: reportedUserId,
      order: orderId || null,
      reason
    });

    // Increment complaints count on reported user
    reportedUser.complaintsCount += 1;
    await reportedUser.save();

    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully. Our admin team will review it.',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints (Admin only)
// @route   GET /api/complaints
// @access  Private/Admin
export const getComplaints = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const complaints = await Complaint.find(query)
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email complaintsCount isBanned')
      .populate('order', 'itemName category status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status (Admin only)
// @route   PUT /api/complaints/:id
// @access  Private/Admin
export const updateComplaintStatus = async (req, res, next) => {
  const { status, adminNotes } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ApiError('Complaint not found', 404));
    }

    if (status) complaint.status = status;
    if (adminNotes) complaint.adminNotes = adminNotes;
    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Complaint updated',
      complaint
    });
  } catch (error) {
    next(error);
  }
};
