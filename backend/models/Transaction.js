import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'reward_payment', 'reward_received', 'security_deposit', 'deposit_refund'],
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'success'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  }
});

// Index for efficient user transaction history queries (newest first)
TransactionSchema.index({ user: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;
