import React, { useState } from 'react';
import { FiX, FiAlertTriangle, FiCheckCircle, FiAlertCircle, FiShield } from 'react-icons/fi';
import { useAxiosPrivate } from '../../hooks/useAxiosPrivate';

export const FileComplaintModal = ({
  isOpen,
  onClose,
  reportedUser,
  orderId = null,
  orderTitle = null,
  onSuccess
}) => {
  const axiosPrivate = useAxiosPrivate();

  const [category, setCategory] = useState('Item Not Delivered');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !reportedUser) return null;

  const categories = [
    'Item Not Delivered',
    'Damaged / Spoiled Items',
    'Excessive Unexplained Delay',
    'Rude / Inappropriate Behavior',
    'Wrong Items Delivered',
    'Payment / Reward Dispute',
    'Other Platform Violation'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const fullReason = `${category}: ${description.trim()}`.trim();

    if (!description.trim()) {
      setError('Please provide specific details explaining the issue.');
      return;
    }

    if (fullReason.length > 500) {
      setError('Complaint reason must be under 500 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reportedUserId: reportedUser._id || reportedUser.id,
        reason: fullReason
      };
      if (orderId) {
        payload.orderId = orderId;
      }

      const response = await axiosPrivate.post('/complaints', payload);
      setSuccessMsg(response.data.message || 'Complaint filed successfully. Admin team will review.');

      if (onSuccess) {
        onSuccess(response.data.complaint);
      }

      setTimeout(() => {
        setDescription('');
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to file complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 w-full max-w-lg relative z-10 shadow-2xl p-6 sm:p-7 overflow-hidden space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-lg">
              <FiAlertTriangle />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                File a Complaint
              </h3>
              <p className="text-[10px] text-slate-400">
                Reports are audited directly by campus administration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Target User & Context Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Reporting User
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {reportedUser.name || 'User'}
            </span>
          </div>
          {orderTitle && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Related Order
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px] block">
                {orderTitle}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 p-3.5 rounded-xl border border-red-200/50 dark:border-red-900/30 text-xs">
            <FiAlertCircle className="flex-shrink-0 text-base" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 p-3.5 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30 text-xs">
            <FiCheckCircle className="flex-shrink-0 text-base" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Complaint Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-2">
              Issue Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    category === cat
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/15'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5">
              Detailed Description
            </label>
            <textarea
              rows="4"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe clearly what occurred, times, and any relevant context..."
              maxLength={400}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span className="flex items-center gap-1">
                <FiShield /> Reviewed under campus guidelines
              </span>
              <span>{category.length + 2 + description.length} / 500</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-600/15 transition-all flex items-center gap-1.5"
            >
              <FiAlertTriangle />
              {submitting ? 'Filing Complaint...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileComplaintModal;
