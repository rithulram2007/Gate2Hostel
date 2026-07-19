import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useAxiosPrivate } from '../hooks/useAxiosPrivate';
import { io } from 'socket.io-client';
import CreateOrderModal from '../components/orders/CreateOrderModal';
import { 
  FiPlus, FiLogOut, FiSun, FiMoon, FiBriefcase, FiUser, 
  FiMapPin, FiClock, FiActivity, FiDollarSign, FiAward, 
  FiShield, FiCheckCircle, FiAlertCircle, FiXCircle, FiTrendingUp 
} from 'react-icons/fi';
import { MdOutlineDeliveryDining, MdOutlineCategory } from 'react-icons/md';

const API_SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export const Dashboard = () => {
  const { user, logout, updateUserInfo } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const socketRef = useRef(null);

  // States
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'partner'
  const [isOnline, setIsOnline] = useState(false);
  const [orders, setOrders] = useState([]); // Available public orders
  const [historyOrders, setHistoryOrders] = useState([]); // User's personal order history
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [otpInputs, setOtpInputs] = useState({});
  const [submittingWallet, setSubmittingWallet] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch public feed (pending orders)
  const fetchPublicOrders = async () => {
    try {
      const response = await axiosPrivate.get('/orders?status=pending');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching public orders:', error);
    }
  };

  // Fetch personal order history (placed & accepted)
  const fetchPersonalHistory = async () => {
    try {
      const response = await axiosPrivate.get('/orders/history');
      setHistoryOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching order history:', error);
    }
  };

  // Initialize and WebSockets Setup
  useEffect(() => {
    fetchPersonalHistory();
    fetchPublicOrders();

    // Establish WebSocket Connection
    socketRef.current = io(API_SOCKET_URL, {
      withCredentials: true
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected to dashboard');
    });

    // Listen for live order feeds
    socketRef.current.on('order_created', (newOrder) => {
      // Add to available feeds if in partner mode
      setOrders((prev) => [newOrder, ...prev]);
    });

    socketRef.current.on('order_cancelled', ({ orderId }) => {
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      fetchPersonalHistory();
    });

    socketRef.current.on('order_status_change', ({ orderId, status }) => {
      // If status changed, refresh everything
      fetchPublicOrders();
      fetchPersonalHistory();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Watch room additions for active ongoing orders
  useEffect(() => {
    if (socketRef.current && historyOrders.length > 0) {
      historyOrders.forEach((ord) => {
        if (ord.status === 'accepted' || ord.status === 'delivered_to_hostel') {
          socketRef.current.emit('join_room', ord._id);
        }
      });
    }
  }, [historyOrders]);

  // Create Order handler
  const handleCreateOrder = async (formData) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await axiosPrivate.post('/orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMsg('Request posted successfully!');
      
      // Update wallet balance locally
      updateUserInfo({
        ...user,
        walletBalance: user.walletBalance - response.data.order.rewardAmount
      });
      fetchPersonalHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to place request.');
      throw err;
    }
  };

  // Accept Order handler
  const handleAcceptOrder = async (orderId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await axiosPrivate.put(`/orders/${orderId}/accept`);
      setSuccessMsg('Delivery accepted! Please connect with student.');
      fetchPublicOrders();
      fetchPersonalHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to accept delivery.');
    }
  };

  // Complete Order with OTP handler
  const handleCompleteOrder = async (orderId) => {
    setErrorMsg('');
    setSuccessMsg('');
    const otp = otpInputs[orderId];
    if (!otp) {
      setErrorMsg('Please enter verification OTP');
      return;
    }

    try {
      const response = await axiosPrivate.put(`/orders/${orderId}/complete`, { otp });
      setSuccessMsg('Verification successful! Wallet reward released.');
      
      // Update wallet balance locally
      updateUserInfo({
        ...user,
        walletBalance: user.walletBalance + response.data.order.rewardAmount,
        totalDeliveries: user.totalDeliveries + 1
      });
      
      fetchPersonalHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'OTP verification failed.');
    }
  };

  // Cancel Order handler
  const handleCancelOrder = async (orderId, rewardAmount, isPlacedByMe) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await axiosPrivate.put(`/orders/${orderId}/cancel`);
      setSuccessMsg('Cancellation success.');
      
      if (isPlacedByMe) {
        // Refund student wallet
        updateUserInfo({
          ...user,
          walletBalance: user.walletBalance + Number(rewardAmount)
        });
      }
      
      fetchPublicOrders();
      fetchPersonalHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to cancel order.');
    }
  };

  // Deposit funds handler
  const handleWalletDeposit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!walletAmount || Number(walletAmount) <= 0) return;

    setSubmittingWallet(true);
    try {
      const response = await axiosPrivate.post('/profile/wallet/deposit', { amount: Number(walletAmount) });
      setSuccessMsg(`Deposited ₹${walletAmount} successfully!`);
      updateUserInfo({
        ...user,
        walletBalance: response.data.walletBalance
      });
      setWalletAmount('');
    } catch (err) {
      setErrorMsg('Deposit simulation failed.');
    } finally {
      setSubmittingWallet(false);
    }
  };

  // Security Deposit handler (₹500 verified status upgrade)
  const handlePaySecurityDeposit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await axiosPrivate.post('/profile/partner/verify');
      setSuccessMsg('Verified Partner Badge Activated!');
      updateUserInfo(response.data.user);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to pay security deposit.');
    }
  };

  // Security Deposit Refund handler
  const handleRefundSecurityDeposit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await axiosPrivate.post('/profile/partner/refund');
      setSuccessMsg('Security deposit refunded and verification badge removed.');
      updateUserInfo(response.data.user);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to refund deposit.');
    }
  };

  // Filter personal active runs vs completed histories
  const activePlaced = historyOrders.filter((o) => o.student._id === user._id && o.status !== 'completed' && o.status !== 'cancelled');
  const activeAccepted = historyOrders.filter((o) => o.partner && o.partner._id === user._id && o.status !== 'completed' && o.status !== 'cancelled');
  const pastOrders = historyOrders.filter((o) => o.status === 'completed' || o.status === 'cancelled');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-650 flex items-center justify-center text-white shadow-lg">
              <MdOutlineDeliveryDining className="text-2xl" />
            </div>
            <span className="font-extrabold text-xl font-display tracking-tight text-slate-900 dark:text-white">
              Gate<span className="text-indigo-600 dark:text-indigo-400">2</span>Hostel
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all"
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-650 hover:text-red-500 transition-all flex items-center gap-1 text-xs font-bold"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Alerts Console */}
        {errorMsg && (
          <div className="col-span-12 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 p-4 rounded-2xl border border-red-200/50 dark:border-red-900/30 text-sm">
            <FiAlertCircle className="text-lg flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="col-span-12 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 text-sm">
            <FiCheckCircle className="text-lg flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Card & Wallet Left Panel */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* User Profile Info Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <img
                src={user?.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
                alt="Profile"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-800"
              />
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-lg flex items-center gap-1.5">
                  {user?.name}
                  {user?.isVerifiedPartner && (
                    <span className="p-0.5 rounded-full bg-amber-500 text-white text-[10px] title-badge" title="Verified Gold Partner">
                      <FiAward />
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                    {user?.role}
                  </span>
                  {user?.statusBadge === 'trusted' && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-[10px] font-bold uppercase tracking-wider">
                      Trusted Partner
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-250/50 dark:border-slate-800/50 text-center">
              <div>
                <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">Deliveries</p>
                <p className="text-base font-black text-indigo-650 dark:text-indigo-400">{user?.totalDeliveries || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">Rating</p>
                <p className="text-base font-black text-indigo-650 dark:text-indigo-400">⭐ {user?.averageRating ? user.averageRating.toFixed(1) : '5.0'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">Success</p>
                <p className="text-base font-black text-indigo-650 dark:text-indigo-400">{user?.completionRate || 100}%</p>
              </div>
            </div>
          </div>

          {/* Double-Ledger Wallet Balance Panel */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-white border border-indigo-900/30 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Wallet Balance</span>
              <FiDollarSign className="text-xl text-indigo-300" />
            </div>
            <h2 className="text-3xl font-black font-display tracking-tight flex items-baseline">
              ₹{user?.walletBalance || 0}
            </h2>

            {/* Quick Wallet deposit simulator */}
            <form onSubmit={handleWalletDeposit} className="pt-2 flex gap-2">
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-indigo-300 pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  placeholder="500"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/20 text-xs font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={submittingWallet}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-indigo-900 font-bold rounded-xl text-xs transition-colors flex-shrink-0"
              >
                {submittingWallet ? 'Loading...' : 'Deposit'}
              </button>
            </form>
          </div>

          {/* Security Deposit verified partner HUD card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
              <FiShield className="text-indigo-600 dark:text-indigo-400" /> Partner Verification Badge
            </h4>
            
            {user?.isVerifiedPartner ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <FiCheckCircle className="text-lg flex-shrink-0" />
                  <span>Gold Badge Enabled! You have priority placement on feeds.</span>
                </div>
                <button
                  type="button"
                  onClick={handleRefundSecurityDeposit}
                  className="w-full py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all"
                >
                  Refund ₹500 Security Deposit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pay a refundable ₹500 security deposit to upgrade your account to Verified Partner. This locks ₹500 from your wallet and unlocks a badge.
                </p>
                <button
                  type="button"
                  onClick={handlePaySecurityDeposit}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-650/10 hover:shadow-indigo-650/20 transition-all flex items-center justify-center gap-1"
                >
                  Pay ₹500 Deposit & Verify
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Feeds and Workspace Right Panel */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* Tab selectors */}
          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('student')}
              className={`pb-2.5 font-bold text-sm border-b-2 px-1 transition-all ${
                activeTab === 'student'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700'
              }`}
            >
              I want a Delivery (Student)
            </button>
            <button
              onClick={() => setActiveTab('partner')}
              className={`pb-2.5 font-bold text-sm border-b-2 px-1 transition-all ${
                activeTab === 'partner'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700'
              }`}
            >
              I want to Deliver (Partner)
            </button>
          </div>

          {/* Student Mode Workspace */}
          {activeTab === 'student' && (
            <div className="space-y-6">
              
              {/* Order creation controller */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white">Request a Delivery</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Get food, parcels, or medications brought to your hostel block.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
                >
                  <FiPlus /> New Request
                </button>
              </div>

              {/* Active requested orders */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <FiActivity className="text-indigo-650 dark:text-indigo-400 animate-pulse" /> Active Requests
                </h3>
                {activePlaced.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-dashed border-slate-250 dark:border-slate-800 text-center text-slate-450 dark:text-slate-500">
                    <p className="text-xs">No active requests placed right now.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {activePlaced.map((ord) => (
                      <div key={ord._id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-md space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                            {ord.category}
                          </span>
                          <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-sm">₹{ord.rewardAmount} Reward</span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">{ord.itemName}</h4>
                          <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <p className="flex items-center gap-1"><FiMapPin className="text-[10px]" /> Pickup: {ord.pickupLocation}</p>
                            <p className="flex items-center gap-1"><FiClock className="text-[10px]" /> Deliver To: {ord.dropHostel}</p>
                          </div>
                        </div>

                        {/* Status progression check */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-450 dark:text-slate-500">Status:</span>
                            <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] ${
                              ord.status === 'accepted' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-450' : 'bg-blue-100 text-blue-750'
                            }`}>
                              {ord.status}
                            </span>
                          </div>

                          {ord.status === 'accepted' && (
                            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 text-xs">
                              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Verification Code</p>
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-base font-bold text-indigo-700 dark:text-indigo-300 select-all tracking-widest">{ord.otp}</span>
                                <span className="text-[9px] text-slate-400">Share this code with partner upon delivery</span>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord._id, ord.rewardAmount, true)}
                            className="w-full py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-650 hover:text-red-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <FiXCircle /> Cancel Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Partner Mode Workspace */}
          {activeTab === 'partner' && (
            <div className="space-y-6">
              
              {/* Online/Offline Coordinator toggles */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                    Online Coordination Panel
                    <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`}></span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isOnline ? 'You are visible and receiving live orders from the gate!' : 'Turn online to start view active requests.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnline(!isOnline)}
                  className={`px-5 py-2.5 font-bold rounded-xl text-xs transition-all shadow-md ${
                    isOnline 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-650/10'
                      : 'bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250'
                  }`}
                >
                  {isOnline ? 'Go Offline' : 'Go Online'}
                </button>
              </div>

              {!isOnline ? (
                <div className="p-12 border border-dashed border-slate-250 dark:border-slate-800 rounded-3xl text-center text-slate-450 dark:text-slate-500">
                  <FiBriefcase className="text-3xl mx-auto mb-3 text-slate-400" />
                  <h4 className="font-bold text-sm">Offline</h4>
                  <p className="text-xs mt-1">Please toggle Online to access public college feeds.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Ongoing runs */}
                  {activeAccepted.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                        <FiActivity className="text-amber-505 dark:text-amber-400" /> Ongoing Deliveries ({activeAccepted.length})
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {activeAccepted.map((ord) => (
                          <div key={ord._id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-md space-y-4">
                            <div className="flex justify-between items-start">
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                {ord.category}
                              </span>
                              <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-sm">₹{ord.rewardAmount} Reward</span>
                            </div>

                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-white">{ord.itemName}</h4>
                              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <p className="flex items-center gap-1"><FiMapPin className="text-[10px]" /> Pickup: {ord.pickupLocation}</p>
                                <p className="flex items-center gap-1"><FiClock className="text-[10px]" /> Deliver To: {ord.dropHostel}</p>
                                <p className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-850 font-semibold text-[10px] text-slate-700 dark:text-slate-350">
                                  Student Contact: {ord.student?.name} ({ord.student?.phone})
                                </p>
                              </div>
                            </div>

                            {/* Verification OTP console */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                              <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                                Enter Student's Verification OTP
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="6-digit OTP"
                                  value={otpInputs[ord._id] || ''}
                                  onChange={(e) => setOtpInputs({ ...otpInputs, [ord._id]: e.target.value })}
                                  className="flex-grow px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-mono tracking-widest focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleCompleteOrder(ord._id)}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
                                >
                                  Verify
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCancelOrder(ord._id, ord.rewardAmount, false)}
                                className="w-full py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/10 text-red-650 hover:text-red-500 rounded-lg text-[10px] font-bold transition-all"
                              >
                                Cancel Delivery Run
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Public Feed Orders */}
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                      <FiTrendingUp className="text-indigo-650 dark:text-indigo-400" /> Public Campus Feed
                    </h3>
                    
                    {orders.length === 0 ? (
                      <div className="p-8 rounded-3xl border border-dashed border-slate-250 dark:border-slate-800 text-center text-slate-450 dark:text-slate-500">
                        <p className="text-xs">No pending requests available on campus right now. Check back soon!</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {orders.map((ord) => (
                          <div key={ord._id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-md flex flex-col justify-between space-y-4 hover:border-indigo-500/20 transition-all">
                            <div>
                              <div className="flex justify-between items-start">
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                                  {ord.category}
                                </span>
                                <span className="font-extrabold text-indigo-650 dark:text-indigo-400 text-sm">₹{ord.rewardAmount} Reward</span>
                              </div>

                              <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-3">{ord.itemName}</h4>
                              
                              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <p className="flex items-center gap-1"><FiMapPin className="text-[10px]" /> Pickup: {ord.pickupLocation}</p>
                                <p className="flex items-center gap-1"><FiClock className="text-[10px]" /> Drop: {ord.dropHostel}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAcceptOrder(ord._id)}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-650/5 transition-all flex items-center justify-center gap-1"
                            >
                              <MdOutlineDeliveryDining className="text-base" /> Accept Delivery
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Past Order History Logs */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-4">
            <h4 className="font-extrabold text-slate-800 dark:text-white">Transaction & Delivery History</h4>
            {pastOrders.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No completed or cancelled orders on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 font-bold">Item</th>
                      <th className="py-2.5 font-bold">Type</th>
                      <th className="py-2.5 font-bold">Reward</th>
                      <th className="py-2.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastOrders.map((ord) => (
                      <tr key={ord._id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{ord.itemName}</td>
                        <td className="py-3 text-slate-500 capitalize">{ord.category}</td>
                        <td className="py-3 font-bold text-slate-700 dark:text-slate-350">₹{ord.rewardAmount}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            ord.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-705 dark:bg-emerald-950/30 dark:text-emerald-400' 
                              : 'bg-red-50 text-red-650 dark:bg-red-950/30 dark:text-red-400'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </section>
      </main>

      {/* Creation modal injection */}
      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSuccess={handleCreateOrder}
        walletBalance={user?.walletBalance || 0}
      />
    </div>
  );
};
export default Dashboard;
