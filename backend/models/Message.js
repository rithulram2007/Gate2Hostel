import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content cannot be empty'],
    maxLength: [1000, 'Message content cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for high-speed chronological message retrieval per order room
MessageSchema.index({ order: 1, createdAt: 1 });

const Message = mongoose.model('Message', MessageSchema);
export default Message;
