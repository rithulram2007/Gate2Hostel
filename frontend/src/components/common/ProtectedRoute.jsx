import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        {/* Sleek loading micro-animation */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-950"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Loading Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
export default ProtectedRoute;
