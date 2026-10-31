import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewerName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxLength: [500, 'Review comment cannot exceed 500 characters'],
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate reviews: one reviewer per order
ReviewSchema.index({ order: 1, reviewer: 1 }, { unique: true });
ReviewSchema.index({ reviewee: 1, createdAt: -1 });

// Static method to recalculate user average rating after save
ReviewSchema.statics.calculateAverageRating = async function (userId) {
  const stats = await this.aggregate([
    { $match: { reviewee: userId } },
    {
      $group: {
        _id: '$reviewee',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('User').findByIdAndUpdate(userId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews
    });
  } else {
    await mongoose.model('User').findByIdAndUpdate(userId, {
      averageRating: 5.0,
      totalReviews: 0
    });
  }
};

// Trigger recalculation after save
ReviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.reviewee);
});

const Review = mongoose.model('Review', ReviewSchema);
export default Review;
