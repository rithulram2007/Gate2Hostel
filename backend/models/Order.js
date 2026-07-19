import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  category: {
    type: String,
    enum: ['restaurant', 'shop', 'parcel', 'medicine', 'others'],
    required: [true, 'Please specify an order category']
  },
  itemName: {
    type: String,
    required: [true, 'Please specify the item name(s)']
  },
  pickupLocation: {
    type: String,
    required: [true, 'Please specify the pickup location']
  },
  dropHostel: {
    type: String,
    required: [true, 'Please specify the drop-off hostel']
  },
  rewardAmount: {
    type: Number,
    required: [true, 'Please specify the reward amount'],
    min: [10, 'Reward amount must be at least ₹10']
  },
  expectedTime: {
    type: Date,
    required: [true, 'Please specify the expected delivery time']
  },
  specialInstructions: {
    type: String,
    default: ''
  },
  attachmentImage: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'delivered_to_hostel', 'completed', 'cancelled'],
    default: 'pending'
  },
  otp: {
    type: String,
    required: true // Store secure OTP code
  },
  otpSentAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp hook on updates
OrderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Order = mongoose.model('Order', OrderSchema);
export default Order;
