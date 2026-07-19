import React, { useState } from 'react';
import { FiX, FiPlus, FiAlertCircle } from 'react-icons/fi';
import { MdOutlineFastfood } from 'react-icons/md';

export const CreateOrderModal = ({ isOpen, onClose, onCreateSuccess, walletBalance }) => {
  const [formData, setFormData] = useState({
    category: 'restaurant',
    itemName: '',
    pickupLocation: '',
    dropHostel: 'MH-A',
    rewardAmount: 20,
    expectedTime: '',
    specialInstructions: ''
  });
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check reward validation
    if (Number(formData.rewardAmount) < 10) {
      setError('Reward amount must be at least ₹10');
      return;
    }

    // Check wallet balance
    if (Number(formData.rewardAmount) > walletBalance) {
      setError(`Insufficient wallet balance. You need ₹${formData.rewardAmount} but only have ₹${walletBalance}`);
      return;
    }

    // Date check
    if (new Date(formData.expectedTime) <= new Date()) {
      setError('Expected delivery time must be in the future');
      return;
    }

    setSubmitting(true);

    // Build FormData for multipart file upload
    const data = new FormData();
    data.append('category', formData.category);
    data.append('itemName', formData.itemName);
    data.append('pickupLocation', formData.pickupLocation);
    data.append('dropHostel', formData.dropHostel);
    data.append('rewardAmount', formData.rewardAmount);
    data.append('expectedTime', formData.expectedTime);
    data.append('specialInstructions', formData.specialInstructions);
    if (image) {
      data.append('image', image);
    }

    try {
      await onCreateSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-full max-w-lg relative z-10 shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MdOutlineFastfood className="text-indigo-600 dark:text-indigo-400" /> Need a Delivery?
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-lg border border-red-200/50 dark:border-red-900/30 text-xs my-4">
            <FiAlertCircle className="flex-shrink-0 text-base" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              >
                <option value="restaurant">Restaurant Food</option>
                <option value="shop">Shop / Grocery</option>
                <option value="parcel">Courier / Parcel</option>
                <option value="medicine">Medicine</option>
                <option value="others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Item Name(s)
              </label>
              <input
                type="text"
                name="itemName"
                required
                value={formData.itemName}
                onChange={handleChange}
                placeholder="Shawarma x2, Diet Coke"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Pickup From
              </label>
              <input
                type="text"
                name="pickupLocation"
                required
                value={formData.pickupLocation}
                onChange={handleChange}
                placeholder="Main Gate - Al Maza"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Drop Hostel Block
              </label>
              <select
                name="dropHostel"
                value={formData.dropHostel}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              >
                {['MH-A', 'MH-B', 'MH-C', 'MH-D', 'MH-E', 'MH-F', 'MH-G', 'MH-H', 'MH-J', 'MH-K', 'MH-L', 'MH-M', 'MH-N', 'MH-P', 'MH-Q', 'MH-R', 'MH-S', 'MH-T', 'LH-A', 'LH-B', 'LH-C', 'LH-D', 'LH-E', 'LH-F'].map((hostel) => (
                  <option key={hostel} value={hostel}>{hostel} Block</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Reward Amount (₹)
              </label>
              <input
                type="number"
                name="rewardAmount"
                required
                min="10"
                value={formData.rewardAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Expected Time
              </label>
              <input
                type="datetime-local"
                name="expectedTime"
                required
                value={formData.expectedTime}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
              Attachment Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950/40 dark:file:text-indigo-400 hover:file:bg-indigo-100"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
              Special Instructions
            </label>
            <textarea
              name="specialInstructions"
              rows="2"
              value={formData.specialInstructions}
              onChange={handleChange}
              placeholder="Call after picking up, make it spicy, etc."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs resize-none"
            ></textarea>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/15 transition-colors text-xs flex items-center gap-1"
            >
              {submitting ? 'Placing Request...' : <><FiPlus /> Post Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateOrderModal;
