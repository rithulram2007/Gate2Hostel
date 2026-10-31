import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useAxiosPrivate } from '../hooks/useAxiosPrivate';
import {
  FiUsers,
  FiAlertTriangle,
  FiTrendingUp,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiRefreshCw,
  FiArrowLeft,
  FiSun,
  FiMoon,
  FiDollarSign,
  FiPackage,
  FiStar,
  FiAward,
  FiExternalLink,
  FiEdit3,
  FiSave,
  FiX,
  FiUserCheck,
  FiUserX,
  FiClock
} from 'react-icons/fi';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';

export const Admin = () => {
  const { user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const axiosPrivate = useAxiosPrivate();

  // Active Tab: 'overview' | 'users' | 'complaints'
  const [activeTab, setActiveTab] = useState('overview');

  // Overview / Analytics States
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Users Directory States
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Complaints States
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('all');

  // Shared Action & Feedback States
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Ban Confirmation Modal State
  const [banModal, setBanModal] = useState({
    isOpen: false,
    user: null
  });

  // Complaint Resolution Modal State
  const [resolutionModal, setResolutionModal] = useState({
    isOpen: false,
    complaint: null,
    status: 'open',
    adminNotes: ''
  });

  // ==========================================
  // DATA FETCHING
  // ==========================================

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await axiosPrivate.get('/admin/analytics');
      if (res.data?.success) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load platform analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [axiosPrivate]);

  const fetchUsers = useCallback(async (searchQuery = '', roleQuery = 'all') => {
    setLoadingUsers(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleQuery !== 'all') params.role = roleQuery;

      const res = await axiosPrivate.get('/admin/users', { params });
      if (res.data?.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load user directory.');
    } finally {
      setLoadingUsers(false);
    }
  }, [axiosPrivate]);

  const fetchComplaints = useCallback(async (statusQuery = 'all') => {
    setLoadingComplaints(true);
    try {
      const params = {};
      if (statusQuery !== 'all') params.status = statusQuery;

      const res = await axiosPrivate.get('/complaints', { params });
      if (res.data?.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load complaints queue.');
    } finally {
      setLoadingComplaints(false);
    }
  }, [axiosPrivate]);

  // Initial Load & Tab Switching
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
    } else if (activeTab === 'users') {
      fetchUsers(userSearch, userRoleFilter);
    } else if (activeTab === 'complaints') {
      fetchComplaints(complaintStatusFilter);
    }
  }, [activeTab, fetchAnalytics, fetchUsers, fetchComplaints, userSearch, userRoleFilter, complaintStatusFilter]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // Handle Search Input Submission
  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(userSearch, userRoleFilter);
  };

  // Handle User Role Filter Change
  const handleRoleFilterChange = (role) => {
    setUserRoleFilter(role);
    fetchUsers(userSearch, role);
  };

  // Handle Complaint Status Filter Change
  const handleComplaintStatusChange = (status) => {
    setComplaintStatusFilter(status);
    fetchComplaints(status);
  };

  // ==========================================
  // BAN / UNBAN ACTION
  // ==========================================

  const handleOpenBanModal = (targetUser) => {
    setBanModal({ isOpen: true, user: targetUser });
  };

  const handleCloseBanModal = () => {
    setBanModal({ isOpen: false, user: null });
  };

  const handleConfirmBanToggle = async () => {
    if (!banModal.user) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axiosPrivate.put(`/admin/users/${banModal.user._id}/ban`);
      if (res.data?.success) {
        const updatedUser = res.data.user;
        setSuccessMsg(res.data.message || `User ${updatedUser.name} status updated.`);

        // Update local users list immediately
        setUsers((prev) =>
          prev.map((u) => (u._id === updatedUser._id ? { ...u, isBanned: updatedUser.isBanned } : u))
        );

        // Also update resolutionModal if currently viewing a complaint by/against this user
        if (resolutionModal.isOpen && resolutionModal.complaint) {
          if (resolutionModal.complaint.reportedUser?._id === updatedUser._id) {
            setResolutionModal((prev) => ({
              ...prev,
              complaint: {
                ...prev.complaint,
                reportedUser: {
                  ...prev.complaint.reportedUser,
                  isBanned: updatedUser.isBanned
                }
              }
            }));
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update user ban status.');
    } finally {
      setActionLoading(false);
      handleCloseBanModal();
    }
  };

  // ==========================================
  // COMPLAINT RESOLUTION ACTION
  // ==========================================

  const handleOpenResolutionModal = (complaint) => {
    setResolutionModal({
      isOpen: true,
      complaint,
      status: complaint.status || 'open',
      adminNotes: complaint.adminNotes || ''
    });
  };

  const handleCloseResolutionModal = () => {
    setResolutionModal({
      isOpen: false,
      complaint: null,
      status: 'open',
      adminNotes: ''
    });
  };

  const handleSaveComplaintResolution = async (e) => {
    e.preventDefault();
    if (!resolutionModal.complaint) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axiosPrivate.put(`/complaints/${resolutionModal.complaint._id}`, {
        status: resolutionModal.status,
        adminNotes: resolutionModal.adminNotes.trim()
      });

      if (res.data?.success) {
        const updatedComplaint = res.data.complaint;
        setSuccessMsg(res.data.message || 'Complaint resolution updated successfully.');

        // Update local complaints state immediately
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === updatedComplaint._id
              ? {
                  ...c,
                  status: updatedComplaint.status,
                  adminNotes: updatedComplaint.adminNotes
                }
              : c
          )
        );

        handleCloseResolutionModal();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update complaint resolution.');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate open complaint count for badge
  const openComplaintsCount = complaints.filter((c) => c.status === 'open').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors font-sans text-slate-800 dark:text-slate-100">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all text-xs font-bold flex items-center gap-1.5"
            >
              <FiArrowLeft /> <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg shadow-md shadow-purple-600/20">
                <MdOutlineAdminPanelSettings />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Campus Admin Operations
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                    Staff
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'overview') fetchAnalytics();
                if (activeTab === 'users') fetchUsers(userSearch, userRoleFilter);
                if (activeTab === 'complaints') fetchComplaints(complaintStatusFilter);
              }}
              title="Refresh Current View"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all text-xs"
            >
              <FiRefreshCw className={loadingAnalytics || loadingUsers || loadingComplaints ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Global Feedback Banners */}
        {errorMsg && (
          <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 p-4 rounded-2xl border border-red-200/50 dark:border-red-900/30 text-xs font-medium animate-fadeIn">
            <FiAlertCircle className="text-base flex-shrink-0" />
            <span className="flex-grow">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:text-red-800">
              <FiX />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 text-xs font-medium animate-fadeIn">
            <FiCheckCircle className="text-base flex-shrink-0" />
            <span className="flex-grow">{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:text-emerald-800">
              <FiX />
            </button>
          </div>
        )}

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 w-fit max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FiActivity /> Overview & Analytics
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FiUsers /> User Directory
            {users.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">
                {users.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('complaints')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'complaints'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FiAlertTriangle /> Disputes & Complaints
            {openComplaintsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                {openComplaintsCount}
              </span>
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & ANALYTICS                             */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loadingAnalytics ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <p className="text-xs uppercase tracking-widest font-semibold">Loading platform metrics...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Metric Summary Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {/* Total Users */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FiUsers className="text-indigo-600 dark:text-indigo-400" /> Users
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {analytics.totalUsers}
                    </p>
                    <p className="text-[10px] text-slate-400">VIT Students & Partners</p>
                  </div>

                  {/* Verified Partners */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FiAward className="text-amber-500" /> Partners
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {analytics.totalPartners}
                    </p>
                    <p className="text-[10px] text-slate-400">Verified Couriers</p>
                  </div>

                  {/* Total Orders */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FiPackage className="text-blue-500" /> Total Orders
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {analytics.totalOrders}
                    </p>
                    <p className="text-[10px] text-slate-400">All-time requests</p>
                  </div>

                  {/* Completed Orders */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FiCheckCircle className="text-emerald-500" /> Completed
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {analytics.completedOrders}
                    </p>
                    <p className="text-[10px] text-slate-400">{analytics.completionRate}% fulfillment</p>
                  </div>

                  {/* Pending In Queue */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FiClock className="text-amber-500" /> Pending
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                      {analytics.pendingOrders}
                    </p>
                    <p className="text-[10px] text-slate-400">Awaiting partners</p>
                  </div>

                  {/* Total Revenue / Rewards */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FiDollarSign className="text-indigo-600 dark:text-indigo-400" /> Platform GMV
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                      ₹{analytics.totalRevenue}
                    </p>
                    <p className="text-[10px] text-slate-400">Total rewards paid</p>
                  </div>
                </div>

                {/* Analytical Deep-Dives (Two Column Layout) */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left Column: Order Categories & Status Breakdown */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <FiTrendingUp className="text-indigo-600 dark:text-indigo-400" /> Delivery Categories
                      </h3>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        {analytics.categoryBreakdown?.length || 0} Categories
                      </span>
                    </div>

                    <div className="space-y-3">
                      {analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                        analytics.categoryBreakdown.map((cat) => {
                          const percentage =
                            analytics.totalOrders > 0
                              ? Math.round((cat.count / analytics.totalOrders) * 100)
                              : 0;
                          return (
                            <div key={cat._id} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="capitalize text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  {cat._id === 'restaurant' && '🍔 Restaurant & Food'}
                                  {cat._id === 'parcel' && '📦 Campus Parcel'}
                                  {cat._id === 'medicine' && '💊 Health & Pharmacy'}
                                  {cat._id === 'shop' && '🛒 Store & Stationery'}
                                  {cat._id === 'others' && '⚡ Other Errands'}
                                  {!['restaurant', 'parcel', 'medicine', 'shop', 'others'].includes(cat._id) && cat._id}
                                </span>
                                <span className="text-slate-400">
                                  {cat.count} orders ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-4">No order categories recorded yet.</p>
                      )}
                    </div>

                    {/* Order Fulfillment Breakdown Meter */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Order Status Distribution</span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {analytics.completedOrders} completed • {analytics.pendingOrders} pending • {analytics.cancelledOrders} cancelled
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                        {analytics.totalOrders > 0 && (
                          <>
                            <div
                              title={`Completed: ${analytics.completedOrders}`}
                              style={{ width: `${(analytics.completedOrders / analytics.totalOrders) * 100}%` }}
                              className="bg-emerald-500"
                            />
                            <div
                              title={`Pending: ${analytics.pendingOrders}`}
                              style={{ width: `${(analytics.pendingOrders / analytics.totalOrders) * 100}%` }}
                              className="bg-amber-500"
                            />
                            <div
                              title={`Cancelled: ${analytics.cancelledOrders}`}
                              style={{ width: `${(analytics.cancelledOrders / analytics.totalOrders) * 100}%` }}
                              className="bg-rose-500"
                            />
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Cancelled</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Top Delivery Partners Leaderboard */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <FiAward className="text-amber-500" /> Top Delivery Partners
                      </h3>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Top 5 Deliverers
                      </span>
                    </div>

                    <div className="space-y-3">
                      {analytics.topPartners && analytics.topPartners.length > 0 ? (
                        analytics.topPartners.map((partner, idx) => (
                          <div
                            key={partner._id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                  {partner.name}
                                  {partner.isVerifiedPartner && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[9px] font-bold">
                                      Verified
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-slate-400 truncate">{partner.email}</p>
                              </div>
                            </div>

                            <div className="text-right flex items-center gap-3 flex-shrink-0">
                              <div>
                                <p className="text-xs font-black text-slate-900 dark:text-white">
                                  {partner.totalDeliveries} runs
                                </p>
                                <p className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5">
                                  <FiStar className="text-amber-500 fill-amber-500 text-[9px]" />
                                  {partner.averageRating ? partner.averageRating.toFixed(1) : '5.0'} • {partner.completionRate || 100}%
                                </p>
                              </div>
                              <Link
                                to={`/profile/${partner._id}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="View Partner Profile"
                              >
                                <FiExternalLink className="text-sm" />
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-6">No completed deliveries recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: USER DIRECTORY & MANAGEMENT                       */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filters Toolbar */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Box */}
              <form onSubmit={handleUserSearchSubmit} className="relative flex-grow max-w-md">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search by student name or VIT email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserSearch('');
                      fetchUsers('', userRoleFilter);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="text-xs" />
                  </button>
                )}
              </form>

              {/* Role Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1 hidden sm:inline">
                  Role:
                </span>
                {['all', 'student', 'partner', 'admin'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleFilterChange(role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      userRoleFilter === role
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table / Responsive Cards */}
            {loadingUsers ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <p className="text-xs uppercase tracking-widest font-semibold">Loading user directory...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users found</p>
                <p className="text-xs text-slate-400">Try modifying your search term or role filter.</p>
              </div>
            ) : (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="py-3.5 px-4 sm:px-6">User / Email</th>
                        <th className="py-3.5 px-4">Role & Status</th>
                        <th className="py-3.5 px-4">Performance & Trust</th>
                        <th className="py-3.5 px-4">Complaints</th>
                        <th className="py-3.5 px-4">Wallet</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Administrative Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {users.map((u) => {
                        const isSelf = u._id === user?._id;
                        return (
                          <tr
                            key={u._id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            {/* User & Email */}
                            <td className="py-4 px-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                <img
                                  src={u.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || 'User'}`}
                                  alt=""
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <Link
                                    to={`/profile/${u._id}`}
                                    className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                                  >
                                    {u.name} {isSelf && <span className="text-[10px] text-indigo-500">(You)</span>}
                                  </Link>
                                  <span className="text-[10px] text-slate-400 truncate block">{u.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* Role & Status */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    u.role === 'admin'
                                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                      : u.role === 'partner'
                                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300'
                                  }`}
                                >
                                  {u.role}
                                </span>
                                {u.isBanned ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1">
                                    <FiUserX className="text-[9px]" /> Banned
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                    <FiUserCheck className="text-[9px]" /> Active
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Performance & Trust */}
                            <td className="py-4 px-4">
                              <div className="space-y-0.5">
                                <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                                  <FiStar className="text-amber-500 fill-amber-500 text-[10px]" />
                                  {u.averageRating ? u.averageRating.toFixed(1) : '5.0'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {u.totalDeliveries || 0} runs • {u.completionRate || 100}% rate
                                </span>
                              </div>
                            </td>

                            {/* Complaints */}
                            <td className="py-4 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  (u.complaintsCount || 0) > 0
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {u.complaintsCount || 0}
                              </span>
                            </td>

                            {/* Wallet */}
                            <td className="py-4 px-4">
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                ₹{u.walletBalance || 0}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/profile/${u._id}`}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors"
                                >
                                  Profile
                                </Link>

                                {isSelf ? (
                                  <span className="text-[10px] text-slate-400 italic px-2">You</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBanModal(u)}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                                      u.isBanned
                                        ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50'
                                        : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50'
                                    }`}
                                  >
                                    {u.isBanned ? 'Unban User' : 'Ban User'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DISPUTES & COMPLAINTS MANAGEMENT                  */}
        {/* ======================================================== */}
        {activeTab === 'complaints' && (
          <div className="space-y-4">
            {/* Status Filter Toolbar */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                  Status Filter:
                </span>
                {['all', 'open', 'investigating', 'resolved', 'dismissed'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleComplaintStatusChange(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      complaintStatusFilter === status
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400">
                Total: <span className="font-bold text-slate-900 dark:text-white">{complaints.length}</span> complaints
              </span>
            </div>

            {/* Complaints List */}
            {loadingComplaints ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <p className="text-xs uppercase tracking-widest font-semibold">Loading complaints queue...</p>
              </div>
            ) : complaints.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-center space-y-2">
                <FiCheckCircle className="text-3xl text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Clean Slate</p>
                <p className="text-xs text-slate-400">No complaints matching status "{complaintStatusFilter}".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => {
                  const statusColors = {
                    open: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/50',
                    investigating: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200/50',
                    resolved: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
                    dismissed: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/50'
                  };

                  return (
                    <div
                      key={c._id}
                      className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                    >
                      {/* Top Line: Status Badge & Timestamp */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              statusColors[c.status] || statusColors.open
                            }`}
                          >
                            {c.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {c._id.slice(-8)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.createdAt).toLocaleString([], {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenResolutionModal(c)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <FiEdit3 className="text-xs" /> Review / Resolve
                          </button>
                        </div>
                      </div>

                      {/* Parties & Order Grid */}
                      <div className="grid sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-xs">
                        {/* Reporter */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                            Reporter
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {c.reporter?.name || 'Unknown Student'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {c.reporter?.email}
                          </span>
                        </div>

                        {/* Reported User */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                            Reported Peer
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/profile/${c.reportedUser?._id}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                            >
                              {c.reportedUser?.name || 'Unknown User'}
                            </Link>
                            {c.reportedUser?.isBanned && (
                              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold">
                                Banned
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {c.reportedUser?.email} • {c.reportedUser?.complaintsCount || 0} total complaints
                          </span>
                        </div>

                        {/* Related Order Context */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                            Related Order
                          </span>
                          {c.order ? (
                            <div>
                              <Link
                                to={`/order/${c.order._id}`}
                                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                              >
                                {c.order.itemName} →
                              </Link>
                              <span className="text-[10px] text-slate-400 capitalize block">
                                {c.order.category} • {c.order.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Direct user profile report</span>
                          )}
                        </div>
                      </div>

                      {/* Reason Description */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Complaint Reason & Allegation
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                          {c.reason}
                        </p>
                      </div>

                      {/* Existing Admin Resolution Notes (if any) */}
                      {c.adminNotes && (
                        <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs">
                          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-widest block mb-0.5">
                            Official Administrator Notes
                          </span>
                          <p className="text-purple-900 dark:text-purple-200 font-medium">
                            {c.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* BAN CONFIRMATION MODAL                                   */}
      {/* ======================================================== */}
      {banModal.isOpen && banModal.user && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={handleCloseBanModal}
          />
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 w-full max-w-md relative z-10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                    banModal.user.isBanned
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {banModal.user.isBanned ? <FiUserCheck /> : <FiUserX />}
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {banModal.user.isBanned ? 'Unban User Account' : 'Confirm User Ban'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseBanModal}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FiX />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{banModal.user.name}</p>
              <p className="text-[11px] text-slate-400">{banModal.user.email}</p>
              <p className="text-[10px] text-slate-400">
                Complaints: <span className="font-bold text-rose-500">{banModal.user.complaintsCount || 0}</span> • Deliveries: {banModal.user.totalDeliveries || 0}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {banModal.user.isBanned
                ? 'Unbanning this user will immediately restore their ability to login, post requests, and take delivery orders.'
                : 'Banning this user will immediately terminate their active session, block API access, and prevent further orders.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseBanModal}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBanToggle}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 text-white ${
                  banModal.user.isBanned
                    ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50'
                    : 'bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50'
                }`}
              >
                {actionLoading ? (
                  'Updating...'
                ) : banModal.user.isBanned ? (
                  <>
                    <FiUserCheck /> Confirm Unban
                  </>
                ) : (
                  <>
                    <FiUserX /> Confirm Ban
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPLAINT RESOLUTION MODAL                               */}
      {/* ======================================================== */}
      {resolutionModal.isOpen && resolutionModal.complaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={handleCloseResolutionModal}
          />
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 w-full max-w-lg relative z-10 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
                  <FiEdit3 />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Review Dispute & Resolution
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    ID: {resolutionModal.complaint._id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseResolutionModal}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FiX />
              </button>
            </div>

            {/* Complaint Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Reported User
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {resolutionModal.complaint.reportedUser?.name} ({resolutionModal.complaint.reportedUser?.email})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Reporter
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {resolutionModal.complaint.reporter?.name}
                </span>
              </div>
              {resolutionModal.complaint.order && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Order
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {resolutionModal.complaint.order.itemName} ({resolutionModal.complaint.order.category})
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                  Allegation
                </span>
                <p className="text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed">
                  {resolutionModal.complaint.reason}
                </p>
              </div>
            </div>

            {/* Form for Status and Notes */}
            <form onSubmit={handleSaveComplaintResolution} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Resolution Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'open', label: 'Open' },
                    { key: 'investigating', label: 'Investigating' },
                    { key: 'resolved', label: 'Resolved' },
                    { key: 'dismissed', label: 'Dismissed' }
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setResolutionModal((prev) => ({ ...prev, status: s.key }))}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        resolutionModal.status === s.key
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Official Administrator Notes
                </label>
                <textarea
                  rows="3"
                  value={resolutionModal.adminNotes}
                  onChange={(e) =>
                    setResolutionModal((prev) => ({ ...prev, adminNotes: e.target.value }))
                  }
                  placeholder="Document actions taken, security findings, or warnings issued..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Optional Quick Ban trigger from resolution */}
                {resolutionModal.complaint.reportedUser && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenBanModal(resolutionModal.complaint.reportedUser);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FiUserX />
                    {resolutionModal.complaint.reportedUser.isBanned ? 'Unban User' : 'Ban Reported User'}
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCloseResolutionModal}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <FiSave />
                    {actionLoading ? 'Saving...' : 'Save Resolution'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
