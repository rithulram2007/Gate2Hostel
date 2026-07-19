import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import { MdOutlineSecurity } from 'react-icons/md';
import AuthLayout from '../layouts/AuthLayout';

export const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@vitstudent.ac.in')) {
      setError('Only VIT student emails ending with @vitstudent.ac.in are allowed.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Google OAuth verification handler
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setSubmitting(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Google Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper mock login for local placement test drives
  const triggerMockGoogleLogin = async (mockName) => {
    setError('');
    setSubmitting(true);
    try {
      const mockToken = `mock_token_${mockName.toLowerCase().replace(' ', '_')}`;
      await loginWithGoogle(mockToken);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Mock login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-8 shadow-xl transition-all duration-300">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Welcome Back</h2>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-lg border border-red-200/50 dark:border-red-900/30 text-sm mb-5">
            <FiAlertCircle className="flex-shrink-0 text-base" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              VIT Student Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <FiMail />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name.number@vitstudent.ac.in"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <FiLock />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 transition-all duration-200 text-sm flex items-center justify-center gap-2"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
          <span className="absolute bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 font-medium">
            OR
          </span>
        </div>

        <div className="flex flex-col gap-3 justify-center items-center">
          {/* Google OAuth Login Wrapper */}
          <div className="w-full flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign In was unsuccessful.')}
              useOneTap
              theme="filled_blue"
              shape="circle"
              width="320"
            />
          </div>

          {/* Quick Mock Bypass Options for evaluation */}
          <div className="w-full mt-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col items-center">
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MdOutlineSecurity /> Evaluation Bypass Accounts
            </span>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => triggerMockGoogleLogin('Rahul Sharma')}
                className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-all"
              >
                Rahul (Student)
              </button>
              <button
                type="button"
                onClick={() => triggerMockGoogleLogin('Ankit Verma')}
                className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-all"
              >
                Ankit (Partner)
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 dark:text-slate-400 text-xs mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
            Sign Up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
export default Login;
