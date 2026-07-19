import React from 'react';
import { MdOutlineDeliveryDining } from 'react-icons/md';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300 relative overflow-hidden">
      {/* Premium Decorative Blob Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-3">
            <MdOutlineDeliveryDining className="text-3xl" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-slate-900 dark:text-white">
            Gate<span className="text-indigo-600 dark:text-indigo-400">2</span>Hostel
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Hyperlocal Peer-to-Peer VIT Vellore Delivery
          </p>
        </div>
        
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
