import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAxiosPrivate } from '../../hooks/useAxiosPrivate';
import { 
  FiArrowDownLeft, 
  FiArrowUpRight, 
  FiShield, 
  FiGift, 
  FiRotateCcw, 
  FiRefreshCw, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiChevronLeft, 
  FiChevronRight,
  FiClock,
  FiFilter
} from 'react-icons/fi';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'security', label: 'Security Deposits' }
];

export const TransactionHistory = ({ refreshTrigger = 0 }) => {
  const axiosPrivate = useAxiosPrivate();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async (pageToLoad = 1, filterType = 'all') => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pageToLoad,
        limit: 10
      };

      if (filterType === 'deposit') {
        params.type = 'deposit';
      } else if (filterType === 'rewards') {
        params.type = 'reward_payment,reward_received,deposit_refund';
      } else if (filterType === 'security') {
        params.type = 'security_deposit,deposit_refund';
      }

      const response = await axiosPrivate.get('/transactions', { params });
      let dataList = response.data?.transactions || [];

      // Refine dual-semantic deposit_refund on client side based on description/amount
      if (filterType === 'rewards') {
        dataList = dataList.filter((tx) => {
          if (tx.type !== 'deposit_refund') return true;
          const desc = (tx.description || '').toLowerCase();
          const isSecurity = desc.includes('security') || (!tx.order && Math.abs(tx.amount) === 500);
          return !isSecurity;
        });
      } else if (filterType === 'security') {
        dataList = dataList.filter((tx) => {
          if (tx.type !== 'deposit_refund') return true;
          const desc = (tx.description || '').toLowerCase();
          const isSecurity = desc.includes('security') || (!tx.order && Math.abs(tx.amount) === 500);
          return isSecurity;
        });
      }

      setTransactions(dataList);
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setError(err.response?.data?.message || 'Unable to load transaction records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  // Fetch when page, filter, or external refreshTrigger updates
  useEffect(() => {
    fetchTransactions(currentPage, activeFilter);
  }, [fetchTransactions, currentPage, activeFilter, refreshTrigger]);

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setCurrentPage(newPage);
  };

  // Determine metadata, label fallback, colors, and sign convention per transaction
  const getMeta = (tx) => {
    const rawType = tx.type;
    const desc = tx.description || '';
    const descLower = desc.toLowerCase();
    const isSecurityRefund = rawType === 'deposit_refund' && (descLower.includes('security') || (!tx.order && Math.abs(tx.amount) === 500));

    switch (rawType) {
      case 'deposit':
        return {
          label: desc || 'Wallet Top-up',
          badge: 'Deposit',
          isCredit: true,
          colorClass: 'emerald',
          badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
          icon: <FiArrowDownLeft className="text-emerald-600 dark:text-emerald-400" />
        };
      case 'reward_received':
        return {
          label: desc || 'Delivery Reward Received',
          badge: 'Reward Payout',
          isCredit: true,
          colorClass: 'emerald',
          badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
          icon: <FiGift className="text-emerald-600 dark:text-emerald-400" />
        };
      case 'reward_payment':
        return {
          label: desc || 'Order Reward Escrow',
          badge: 'Reward Escrow',
          isCredit: false,
          colorClass: 'slate',
          badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40',
          icon: <FiArrowUpRight className="text-indigo-600 dark:text-indigo-400" />
        };
      case 'security_deposit':
        return {
          label: desc || 'Partner Security Deposit',
          badge: 'Security Deposit',
          isCredit: false,
          colorClass: 'purple',
          badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
          icon: <FiShield className="text-purple-600 dark:text-purple-400" />
        };
      case 'deposit_refund':
        return {
          label: desc || (isSecurityRefund ? 'Security Deposit Refund' : 'Order Reward Refund'),
          badge: isSecurityRefund ? 'Deposit Refund' : 'Reward Refund',
          isCredit: true,
          colorClass: 'blue',
          badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
          icon: <FiRotateCcw className="text-blue-600 dark:text-blue-400" />
        };
      case 'withdrawal':
        return {
          label: desc || 'Wallet Withdrawal',
          badge: 'Withdrawal',
          isCredit: false,
          colorClass: 'slate',
          badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          icon: <FiArrowUpRight className="text-slate-600 dark:text-slate-400" />
        };
      default:
        return {
          label: desc || 'Transaction',
          badge: 'Other',
          isCredit: tx.amount >= 0,
          colorClass: tx.amount >= 0 ? 'emerald' : 'slate',
          badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          icon: <FiClock className="text-slate-500" />
        };
    }
  };

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

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
            <span>Financial Transaction History</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {pagination.total} records
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit ledger of wallet top-ups, order reward escrows, payouts, and deposit refunds
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTransactions(currentPage, activeFilter)}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all disabled:opacity-50"
          title="Refresh transaction history"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
          <FiFilter className="w-3 h-3" /> Filter:
        </span>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        /* Loading Skeleton */
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-36 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-24 h-2.5 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-6 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 text-center space-y-3">
          <FiAlertCircle className="w-7 h-7 text-red-500 mx-auto" />
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => fetchTransactions(currentPage, activeFilter)}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-600/20"
          >
            Retry Loading
          </button>
        </div>
      ) : transactions.length === 0 ? (
        /* Empty State */
        <div className="p-8 rounded-2xl bg-slate-50/70 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800/80 text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto text-xl">
            <FiClock />
          </div>
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {activeFilter === 'all'
              ? 'No transactions yet'
              : `No transactions found for "${FILTER_TABS.find((t) => t.id === activeFilter)?.label}"`}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {activeFilter === 'all'
              ? 'Your wallet top-ups, order reward escrows, completed deliveries, and refunds will be securely recorded here.'
              : 'There are currently no transaction entries matching the selected filter criteria.'}
          </p>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              className="mt-1 px-3.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
            >
              Reset to All Transactions
            </button>
          )}
        </div>
      ) : (
        /* Transaction Ledger List */
        <div className="space-y-2.5">
          {transactions.map((tx) => {
            const meta = getMeta(tx);
            const normalizedAmount = Math.abs(tx.amount || 0).toFixed(2);

            return (
              <div
                key={tx._id}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/70 transition-all flex items-center justify-between gap-3"
              >
                {/* Left side: Icon, Description, Date/Time */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                    {meta.icon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                        {meta.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeBg}`}>
                        {meta.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex-wrap">
                      <span>{formatDate(tx.createdAt)}</span>
                      <span>•</span>
                      <span>{formatTime(tx.createdAt)}</span>
                      {tx.order && (
                        <>
                          <span>•</span>
                          <Link
                            to={`/order/${tx.order._id || tx.order}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold truncate max-w-[140px] sm:max-w-[200px]"
                            title={tx.order.itemName || 'View order'}
                          >
                            Order: {tx.order.itemName || 'Details'}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Amount and Status */}
                <div className="text-right flex-shrink-0">
                  <div
                    className={`font-black text-sm sm:text-base ${
                      meta.isCredit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {meta.isCredit ? `+₹${normalizedAmount}` : `-₹${normalizedAmount}`}
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                    <FiCheckCircle className="w-2.5 h-2.5" />
                    <span>{tx.status || 'success'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Page <span className="font-bold text-slate-700 dark:text-slate-300">{pagination.page}</span> of{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300">{pagination.totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <FiChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Next</span>
              <FiChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
