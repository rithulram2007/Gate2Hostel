import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiUser, FiMail, FiLock, FiPhone, FiHome, FiAlertCircle } from 'react-icons/fi';
import AuthLayout from '../layouts/AuthLayout';

export const Register = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    hostel: 'MH', // Default Men's Hostel
    block: 'A',
    roomNumber: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check password matches
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check email domains
    if (!formData.email.endsWith('@vitstudent.ac.in')) {
      setError('Registration is restricted to @vitstudent.ac.in domains only.');
      return;
    }

    setSubmitting(true);
    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-8 shadow-xl transition-all duration-300">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-5">Create Account</h2>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-lg border border-red-200/50 dark:border-red-900/30 text-sm mb-5">
            <FiAlertCircle className="flex-shrink-0 text-base" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <FiUser />
              </span>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
              VIT Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <FiMail />
              </span>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="rahul.sharma2023@vitstudent.ac.in"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          {/* Password Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <FiLock />
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <FiLock />
                </span>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <FiPhone />
              </span>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          {/* Hostel Address Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Hostel
              </label>
              <select
                name="hostel"
                value={formData.hostel}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              >
                <option value="MH">Men's Hostel (MH)</option>
                <option value="LH">Ladies' Hostel (LH)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Block
              </label>
              <select
                name="block"
                value={formData.block}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
              >
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T'].map((blk) => (
                  <option key={blk} value={blk}>{blk} Block</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1">
                Room No
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 pointer-events-none">
                  <FiHome />
                </span>
                <input
                  type="text"
                  name="roomNumber"
                  required
                  value={formData.roomNumber}
                  onChange={handleChange}
                  placeholder="302"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 transition-all duration-200 text-xs flex items-center justify-center gap-2"
          >
            {submitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-slate-500 dark:text-slate-400 text-xs mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
export default Register;
