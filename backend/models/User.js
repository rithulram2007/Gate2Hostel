import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@vitstudent\.ac\.in$/,
      'Please use a valid VIT student email address (@vitstudent.ac.in)'
    ]
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Excludes password by default from queries
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ['student', 'partner', 'admin'],
    default: 'student'
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  hostel: {
    type: String,
    trim: true,
    default: ''
  },
  block: {
    type: String,
    trim: true,
    default: ''
  },
  roomNumber: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  walletBalance: {
    type: Number,
    default: 0.0,
    min: [0, 'Balance cannot be negative']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Smarter Trust Score & Verified Partner status
  isVerifiedPartner: {
    type: Boolean,
    default: false
  },
  securityDepositPaid: {
    type: Boolean,
    default: false
  },
  averageRating: {
    type: Number,
    default: 0.0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  completionRate: {
    type: Number,
    default: 100 // percentage
  },
  complaintsCount: {
    type: Number,
    default: 0
  },
  statusBadge: {
    type: String,
    enum: ['none', 'trusted', 'under_review'],
    default: 'none'
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  isActivePartner: {
    type: Boolean,
    default: false // online/offline status
  },
  isGoingToGate: {
    type: Boolean,
    default: false // Going to main gate status
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
UserSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);
export default User;
