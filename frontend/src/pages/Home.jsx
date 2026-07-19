import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon, FiArrowRight, FiCheckCircle, FiShield, FiTrendingUp } from 'react-icons/fi';
import { MdOutlineDeliveryDining, MdFastfood, MdLocalPharmacy, MdCardGiftcard } from 'react-icons/md';

export const Home = () => {
  const { user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  const categories = [
    { name: 'Food Delivery', icon: <MdFastfood />, desc: 'Food from Al-Maza, DC, or outside restaurants.' },
    { name: 'Parcels & Courier', icon: <MdCardGiftcard />, desc: 'Amazon, Flipkart, or custom packages from the Main Gate.' },
    { name: 'Medicines', icon: <MdLocalPharmacy />, desc: 'Emergency medicines brought securely from gate pharmacies.' },
    { name: 'Store Items', icon: <MdOutlineDeliveryDining />, desc: 'Stationery, snacks, or groceries from external stores.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden flex flex-col font-sans">
      
      {/* Dynamic Gradients */}
      <div className="absolute top-[-30%] left-[-20%] w-[800px] h-[800px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <MdOutlineDeliveryDining className="text-2xl" />
            </div>
            <span className="font-extrabold text-xl font-display tracking-tight text-slate-900 dark:text-white">
              Gate<span className="text-indigo-600 dark:text-indigo-400">2</span>Hostel
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>

            {user ? (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/15 transition-all text-sm"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-sm transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/15 hover:-translate-y-0.5 transition-all text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-grow flex items-center max-w-7xl mx-auto px-6 py-12 lg:py-24 relative z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center w-full">
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-450 text-xs font-semibold uppercase tracking-wider">
              <FiShield /> Exclusively for VIT Vellore Students
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Get Anything Delivered. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                By Students, For Students.
              </span>
            </h2>

            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0">
              Need food, medicines, or parcels brought from the Main Gate to your hostel room? 
              Connect with fellow VITians who are already returning and earn/save together!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                to={user ? "/dashboard" : "/login"}
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group text-base"
              >
                Place a Request <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={user ? "/dashboard" : "/register"}
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-2xl font-bold hover:shadow-lg transition-all text-base flex items-center justify-center"
              >
                Deliver & Earn Cash
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200 dark:border-slate-900 max-w-md mx-auto lg:mx-0 text-left">
              <div>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">100%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified VIT Students</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">₹500</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified Partner Option</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">&lt;15m</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average Delivery Time</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative hidden lg:block">
            {/* Startup Mockup Graphic card */}
            <div className="w-full p-8 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
                <span className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Active Requests Feed</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              
              {/* Request 1 */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Restaurant Food</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">₹60 Reward</span>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Al-Maza Chicken Shawarma x2</h4>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>From: Main Gate</span>
                  <span>To: MH-Q Block</span>
                </div>
              </div>

              {/* Request 2 */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider">Parcel</span>
                  <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm">₹50 Reward</span>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Urgent Amazon parcel (Box)</h4>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>From: Main Gate Post</span>
                  <span>To: LH-D Block</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                <FiTrendingUp className="text-lg flex-shrink-0" />
                <span>Join 500+ active students online right now coordinating campus tasks!</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Categories Grid */}
      <section className="bg-white dark:bg-slate-900/50 py-16 relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-3 mb-12">
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white">Supported Categories</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
              Choose from standard campus needs. Every order requires OTP verification to release wallet rewards.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">{cat.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
        <p>© 2026 Gate2Hostel. Built for VIT Vellore Campus placements and learning.</p>
      </footer>
    </div>
  );
};
export default Home;
