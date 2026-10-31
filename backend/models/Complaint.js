import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  reason: {
    type: String,
    required: [true, 'Please describe the reason for the complaint'],
    maxLength: [500, 'Complaint reason must be under 500 characters']
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'dismissed'],
    default: 'open'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for admin filtering and user dispute lookups
ComplaintSchema.index({ status: 1, createdAt: -1 });
ComplaintSchema.index({ reportedUser: 1 });

const Complaint = mongoose.model('Complaint', ComplaintSchema);
export default Complaint;
