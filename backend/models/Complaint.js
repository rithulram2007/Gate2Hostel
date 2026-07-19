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

const Complaint = mongoose.model('Complaint', ComplaintSchema);
export default Complaint;
