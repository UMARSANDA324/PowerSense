import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  User, Shield, Clock, Settings, History, Activity, Lock,
  RefreshCw, Save, Edit, Search, Filter, CheckCircle,
  AlertTriangle, Info, Globe, Bell, Mail, Phone, Calendar,
  Key, Monitor, LogOut, Zap, Building2, Award
} from "lucide-react";

const PlatformOwnerProfile = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("profile");
  const [data, setData] = useState({
    user: null,
    platform: null,
    loginHistory: null,
    activities: null,
    security: null
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const sections = [
    { id: "profile", label: "Executive Profile", icon: User },
    { id: "edit", label: "Edit Profile", icon: Edit },
    { id: "account", label: "Account Information", icon: Shield },
    { id: "security", label: "Security Summary", icon: Lock },
    { id: "preferences", label: "Personal Preferences", icon: Settings },
    { id: "login-history", label: "Login History", icon: History },
    { id: "activity", label: "Activity Summary", icon: Activity }
  ];

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    setError("");
    try {
      const [userRes, platformRes, loginHistoryRes, securityRes] = await Promise.all([
        api.get("/auth/profile"),
        api.get("/platform-operations/dashboard"),
        api.get("/platform-security/login-history"),
        api.get("/platform-security/dashboard")
      ]);

      setData({
        user: userRes.data,
        platform: platformRes.data?.data,
        loginHistory: loginHistoryRes.data?.data,
        security: securityRes.data?.data,
        activities: null
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Placeholder for save functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const ProfileCard = ({ title, description, icon: Icon, children }) => (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );

  const ExecutiveProfile = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Executive Profile</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Owner Profile</h2>
            <p className="text-sm text-slate-500 mt-1">Executive account information and status</p>
          </div>
          <button onClick={loadProfileData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
              <User size={36} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-black text-slate-100 mb-1">{data.user?.fullName || "Platform Owner"}</h3>
            <p className="text-sm text-slate-500 mb-2">{data.user?.email || "owner@nikola-platform.com"}</p>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400">
              <Award size={12} />
              Platform Owner
            </span>
          </div>

          <ProfileCard title="Account Status" description="Current account status" icon={Shield}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Account Status</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                  {data.user?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Platform Status</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  data.platform?.platformStatus === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {data.platform?.platformStatus || "Active"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Profile Completion</p>
                <span className="text-xs font-bold text-indigo-400">85%</span>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Platform Details" description="Platform information" icon={Building2}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Platform ID</p>
                <p className="text-sm font-black text-slate-100">{data.platform?.platformId || "NIKOLA_PLATFORM"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Platform Version</p>
                <p className="text-sm font-black text-slate-100">1.0.0</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Role</p>
                <p className="text-sm font-black text-slate-100">Platform Owner</p>
              </div>
            </div>
          </ProfileCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <ProfileCard title="Account Information" description="Account details and timestamps" icon={Info}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Created Date</p>
                <p className="text-sm font-black text-slate-100">
                  {data.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : "Unknown"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Last Login</p>
                <p className="text-sm font-black text-slate-100">Today</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Last Password Change</p>
                <p className="text-sm font-black text-slate-100">30 days ago</p>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Quick Actions" description="Common profile actions" icon={Zap}>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveSection("edit")} className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 hover:bg-slate-800 transition-colors">
                <Edit size={16} className="text-indigo-400" />
                <p className="text-sm font-semibold text-slate-100">Edit Profile</p>
              </button>
              <button onClick={() => setActiveSection("security")} className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 hover:bg-slate-800 transition-colors">
                <Shield size={16} className="text-emerald-400" />
                <p className="text-sm font-semibold text-slate-100">Security</p>
              </button>
              <button onClick={() => setActiveSection("preferences")} className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 hover:bg-slate-800 transition-colors">
                <Settings size={16} className="text-purple-400" />
                <p className="text-sm font-semibold text-slate-100">Preferences</p>
              </button>
              <button onClick={() => setActiveSection("activity")} className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 hover:bg-slate-800 transition-colors">
                <Activity size={16} className="text-blue-400" />
                <p className="text-sm font-semibold text-slate-100">Activity</p>
              </button>
            </div>
          </ProfileCard>
        </div>
      </div>
    </div>
  );

  const EditProfile = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Edit Profile</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Update Profile</h2>
            <p className="text-sm text-slate-500 mt-1">Update your profile information</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <ProfileCard title="Personal Information" description="Update your personal details" icon={User}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Full Name</label>
                <input 
                  type="text" 
                  defaultValue={data.user?.fullName || ""}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Email</label>
                <input 
                  type="email" 
                  defaultValue={data.user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+234 XXX XXX XXXX"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Profile photo upload will be available in future updates</p>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Preferences" description="Update your preferences" icon={Settings}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Preferred Language</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Timezone</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="UTC">UTC</option>
                  <option value="Africa/Lagos">Africa/Lagos</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Notification Preference</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="all">All Notifications</option>
                  <option value="important">Important Only</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Alternative email will be available in future updates</p>
              </div>
            </div>
          </ProfileCard>
        </div>
      </div>
    </div>
  );

  const AccountInformation = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Account Information</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Account Details</h2>
            <p className="text-sm text-slate-500 mt-1">Read-only account information</p>
          </div>
          <button onClick={loadProfileData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <ProfileCard title="Account Type" description="Account classification" icon={Shield}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Account Type</p>
                <p className="text-sm font-black text-slate-100">Platform Owner</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Role</p>
                <p className="text-sm font-black text-slate-100">platform-owner</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Platform Scope</p>
                <p className="text-sm font-black text-slate-100">Global</p>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Authentication" description="Authentication details" icon={Key}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Authentication Method</p>
                <p className="text-sm font-black text-slate-100">JWT Token</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Current Session</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Account Activity</p>
                <p className="text-sm font-black text-slate-100">High</p>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Permissions Summary" description="Platform permissions" icon={Award}>
            <div className="space-y-2">
              {[
                "Full Platform Access",
                "Company Management",
                "User Management",
                "Platform Configuration",
                "Security Management",
                "Audit Access"
              ].map((permission, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <p className="text-sm text-slate-300">{permission}</p>
                </div>
              ))}
            </div>
          </ProfileCard>

          <ProfileCard title="Account Status" description="Current account status" icon={Monitor}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Status</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                  {data.user?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Created</p>
                <p className="text-sm font-black text-slate-100">
                  {data.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : "Unknown"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Last Updated</p>
                <p className="text-sm font-black text-slate-100">
                  {data.user?.updatedAt ? new Date(data.user.updatedAt).toLocaleDateString() : "Unknown"}
                </p>
              </div>
            </div>
          </ProfileCard>
        </div>
      </div>
    </div>
  );

  const SecuritySummary = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Security Summary</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Account Security</h2>
            <p className="text-sm text-slate-500 mt-1">Security overview and status</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveSection("security")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
              Go to Security Center
            </button>
            <button onClick={loadProfileData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-slate-100 mb-1">{data.security?.overallSecurityScore || 85}</h3>
            <p className="text-sm text-slate-500">Security Score</p>
          </div>

          <ProfileCard title="Session Security" description="Active session information" icon={Monitor}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Active Sessions</p>
                <p className="text-sm font-black text-slate-100">{data.security?.onlineUsers || 1}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Last Login</p>
                <p className="text-sm font-black text-slate-100">Today</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Last Failed Login</p>
                <p className="text-sm font-black text-slate-100">None</p>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Password Status" description="Password security information" icon={Key}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Password Status</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Strong</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Last Changed</p>
                <p className="text-sm font-black text-slate-100">30 days ago</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">2FA Status</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-500/10 text-slate-400">Not Enabled</span>
              </div>
            </div>
          </ProfileCard>
        </div>

        <ProfileCard title="Linked Devices" description="Devices linked to account" icon={Monitor}>
          <div className="text-center py-8">
            <Monitor size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Device management will be available in future updates</p>
            <p className="text-xs text-slate-600 mt-1">Currently viewing from this device</p>
          </div>
        </ProfileCard>
      </div>
    </div>
  );

  const PersonalPreferences = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Personal Preferences</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Your Preferences</h2>
            <p className="text-sm text-slate-500 mt-1">Configure your personal preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              <Save size={16} />
              {saving ? "Saving..." : "Save Preferences"}
            </button>
            <button onClick={loadProfileData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <ProfileCard title="Display Settings" description="Theme and display preferences" icon={Monitor}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Theme</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="dark">Dark Mode</option>
                  <option value="light">Light Mode</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Theme selection will be available in future updates</p>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Localization" description="Language and timezone settings" icon={Globe}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Language</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Timezone</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="UTC">UTC</option>
                  <option value="Africa/Lagos">Africa/Lagos</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Dashboard Preferences" description="Dashboard customization" icon={Settings}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Dashboard Preference</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="overview">Overview</option>
                  <option value="analytics">Analytics</option>
                  <option value="operations">Operations</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Landing Page</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="dashboard">Dashboard</option>
                  <option value="companies">Companies</option>
                  <option value="analytics">Analytics</option>
                </select>
              </div>
            </div>
          </ProfileCard>

          <ProfileCard title="Notification Preferences" description="Notification settings" icon={Bell}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Notification Preference</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="all">All Notifications</option>
                  <option value="important">Important Only</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Email Notifications", enabled: true },
                  { label: "Push Notifications", enabled: true },
                  { label: "SMS Notifications", enabled: false }
                ].map((pref, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className="text-sm text-slate-300">{pref.label}</p>
                    {pref.enabled ? <CheckCircle size={16} className="text-emerald-400" /> : <span className="text-xs text-slate-500">Disabled</span>}
                  </div>
                ))}
              </div>
            </div>
          </ProfileCard>
        </div>
      </div>
    </div>
  );

  const LoginHistory = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Login History</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Authentication History</h2>
            <p className="text-sm text-slate-500 mt-1">Complete login and logout activity</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Search size={18} />
            </button>
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={18} />
            </button>
            <button onClick={loadProfileData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <ProfileCard title="Recent Login Activity" description="Authentication event history" icon={History}>
          <div className="text-center py-8">
            <History size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Login history viewer ready</p>
            <p className="text-xs text-slate-600 mt-1">All authentication events are logged via security services</p>
          </div>
        </ProfileCard>
      </div>
    </div>
  );

  const ActivitySummary = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Activity Summary</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Recent Activities</h2>
            <p className="text-sm text-slate-500 mt-1">Platform Owner activity history</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Search size={18} />
            </button>
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={18} />
            </button>
            <button onClick={loadProfileData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <ProfileCard title="Recent Activities" description="Platform Owner actions" icon={Activity}>
          <div className="space-y-3">
            {[
              { action: "Platform Login", time: "Today", icon: LogOut },
              { action: "Configuration Updated", time: "Yesterday", icon: Settings },
              { action: "Company Created", time: "2 days ago", icon: Building2 },
              { action: "Broadcast Sent", time: "3 days ago", icon: Bell },
              { action: "Maintenance Scheduled", time: "1 week ago", icon: Calendar },
              { action: "Feature Flag Updated", time: "1 week ago", icon: Zap }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <activity.icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">{activity.action}</p>
                  <p className="text-xs text-slate-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </ProfileCard>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw size={36} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-100 mb-2">Failed to load profile data</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={loadProfileData} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Platform Owner Profile</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Executive Profile Center</h2>
            <p className="text-sm text-slate-500 mt-1">Platform Owner profile and account management</p>
          </div>
          <button onClick={loadProfileData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeSection === section.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <section.icon size={16} />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeSection === "profile" && <ExecutiveProfile />}
      {activeSection === "edit" && <EditProfile />}
      {activeSection === "account" && <AccountInformation />}
      {activeSection === "security" && <SecuritySummary />}
      {activeSection === "preferences" && <PersonalPreferences />}
      {activeSection === "login-history" && <LoginHistory />}
      {activeSection === "activity" && <ActivitySummary />}
    </div>
  );
};

export default PlatformOwnerProfile;
