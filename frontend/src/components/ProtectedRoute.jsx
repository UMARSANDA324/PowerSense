import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";

/**
 * Route Guard Component for Nikola Enterprise
 * Secures routes based on authentication status and role access lists.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isPlatformOwner } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing State...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const currentPath = location.pathname;

  // 1. Central Route Isolation: Platform Owner must NEVER open dashboard / admin / super-admin
  const isPlatformRoute = currentPath.startsWith("/platform-owner");
  if (isPlatformOwner && !isPlatformRoute && !["/profile", "/notification-settings", "/about-us"].includes(currentPath)) {
    return <Navigate to="/platform-owner" replace />;
  }

  // 2. Navigation Isolation: Non-Platform Owner trying to access Platform Owner Portal -> Return Forbidden
  if (!isPlatformOwner && isPlatformRoute) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
        <div className="bg-slate-900/60 border border-slate-800/80 p-10 rounded-[2.5rem] max-w-md shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-500" />
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-6">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-2">403 - Forbidden</h1>
          <div className="flex items-center justify-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-[10px] font-bold text-red-400 uppercase tracking-widest mb-4 w-fit mx-auto">
            Access Denied
          </div>
          <p className="text-slate-400 text-sm font-medium mb-8">
            You do not have administrative privileges to access the Nikola Platform Owner Portal.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // 3. Check allowed roles list if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
        <div className="bg-slate-900/60 border border-slate-800/80 p-10 rounded-[2.5rem] max-w-md shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-500" />
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-6">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-2">403 - Forbidden</h1>
          <p className="text-slate-400 text-sm font-medium mb-8">
            Your role does not have authorization to view this section.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return children;
};
