import React from 'react';
import { FiStar, FiCheck } from 'react-icons/fi';

export const ReviewCard = ({ review, isOwnReview = false, targetName = '' }) => {
  if (!review) return null;

  const reviewerName = review.reviewerName || review.reviewer?.name || 'Anonymous';
  const reviewerPhoto = review.reviewer?.profilePhoto;
  const rating = Number(review.rating) || 5;
  const comment = review.comment?.trim();

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {isOwnReview ? (
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg flex-shrink-0">
              <FiStar className="fill-amber-500" />
            </div>
          ) : (
            <img
              src={reviewerPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${reviewerName}`}
              alt={reviewerName}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
            />
          )}

          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white">
              {isOwnReview ? `Your Review for ${targetName || 'User'}` : reviewerName}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Submitted on {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        {isOwnReview && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200/40 dark:border-emerald-800/40">
            <FiCheck className="w-3 h-3" /> Submitted
          </span>
        )}
      </div>

      {/* Rating & Comment */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <FiStar
              key={star}
              className={`text-base sm:text-lg ${
                star <= rating
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-slate-200 dark:text-slate-700'
              }`}
            />
          ))}
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">
            {rating} / 5 Stars
          </span>
        </div>

        {comment ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
            "{comment}"
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic pl-1">
            No written comment provided.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
