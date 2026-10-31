import React from 'react';
import { FiSearch, FiX, FiRotateCcw } from 'react-icons/fi';

export const OrderDiscoveryToolbar = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedHostel,
  onHostelChange,
  sortBy,
  onSortChange,
  onResetFilters,
  hasActiveFilters,
  totalOrdersCount = 0,
  filteredOrdersCount = 0,
  categoryCounts = {}
}) => {
  const CATEGORIES = [
    { key: 'all', label: 'All Requests', icon: null },
    { key: 'restaurant', label: 'Restaurant', icon: '🍔' },
    { key: 'shop', label: 'Shop / Store', icon: '🛒' },
    { key: 'parcel', label: 'Parcel', icon: '📦' },
    { key: 'medicine', label: 'Medicine', icon: '💊' },
    { key: 'others', label: 'Others', icon: '⚡' }
  ];

  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'reward_desc', label: 'Highest Reward (₹ High → Low)' },
    { value: 'reward_asc', label: 'Lowest Reward (₹ Low → High)' },
    { value: 'oldest', label: 'Oldest First' }
  ];

  const MH_BLOCKS = [
    'MH-A', 'MH-B', 'MH-C', 'MH-D', 'MH-E', 'MH-F', 'MH-G', 'MH-H',
    'MH-J', 'MH-K', 'MH-L', 'MH-M', 'MH-N', 'MH-P', 'MH-Q', 'MH-R',
    'MH-S', 'MH-T'
  ];

  const LH_BLOCKS = ['LH-A', 'LH-B', 'LH-C', 'LH-D', 'LH-E', 'LH-F'];

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
      {/* Top Row: Search Input + Hostel Dropdown + Sort Selector */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-grow max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Search item, pickup spot, hostel, requester..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              title="Clear search text"
            >
              <FiX className="text-xs" />
            </button>
          )}
        </div>

        {/* Hostel Dropdown & Sort Selector */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Hostel Dropdown */}
          <div className="relative flex-grow sm:flex-grow-0">
            <select
              value={selectedHostel}
              onChange={(e) => onHostelChange(e.target.value)}
              className="w-full sm:w-auto pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none cursor-pointer"
            >
              <option value="all">📍 All Hostels</option>
              <optgroup label="Campus Zones">
                <option value="group_mh">Men's Hostels (All MH-*)</option>
                <option value="group_lh">Ladies' Hostels (All LH-*)</option>
              </optgroup>
              <optgroup label="Men's Hostel Blocks">
                {MH_BLOCKS.map((b) => (
                  <option key={b} value={b}>
                    {b} Block
                  </option>
                ))}
              </optgroup>
              <optgroup label="Ladies' Hostel Blocks">
                {LH_BLOCKS.map((b) => (
                  <option key={b} value={b}>
                    {b} Block
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="relative flex-grow sm:flex-grow-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full sm:w-auto pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Action Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
              title="Reset all search, category, and hostel filters"
            >
              <FiRotateCcw className="text-[11px]" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Category Chips + Live Count Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        {/* Horizontal Scrollable Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key];
            const isSelected = selectedCategory === cat.key;

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onCategoryChange(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.icon && <span className="text-[11px]">{cat.icon}</span>}
                <span>{cat.label}</span>
                {typeof count === 'number' && count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contextual Counter Summary */}
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 flex-shrink-0">
          {hasActiveFilters ? (
            <span>
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredOrdersCount}</span> of{' '}
              {totalOrdersCount} available
            </span>
          ) : (
            <span>
              <span className="font-bold text-slate-900 dark:text-white">{totalOrdersCount}</span> requests available
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDiscoveryToolbar;
