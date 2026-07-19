import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';

export const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center transition-colors">
      <h1 className="text-8xl font-black text-indigo-600 dark:text-indigo-400">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-4">Page Not Found</h2>
      <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/15 hover:-translate-y-0.5 transition-all text-sm"
      >
        <FiHome /> Back to Home
      </Link>
    </div>
  );
};
export default NotFound;
