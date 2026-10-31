import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useAxiosPrivate } from '../hooks/useAxiosPrivate';
import {
  FiArrowLeft,
  FiMapPin,
  FiClock,
  FiSend,
  FiUser,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiCopy,
  FiCheck,
  FiSun,
  FiMoon,
  FiMessageSquare,
  FiPhone,
  FiStar,
  FiAward,
  FiImage,
  FiAlertTriangle
} from 'react-icons/fi';
import { MdOutlineDeliveryDining, MdOutlineFastfood } from 'react-icons/md';
import FileComplaintModal from '../components/common/FileComplaintModal';
import ReviewCard from '../components/reviews/ReviewCard';
import ReviewForm from '../components/reviews/ReviewForm';

const API_SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export const OrderDetails = () => {
  const { orderId } = useParams();
  const { user, accessToken, updateUserInfo } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const axiosPrivate = useAxiosPrivate();

  // Order & Chat States
  const [order, setOrder] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  // Review States
  const [existingReview, setExistingReview] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // References
  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Helper: Scroll chat to bottom
  const scrollToBottom = (smooth = true) => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Check if current user has already reviewed the other party for this order
  const fetchOrderReview = useCallback(async (currentOrder) => {
    if (!currentOrder || currentOrder.status !== 'completed' || !user) {
      setExistingReview(null);
      return;
    }

    const currentUserId = user._id || user.id;
    const isStudentOwner = String(currentOrder.student?._id || currentOrder.student) === String(currentUserId);
    const isPartnerAssigned = currentOrder.partner && String(currentOrder.partner?._id || currentOrder.partner) === String(currentUserId);
    if (!isStudentOwner && !isPartnerAssigned) {
      setExistingReview(null);
      return;
    }

    const revieweeId = isStudentOwner ? (currentOrder.partner?._id || currentOrder.partner) : (currentOrder.student?._id || currentOrder.student);
    if (!revieweeId) {
      setExistingReview(null);
      return;
    }

    try {
      const response = await axiosPrivate.get(`/reviews/user/${revieweeId}`);
      const myRev = response.data.reviews?.find(
        (r) =>
          String(r.order?._id || r.order) === String(currentOrder._id) &&
          String(r.reviewer?._id || r.reviewer) === String(currentUserId)
      );
      setExistingReview(myRev || null);
    } catch {
      setExistingReview(null);
    }
  }, [axiosPrivate, user]);

  // Fetch Order Details
  const fetchOrder = useCallback(async () => {
    try {
      const response = await axiosPrivate.get(`/orders/${orderId}`);
      setOrder(response.data.order);
      setNotFound(false);
      setUnauthorized(false);
      if (response.data.order?.status === 'completed') {
        fetchOrderReview(response.data.order);
      } else {
        setExistingReview(null);
      }
      return response.data.order;
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else if (err.response?.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to load order details');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, orderId, fetchOrderReview]);

  // Fetch Chat Messages
  const fetchMessages = useCallback(async () => {
    try {
      setChatLoading(true);
      const response = await axiosPrivate.get(`/chat/${orderId}`);
      setMessages(response.data.messages || []);
    } catch (err) {
      // If order is pending or user not part of order yet, chat may not be authorized
      console.log('Chat not available or not authorized for this order state');
    } finally {
      setChatLoading(false);
    }
  }, [axiosPrivate, orderId]);

  // Initial Data Load
  useEffect(() => {
    fetchOrder();
    fetchMessages();
  }, [fetchOrder, fetchMessages]);

  // Scroll chat on new messages
  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Socket.IO Setup & Event Handlers
  useEffect(() => {
    if (!orderId) return;

    socketRef.current = io(API_SOCKET_URL, {
      withCredentials: true,
      auth: { token: accessToken }
    });

    socketRef.current.on('connect', () => {
      // Join this order's room
      socketRef.current.emit('join_room', orderId);
    });

    // Realtime chat messages
    socketRef.current.on('new_message', (incomingMessage) => {
      setMessages((prev) => {
        // Prevent duplicate appending
        if (prev.some((m) => m._id === incomingMessage._id)) return prev;
        return [...prev, incomingMessage];
      });
      scrollToBottom(true);
    });

    // Typing indicators
    socketRef.current.on('user_typing', ({ userName }) => {
      setTypingUser(userName);
    });

    socketRef.current.on('user_stopped_typing', () => {
      setTypingUser(null);
    });

    // Order status changes
    socketRef.current.on('order_status_change', ({ orderId: changedOrderId, status }) => {
      if (changedOrderId === orderId) {
        fetchOrder();
        fetchMessages();
      }
    });

    socketRef.current.on('order_cancelled', ({ orderId: cancelledId }) => {
      if (cancelledId === orderId) {
        fetchOrder();
      }
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.emit('typing_stop', { roomId: orderId });
        socketRef.current.emit('leave_room', orderId);
        socketRef.current.off('new_message');
        socketRef.current.off('user_typing');
        socketRef.current.off('user_stopped_typing');
        socketRef.current.off('order_status_change');
        socketRef.current.off('order_cancelled');
        socketRef.current.disconnect();
      }
    };
  }, [orderId, accessToken, fetchOrder, fetchMessages]);

  // Handle Chat Input with Typing Indicator
  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    if (socketRef.current) {
      socketRef.current.emit('typing_start', {
        roomId: orderId,
        userName: user?.name || 'Someone'
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing_stop', { roomId: orderId });
        }
      }, 2000);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sendingMessage) return;

    const trimmed = messageText.trim();
    setMessageText('');
    setSendingMessage(true);

    if (socketRef.current) {
      socketRef.current.emit('typing_stop', { roomId: orderId });
    }

    try {
      const response = await axiosPrivate.post(`/chat/${orderId}`, { content: trimmed });
      // The socket event will also fire, but add optimistically if not already there
      setMessages((prev) => {
        if (prev.some((m) => m._id === response.data.message._id)) return prev;
        return [...prev, response.data.message];
      });
      scrollToBottom(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send message');
      setMessageText(trimmed); // Restore message text on failure
    } finally {
      setSendingMessage(false);
    }
  };

  // Copy OTP helper
  const handleCopyOtp = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2500);
  };

  // Accept Order Action (for Partners)
  const handleAcceptOrder = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSubmittingAction(true);
    try {
      await axiosPrivate.put(`/orders/${orderId}/accept`);
      setSuccessMsg('You have accepted this delivery request!');
      await fetchOrder();
      await fetchMessages();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Complete Order with OTP Action (for Partners)
  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    if (!otpInput) {
      setErrorMsg('Please enter the 6-digit verification OTP');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setSubmittingAction(true);
    try {
      const response = await axiosPrivate.put(`/orders/${orderId}/complete`, { otp: otpInput });
      setSuccessMsg('Delivery verified and completed! Wallet reward has been released.');
      
      // Update partner wallet balance locally
      if (user) {
        updateUserInfo({
          ...user,
          walletBalance: (user.walletBalance || 0) + (response.data.order?.rewardAmount || order?.rewardAmount || 0),
          totalDeliveries: (user.totalDeliveries || 0) + 1
        });
      }
      setOtpInput('');
      await fetchOrder();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'OTP verification failed. Please re-check the code.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Cancel Order Action
  const handleCancelOrder = async () => {
    const isOwner = order?.student?._id === user?._id;
    const confirmText = isOwner
      ? 'Are you sure you want to cancel this order? Your reward will be refunded to your wallet.'
      : 'Are you sure you want to cancel your delivery run? The request will return to the campus feed.';

    if (!window.confirm(confirmText)) return;

    setErrorMsg('');
    setSuccessMsg('');
    setSubmittingAction(true);
    try {
      await axiosPrivate.put(`/orders/${orderId}/cancel`);
      setSuccessMsg('Order cancelled successfully.');

      // If student cancelled, refund was issued
      if (isOwner && user) {
        updateUserInfo({
          ...user,
          walletBalance: (user.walletBalance || 0) + (order?.rewardAmount || 0)
        });
      }

      await fetchOrder();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setSubmittingAction(false);
    }
  };

  // ---------------- Loading State ----------------
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 font-sans">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-950"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Loading Order Details...</p>
      </div>
    );
  }

  // ---------------- Not Found State ----------------
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center text-3xl mb-4">
          <FiAlertCircle />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Order Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
          The requested delivery order could not be located or may have expired.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/15 transition-all"
        >
          <FiArrowLeft /> Back to Dashboard
        </Link>
      </div>
    );
  }

  // ---------------- Unauthorized State ----------------
  if (unauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl mb-4">
          <FiShield />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
          You are not authorized to view this order. Accepted order details and chat channels are private to the requester and the assigned partner.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/15 transition-all"
        >
          <FiArrowLeft /> Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!order) return null;

  // Determine User Role in this Order
  const isOwner = order.student?._id === user?._id;
  const isAssignedPartner = order.partner && order.partner._id === user?._id;
  const isParticipant = isOwner || isAssignedPartner;
  const canChat = isParticipant && order.status !== 'pending';
  const targetUser = isOwner ? order.partner : order.student;
  const targetRoleLabel = isOwner ? 'Delivery Partner' : 'Requester';

  // Status mapping
  const statusSteps = [
    { key: 'pending', label: 'Pending', desc: 'Request open on campus feed' },
    { key: 'accepted', label: 'Accepted', desc: 'Partner on the way' },
    { key: 'delivered_to_hostel', label: 'Hostel Gate', desc: 'Arrived at delivery point' },
    { key: 'completed', label: 'Completed', desc: 'Verified with secure OTP' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'accepted': return 1;
      case 'delivered_to_hostel': return 2;
      case 'completed': return 3;
      default: return -1;
    }
  };

  const currentStep = getStepIndex(order.status);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans flex flex-col">
      {/* Navbar Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <FiArrowLeft /> Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <MdOutlineDeliveryDining className="text-xl" />
              </div>
              <span className="font-extrabold text-lg font-display tracking-tight text-slate-900 dark:text-white">
                Gate<span className="text-indigo-600 dark:text-indigo-400">2</span>Hostel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all text-sm"
              title="Toggle Theme"
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
            >
              <FiUser /> Profile
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-8 w-full space-y-6">
        {/* Alerts Console */}
        {errorMsg && (
          <div className="flex items-center justify-between gap-2 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 p-4 rounded-2xl border border-red-200/50 dark:border-red-900/30 text-sm">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="text-lg flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
              <FiXCircle />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 text-sm">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="text-lg flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg">
              <FiXCircle />
            </button>
          </div>
        )}

        {/* Order Hero Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <MdOutlineFastfood /> {order.category}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  order.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : order.status === 'accepted'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400'
                    : order.status === 'delivered_to_hostel'
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-400'
                    : order.status === 'cancelled'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                }`}
              >
                {order.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <FiClock /> Placed {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {order.itemName}
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Order ID:</span>
              <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md select-all">
                {order._id}
              </span>
            </p>
          </div>

          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locked Delivery Reward</span>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 flex items-center">
              ₹{order.rewardAmount}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">Escrow held until delivery verification</span>
          </div>
        </div>

        {/* Status Lifecycle Stepper */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Delivery Progress</h3>

          {order.status === 'cancelled' ? (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 flex items-center gap-3 text-red-600 dark:text-red-400 text-xs">
              <FiXCircle className="text-2xl flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Order Cancelled</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  This order was cancelled and the locked reward has been refunded to the student's wallet.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
              {statusSteps.map((step, idx) => {
                const isPassed = currentStep >= idx;
                const isCurrent = currentStep === idx;
                return (
                  <div
                    key={step.key}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-md ring-2 ring-indigo-500/10'
                        : isPassed
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
                        : 'bg-white dark:bg-slate-900/30 border-slate-200/30 dark:border-slate-800/30 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isPassed
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isPassed ? <FiCheck /> : idx + 1}
                      </span>
                      {isCurrent && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{step.label}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Core Layout: Left Info & Actions, Right Realtime Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Details, Participants & Action Console */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Delivery Locations & Specifications Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-5">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <FiMapPin className="text-indigo-600 dark:text-indigo-400" /> Route & Instructions
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pickup Location</span>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <FiMapPin className="text-indigo-500 flex-shrink-0" /> {order.pickupLocation}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destination Hostel</span>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <MdOutlineDeliveryDining className="text-indigo-500 flex-shrink-0 text-base" />
                    {order.dropHostel} Block
                    {order.student?.roomNumber && ` (Room ${order.student.roomNumber})`}
                  </p>
                </div>
              </div>

              {order.expectedTime && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <FiClock className="text-indigo-600 dark:text-indigo-400" /> Expected Delivery Time:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(order.expectedTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              )}

              {order.specialInstructions && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Special Instructions</span>
                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 italic">
                    "{order.specialInstructions}"
                  </div>
                </div>
              )}

              {order.attachmentImage && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <FiImage /> Attached Reference Image
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-64 flex justify-center bg-slate-900">
                    <img
                      src={order.attachmentImage}
                      alt="Order attachment"
                      className="object-contain w-full h-full max-h-64"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Participants Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <FiUser className="text-indigo-600 dark:text-indigo-400" /> Participants
                </h3>
                {isParticipant && targetUser && (
                  <button
                    type="button"
                    onClick={() => setIsComplaintModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/50 dark:border-rose-900/40 transition-colors"
                    title={`Report an issue with ${targetRoleLabel}`}
                  >
                    <FiAlertTriangle className="text-xs" />
                    <span>Report Issue</span>
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Requester (Student) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requester</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={order.student?.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${order.student?.name || 'Student'}`}
                      alt="Student"
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                        {order.student?.name}
                        {order.student?.isVerifiedPartner && (
                          <span className="text-amber-500 text-[10px]" title="Verified Partner">
                            <FiAward />
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <FiStar className="text-amber-500 fill-amber-500 text-[10px]" />
                        {order.student?.averageRating ? order.student.averageRating.toFixed(1) : '5.0'} Rating
                      </p>
                    </div>
                  </div>

                  {order.student?.phone && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                      <FiPhone className="text-slate-400" /> {order.student.phone}
                    </p>
                  )}

                  <Link
                    to={`/profile/${order.student?._id}`}
                    className="inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View Student Profile →
                  </Link>
                </div>

                {/* Delivery Partner */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Partner</span>
                  {order.partner ? (
                    <>
                      <div className="flex items-center gap-3">
                        <img
                          src={order.partner?.profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${order.partner?.name || 'Partner'}`}
                          alt="Partner"
                          className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                            {order.partner?.name}
                            {order.partner?.isVerifiedPartner && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">
                                Verified
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <FiStar className="text-amber-500 fill-amber-500 text-[10px]" />
                            {order.partner?.averageRating ? order.partner.averageRating.toFixed(1) : '5.0'} • {order.partner?.totalDeliveries || 0} runs
                          </p>
                        </div>
                      </div>

                      {order.partner?.phone && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                          <FiPhone className="text-slate-400" /> {order.partner.phone}
                        </p>
                      )}

                      <Link
                        to={`/profile/${order.partner?._id}`}
                        className="inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Partner Profile →
                      </Link>
                    </>
                  ) : (
                    <div className="py-3 text-center text-slate-450 dark:text-slate-500">
                      <p className="text-xs">No partner assigned yet.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Order is currently available on the campus feed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Console: Role-based Operations */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <FiShield className="text-indigo-600 dark:text-indigo-400" /> Order Actions & Verification
              </h3>

              {/* Student Owner View: OTP Code Box */}
              {isOwner && order.status !== 'pending' && order.status !== 'cancelled' && (
                <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FiShield /> Student Verification OTP
                    </span>
                    <span className="text-[10px] text-slate-400">Keep confidential</span>
                  </div>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    <span className="font-mono text-2xl font-black text-indigo-700 dark:text-indigo-300 tracking-widest select-all">
                      {order.otp || '••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyOtp(order.otp)}
                      className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      {copiedOtp ? <><FiCheck /> Copied</> : <><FiCopy /> Copy</>}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Share this 6-digit code with your delivery partner <span className="font-bold text-slate-700 dark:text-slate-300">ONLY after</span> you receive and verify your item at the hostel.
                  </p>
                </div>
              )}

              {/* Partner View: OTP Verification Form */}
              {isAssignedPartner && (order.status === 'accepted' || order.status === 'delivered_to_hostel') && (
                <form onSubmit={handleCompleteOrder} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 space-y-3">
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest">
                    Enter Verification OTP from Student
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="6-digit OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="flex-grow px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="submit"
                      disabled={submittingAction}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold rounded-xl text-xs shadow-md transition-all flex-shrink-0"
                    >
                      {submittingAction ? 'Verifying...' : 'Verify & Complete'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Once verified, ₹{order.rewardAmount} will instantly be credited to your wallet balance.
                  </p>
                </form>
              )}

              {/* Public Partner View: Accept Order Button */}
              {!isOwner && !order.partner && order.status === 'pending' && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    This order is open and waiting for a delivery partner. Accepting will assign this run to you.
                  </p>
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={handleAcceptOrder}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/15 transition-all flex items-center justify-center gap-1.5"
                  >
                    <MdOutlineDeliveryDining className="text-base" />
                    {submittingAction ? 'Accepting...' : 'Accept This Delivery Request'}
                  </button>
                </div>
              )}

              {/* Cancellation Controls */}
              {(order.status === 'pending' || order.status === 'accepted') && isParticipant && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={handleCancelOrder}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-650 hover:text-red-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <FiXCircle /> {isOwner ? 'Cancel Order Request' : 'Cancel Delivery Run'}
                  </button>
                </div>
              )}

              {order.status === 'completed' && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs">
                  <FiCheckCircle className="text-lg flex-shrink-0" />
                  <span>This order is verified and completed. Thank you for using Gate2Hostel!</span>
                </div>
              )}
            </div>

            {/* Ratings & Reviews Section (Completed Orders Only) */}
            {order.status === 'completed' && isParticipant && targetUser && (
              <div className="space-y-4">
                {reviewSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 text-xs">
                    <FiCheckCircle className="text-base flex-shrink-0" />
                    <span>{reviewSuccess}</span>
                  </div>
                )}

                {existingReview ? (
                  /* Display Already-Submitted Review Card */
                  <ReviewCard
                    review={existingReview}
                    isOwnReview={true}
                    targetName={targetUser.name}
                  />
                ) : (
                  /* Interactive Review Submission Form */
                  <ReviewForm
                    orderId={orderId}
                    targetUser={targetUser}
                    onReviewSubmitted={(newRev) => {
                      setExistingReview(newRev);
                      setReviewSuccess('Review submitted successfully! Thank you for rating.');
                      fetchOrder();
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right Column: Realtime Coordination Chat */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col h-[640px]">
              {/* Chat Header */}
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <FiMessageSquare className="text-indigo-600 dark:text-indigo-400" /> Coordination Chat
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {order.partner ? 'Direct channel between student and partner' : 'Channel unlocks when accepted'}
                  </p>
                </div>
                {canChat && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                  </span>
                )}
              </div>

              {/* Chat Messages Body */}
              <div className="flex-grow overflow-y-auto py-4 space-y-3 pr-1">
                {!canChat ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <FiMessageSquare className="text-3xl mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Chat is not yet available</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                      Live messaging unlocks as soon as a delivery partner accepts this request.
                    </p>
                  </div>
                ) : chatLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <FiMessageSquare className="text-2xl mb-2 text-indigo-400 opacity-60" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No messages yet</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                      Send a message to coordinate gate pickup timing, room drop instructions, or clarifications.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
                    const senderName = msg.sender?.name || (isMine ? 'You' : 'Participant');

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[9px] font-semibold text-slate-400 mb-1 px-1">
                          {isMine ? 'You' : senderName}
                        </span>
                        <div
                          className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-600/10'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 rounded-bl-sm'
                          }`}
                        >
                          <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="text-[8px] text-slate-400 mt-0.5 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Typing indicator */}
              {typingUser && (
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 italic px-2 py-1 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                  {typingUser} is typing...
                </div>
              )}

              {/* Chat Input Form */}
              {canChat ? (
                <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message to coordinate..."
                    value={messageText}
                    onChange={handleInputChange}
                    disabled={sendingMessage || order.status === 'cancelled' || order.status === 'completed'}
                    className="flex-grow px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendingMessage || order.status === 'cancelled' || order.status === 'completed'}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center flex-shrink-0"
                  >
                    <FiSend />
                  </button>
                </form>
              ) : (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {order.status === 'pending' ? 'Channel opens when partner accepts' : 'Chat closed for this order'}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* File Complaint Modal */}
      {isParticipant && targetUser && (
        <FileComplaintModal
          isOpen={isComplaintModalOpen}
          onClose={() => setIsComplaintModalOpen(false)}
          reportedUser={targetUser}
          orderId={order._id}
          orderTitle={order.itemName}
          onSuccess={() => {
            setSuccessMsg('Complaint filed successfully. Campus administration has been notified.');
          }}
        />
      )}
    </div>
  );
};

export default OrderDetails;
