import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { FiStar, FiShield, FiTrendingUp, FiEdit3, FiSave, FiArrowLeft, FiSun, FiMoon, FiAlertCircle } from 'react-icons/fi';
import { MdOutlineDeliveryDining } from 'react-icons/md';

export const Profile = () => {
  const { userId } = useParams();
  const { user, updateUserInfo, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const axiosPrivate = useAxiosPrivate();

  const isOwnProfile = !userId || userId === user?._id;

  const [profileData, setProfileData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', hostel: '', block: '', roomNumber: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isOwnProfile) {
          const res = await axiosPrivate.get('/profile/me');
          setProfileData(res.data.user);
          setEditForm({
            name: res.data.user.name || '',
            phone: res.data.user.phone || '',
            hostel: res.data.user.hostel || 'MH',
            block: res.data.user.block || 'A',
            roomNumber: res.data.user.roomNumber || ''
          });
        } else {
          const res = await axiosPrivate.get(`/profile/public/${userId}`);
          setProfileData(res.data.profile);
          setReviews(res.data.reviews);
        }
      } catch (err) {
        setError('Failed to load profile');
      }
    };

    if (!isOwnProfile) {
      const fetchReviews = async () => {
        try {
          const res = await axiosPrivate.get(`/reviews/user/${userId}`);
          setReviews(res.data.reviews);
        } catch (err) { /* ignore */ }
      };
      fetchProfile();
      fetchReviews();
    } else {
      fetchProfile();
      // Fetch own reviews
      const fetchOwnReviews = async () => {
        try {
          const res = await axiosPrivate.get(`/reviews/user/${user._id}`);
          setReviews(res.data.reviews);
        } catch (err) { /* ignore */ }
      };
      fetchOwnReviews();
    }
  }, [userId, isOwnProfile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await axiosPrivate.put('/profile/update', editForm);
      setProfileData(res.data.user);
      updateUserInfo(res.data.user);
      setSuccess('Profile updated!');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const displayUser = profileData || user;
  if (!displayUser) return null;

  const trustScore = (
    ((displayUser.averageRating || 5) / 5) * 40 +
    (Math.min(displayUser.totalDeliveries || 0, 50) / 50) * 30 +
    ((displayUser.completionRate || 100) / 100) * 20 +
    (displayUser.complaintsCount === 0 ? 10 : Math.max(0, 10 - displayUser.complaintsCount * 2))
  ).toFixed(0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors text-sm font-semibold">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-all">
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 p-3 rounded-xl text-sm">
            <FiAlertCircle /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 p-3 rounded-xl text-sm">
            <FiShield /> {success}
          </div>
        )}

        {/* Profile Card */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src={displayUser.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${displayUser.name}`}
              alt="Avatar"
              className="w-24 h-24 rounded-3xl object-cover border-2 border-slate-200 dark:border-slate-800 shadow-lg"
            />
            <div className="text-center sm:text-left flex-grow">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 justify-center sm:justify-start">
                {displayUser.name}
                {displayUser.isVerifiedPartner && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase">Verified ✓</span>
                )}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{displayUser.email}</p>
              {displayUser.hostel && (
                <p className="text-xs text-slate-400 mt-1">
                  {displayUser.hostel}-{displayUser.block} Block, Room {displayUser.roomNumber}
                </p>
              )}
            </div>
            {isOwnProfile && !editing && (
              <button onClick={() => setEditing(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all">
                <FiEdit3 /> Edit Profile
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isOwnProfile && editing && (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Room No</label>
                <input type="text" value={editForm.roomNumber} onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="col-span-2 sm:col-span-3 flex gap-3 justify-end">
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"><FiSave /> Save</button>
              </div>
            </form>
          )}
        </div>

        {/* Smart Trust Score Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 to-purple-900 text-white shadow-xl">
          <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-4">Smart Trust Score</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-center">
            <div>
              <p className="text-3xl font-black">{trustScore}<span className="text-lg">/100</span></p>
              <p className="text-[10px] text-indigo-300 uppercase mt-1">Trust Score</p>
            </div>
            <div>
              <p className="text-2xl font-black flex items-center justify-center gap-1">⭐ {(displayUser.averageRating || 5).toFixed(1)}</p>
              <p className="text-[10px] text-indigo-300 uppercase mt-1">Rating</p>
            </div>
            <div>
              <p className="text-2xl font-black">{displayUser.totalDeliveries || 0}</p>
              <p className="text-[10px] text-indigo-300 uppercase mt-1">Deliveries</p>
            </div>
            <div>
              <p className="text-2xl font-black">{displayUser.completionRate || 100}%</p>
              <p className="text-[10px] text-indigo-300 uppercase mt-1">Success Rate</p>
            </div>
            <div>
              <p className="text-2xl font-black">{displayUser.complaintsCount || 0}</p>
              <p className="text-[10px] text-indigo-300 uppercase mt-1">Complaints</p>
            </div>
          </div>
        </div>

        {/* Public Reviews Section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
          <h3 className="font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <FiStar className="text-amber-500" /> Public Reviews ({reviews.length})
          </h3>

          {reviews.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={rev.reviewer?.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${rev.reviewerName || rev.reviewer?.name || 'U'}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {rev.reviewerName || rev.reviewer?.name || 'Anonymous'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          className={`text-sm ${i < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-10">"{rev.comment}"</p>
                  )}
                  <p className="text-[10px] text-slate-400 pl-10">{new Date(rev.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
export default Profile;
