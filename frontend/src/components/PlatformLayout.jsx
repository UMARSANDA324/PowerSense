import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Shield, 
  Settings, 
  LogOut, 
  User, 
  Menu, 
  X,
  Gauge,
  Building2,
  BarChart3,
  Sliders,
  Lock
} from "lucide-react";

import nikolaLogo from "../assets/images/nikola.jpeg";

/**
 * Dedicated Layout Component for Platform Owner (Task 5)
 */
const PlatformLayout = ({ activeTab, setActiveTab, children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Development-only mount logging (Task 11)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("Platform Layout Mounted");
    }
  }, []);

  const handleLogoutClick = () => {
    logout();
    if (import.meta.env.DEV) {
      console.log("Platform Owner Logout Triggered");
    }
    navigate("/login");
  };

  const navItems = [
    { id: "dashboard", icon: <Gauge size={20} />, label: "Dashboard" },
    { id: "companies", icon: <Building2 size={20} />, label: "Companies" },
    { id: "analytics", icon: <BarChart3 size={20} />, label: "Global Analytics" },
    { id: "operations", icon: <Sliders size={20} />, label: "Platform Operations" },
    { id: "security", icon: <Lock size={20} />, label: "Security" },
    { id: "settings", icon: <Settings size={20} />, label: "Settings" },
    { id: "profile", icon: <User size={20} />, label: "Profile" },
  ];

  // Header title: Nikola Platform, Badge: Platform Owner, Logged-in user: UMAR SANDA
  const loggedInUserName = user?.fullName?.toUpperCase() || "UMAR SANDA";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <img src={nikolaLogo} alt="Nikola Logo" className="w-9 h-9 object-contain rounded-xl" />
          <span className="font-bold text-lg text-slate-200">Nikola Platform</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Foundation (Task 6) */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col z-20 h-screen sticky top-0
      `}>
        {/* Brand Header */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <img src={nikolaLogo} alt="Nikola Logo" className="w-11 h-11 object-contain rounded-xl" />
          <div>
            <h2 className="font-black text-lg text-slate-100 tracking-tight leading-none">NIKOLA CORE</h2>
            <span className="text-[10px] font-black text-indigo-400 tracking-[0.2em] mt-1.5 block">ENTERPRISE SYSTEM</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm
                ${activeTab === item.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }
              `}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all text-sm mt-6 border-t border-slate-800/60 pt-4"
          >
            <LogOut size={20} />
            Logout
          </button>
        </nav>

        {/* Info Box */}
        <div className="mt-auto pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-3 px-2 py-1.5 bg-slate-950/40 rounded-xl border border-slate-800/40">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/15">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Security Node</p>
              <p className="text-xs font-black text-slate-300 mt-1 uppercase tracking-tight">Active & Secure</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Platform Header (Task 7) */}
        <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-[69px] md:top-0 z-10">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight leading-none">
              Nikola Platform
            </h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider mt-0.5 uppercase">
              Control Panel & System Overlord
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Display Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold rounded-lg uppercase tracking-wide">
              Platform Owner
            </span>
            {/* Display Logged In User */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm uppercase">
                {loggedInUserName.substring(0, 2)}
              </div>
              <span className="hidden md:inline text-sm font-black text-slate-200 tracking-tight">
                {loggedInUserName}
              </span>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
