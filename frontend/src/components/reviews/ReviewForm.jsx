import React, { useState } from 'react';
import { useAxiosPrivate } from '../../hooks/useAxiosPrivate';
import { FiStar, FiAlertCircle } from 'react-icons/fi';

const RATING_LABELS = {
  1: '1 - Poor',
  2: '2 - Fair',
  3: '3 - Good',
  4: '4 - Very Good',
  5: '5 - Excellent'
};

export const ReviewForm = ({ orderId, targetUser, onReviewSubmitted }) => {
  const axiosPrivate = useAxiosPrivate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const targetName = targetUser?.name || 'User';
  const targetRole = targetUser?.role === 'partner' ? 'Delivery Partner' : 'Requester / Student';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5');
      return;
    }

    if (comment.length > 500) {
      setError('Comment cannot exceed 500 characters');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosPrivate.post(`/reviews/${orderId}`, {
        rating,
        comment: comment.trim()
      });

      if (onReviewSubmitted) {
        onReviewSubmitted(response.data.review);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError(err.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg flex-shrink-0">
          <FiStar />
        </div>
        <div>
          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
            Rate {targetName} ({targetRole})
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            How was your delivery experience? Your rating updates their verified trust score on campus.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 p-3.5 rounded-2xl border border-red-200/50 dark:border-red-900/30 text-xs">
          <FiAlertCircle className="flex-shrink-0 w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Star Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={submitting}
                className="p-1 text-2xl transition-transform hover:scale-115 focus:outline-none disabled:cursor-not-allowed"
                title={`${star} Star${star > 1 ? 's' : ''}`}
              >
                <FiStar
                  className={`${
                    (hoverRating || rating) >= star
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300 dark:text-slate-700'
                  } transition-colors`}
                />
              </button>
            ))}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-2">
              {hoverRating
                ? RATING_LABELS[hoverRating]
                : rating
                ? RATING_LABELS[rating]
                : 'Click a star to rate'}
            </span>
          </div>
        </div>

        {/* Written Comment */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Written Feedback (Optional)
          </label>
          <textarea
            rows="3"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            placeholder="How was the punctuality, communication, and order condition?"
            maxLength={500}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none disabled:opacity-60"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span>Feedback is displayed on their public profile</span>
            <span className={comment.length >= 480 ? 'text-amber-500 font-bold' : ''}>
              {comment.length} / 500
            </span>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 disabled:cursor-not-allowed"
          >
            <FiStar className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting Review...' : 'Submit Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
