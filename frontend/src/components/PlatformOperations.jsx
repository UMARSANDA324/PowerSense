import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  Gauge, Send, MessageSquare, Wrench, Flag, Activity,
  Bell, Clock, RefreshCw, Plus, Search, Filter, Calendar,
  CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp,
  Users, Building2, Settings, Zap, Shield, Archive
} from "lucide-react";
import FeatureFlagManagementView from "./FeatureFlagManagementView";

const PlatformOperations = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [data, setData] = useState({
    dashboard: null,
    jobs: null,
    audit: null,
    notifications: null
  });

  const sections = [
    { id: "dashboard", label: "Operations Dashboard", icon: Gauge },
    { id: "broadcast", label: "Broadcast Center", icon: Send },
    { id: "messaging", label: "Internal Communication", icon: MessageSquare },
    { id: "maintenance", label: "Maintenance Center", icon: Wrench },
    { id: "features", label: "Feature Flags", icon: Flag },
    { id: "jobs", label: "Background Jobs", icon: Activity },
    { id: "notifications", label: "Platform Notifications", icon: Bell },
    { id: "timeline", label: "Operational Timeline", icon: Clock }
  ];

  useEffect(() => {
    loadOperationsData();
  }, []);

  const loadOperationsData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardRes, jobsRes, auditRes, notificationsRes] = await Promise.all([
        api.get("/platform-operations/dashboard"),
        api.get("/platform-operations/jobs"),
        api.get("/platform-operations/audit"),
        api.get("/platform-operations/notifications")
      ]);

      setData({
        dashboard: dashboardRes.data?.data,
        jobs: jobsRes.data?.data,
        audit: auditRes.data?.data,
        notifications: notificationsRes.data?.data
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load operations data");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color = "indigo" }) => {
    const colors = {
      indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      red: "bg-red-500/10 border-red-500/20 text-red-400",
      blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      amber: "bg-amber-500/10 border-amber-500/20 text-amber-400"
    };

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
            <Icon size={18} />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-100 mb-1">{value}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    );
  };

  const OperationsDashboard = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Operations Dashboard</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Operations Overview</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time operational status and metrics</p>
          </div>
          <button onClick={loadOperationsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Broadcasts" value={data.dashboard?.activeBroadcasts ?? 0} icon={Send} color="indigo" />
          <StatCard label="Running Maintenance" value={data.dashboard?.runningMaintenance ?? 0} icon={Wrench} color="amber" />
          <StatCard label="Queued Tasks" value={data.dashboard?.queuedTasks ?? 0} icon={Activity} color="blue" />
          <StatCard label="System Alerts" value={data.dashboard?.systemAlerts?.length ?? 0} icon={AlertTriangle} color="red" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Platform Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Platform Status</p>
                <p className={`text-sm font-black ${data.dashboard?.platformStatus === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                  {data.dashboard?.platformStatus || "Unknown"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">System Availability</p>
                <p className="text-sm font-black text-slate-100">99.8%</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Feature Flags</p>
                <p className="text-sm font-black text-slate-100">{data.dashboard?.featureFlagsEnabled ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Notification Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Queued</p>
                <p className="text-sm font-black text-indigo-400">{data.dashboard?.queuedNotifications ?? 0}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Delivered</p>
                <p className="text-sm font-black text-emerald-400">{data.dashboard?.deliveredNotifications ?? 0}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Failed</p>
                <p className="text-sm font-black text-red-400">{data.dashboard?.failedNotifications ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {data.dashboard?.systemAlerts?.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <p className="text-sm font-bold text-red-400">System Alerts</p>
            </div>
            {data.dashboard.systemAlerts.map((alert, index) => (
              <p key={index} className="text-sm text-red-300">{alert}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const BroadcastCenter = () => {
    const [showForm, setShowForm] = useState(false);

    return (
      <div className="space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Broadcast Center</p>
              <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Broadcasts</h2>
              <p className="text-sm text-slate-500 mt-1">Send platform-wide announcements and notifications</p>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              New Broadcast
            </button>
          </div>

          {showForm && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-6">
              <h3 className="text-lg font-black text-slate-100 mb-4">Create Broadcast</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Target Scope</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                    <option value="all">All Companies</option>
                    <option value="selected">Selected Companies</option>
                    <option value="owners">Company Owners</option>
                    <option value="super-admins">Super Admins</option>
                    <option value="admins">Admins</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Message Type</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                    <option value="announcement">Announcement</option>
                    <option value="alert">Alert</option>
                    <option value="maintenance">Maintenance Notice</option>
                    <option value="update">Platform Update</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Title</label>
                  <input type="text" placeholder="Broadcast title" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Message</label>
                  <textarea rows={4} placeholder="Broadcast message" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Schedule For (Optional)</label>
                    <input type="datetime-local" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Expires At (Optional)</label>
                    <input type="datetime-local" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
                    Send Broadcast
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 text-sm font-bold hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Broadcast History</h3>
            <div className="text-center py-8">
              <Send size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No broadcasts sent yet</p>
              <p className="text-xs text-slate-600 mt-1">Create a broadcast to get started</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const InternalMessaging = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Internal Communication</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Private Messages</h2>
            <p className="text-sm text-slate-500 mt-1">Secure internal messaging with company leadership</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Plus size={16} />
            New Message
          </button>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Message History</h3>
          <div className="text-center py-8">
            <MessageSquare size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No messages sent yet</p>
            <p className="text-xs text-slate-600 mt-1">Send a message to get started</p>
          </div>
        </div>
      </div>
    </div>
  );

  const MaintenanceCenter = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Maintenance Center</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Maintenance</h2>
            <p className="text-sm text-slate-500 mt-1">Schedule and manage platform maintenance windows</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Plus size={16} />
            Schedule Maintenance
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Maintenance" value={data.dashboard?.runningMaintenance ?? 0} icon={Wrench} color="amber" />
          <StatCard label="Scheduled" value="0" icon={Calendar} color="blue" />
          <StatCard label="Completed" value="0" icon={CheckCircle} color="emerald" />
          <StatCard label="Emergency" value="0" icon={AlertTriangle} color="red" />
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Maintenance History</h3>
          <div className="text-center py-8">
            <Wrench size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No maintenance scheduled</p>
            <p className="text-xs text-slate-600 mt-1">Schedule maintenance to get started</p>
          </div>
        </div>
      </div>
    </div>
  );

  const FeatureFlags = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Feature Flags</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Feature Flags</h2>
            <p className="text-sm text-slate-500 mt-1">Control platform features without redeployment</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Plus size={16} />
            Add Flag
          </button>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Active Flags</h3>
          <div className="text-center py-8">
            <Flag size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No feature flags configured</p>
            <p className="text-xs text-slate-600 mt-1">Add feature flags to control platform behavior</p>
          </div>
        </div>
      </div>
    </div>
  );

  const BackgroundJobs = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Background Jobs</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Job Monitor</h2>
            <p className="text-sm text-slate-500 mt-1">Monitor background job execution and status</p>
          </div>
          <button onClick={loadOperationsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Running" value={data.jobs?.notificationJobs?.filter(j => j.status === "Running").length ?? 0} icon={Activity} color="blue" />
          <StatCard label="Failed" value={data.jobs?.retryJobs?.filter(j => j.status === "Failed").length ?? 0} icon={AlertTriangle} color="red" />
          <StatCard label="Completed" value={data.jobs?.schedulerJobs?.filter(j => j.status === "Completed").length ?? 0} icon={CheckCircle} color="emerald" />
          <StatCard label="Waiting" value={data.jobs?.predictionJobs?.filter(j => j.status === "Waiting").length ?? 0} icon={Clock} color="amber" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Job Categories</h3>
            <div className="space-y-3">
              {data.jobs?.predictionJobs?.map((job, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Zap size={16} className="text-indigo-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{job.name}</p>
                      <p className="text-xs text-slate-500">Prediction Jobs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      job.status === "Running" ? "bg-blue-500/10 text-blue-400" :
                      job.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
                      job.status === "Failed" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
              {data.jobs?.notificationJobs?.map((job, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-purple-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{job.name}</p>
                      <p className="text-xs text-slate-500">Notification Jobs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      job.status === "Running" ? "bg-blue-500/10 text-blue-400" :
                      job.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
                      job.status === "Failed" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">System Jobs</h3>
            <div className="space-y-3">
              {data.jobs?.schedulerJobs?.map((job, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{job.name}</p>
                      <p className="text-xs text-slate-500">Scheduler Jobs</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    job.status === "Running" ? "bg-blue-500/10 text-blue-400" :
                    job.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
                    job.status === "Failed" ? "bg-red-500/10 text-red-400" :
                    "bg-amber-500/10 text-amber-400"
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
              {data.jobs?.reminderJobs?.map((job, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-blue-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{job.name}</p>
                      <p className="text-xs text-slate-500">Reminder Jobs</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    job.status === "Running" ? "bg-blue-500/10 text-blue-400" :
                    job.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
                    job.status === "Failed" ? "bg-red-500/10 text-red-400" :
                    "bg-amber-500/10 text-amber-400"
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
              {data.jobs?.cleanupJobs?.map((job, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Settings size={16} className="text-purple-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{job.name}</p>
                      <p className="text-xs text-slate-500">Cleanup Jobs</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    job.status === "Running" ? "bg-blue-500/10 text-blue-400" :
                    job.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
                    job.status === "Failed" ? "bg-red-500/10 text-red-400" :
                    "bg-amber-500/10 text-amber-400"
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const PlatformNotifications = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Platform Notifications</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Notification Monitor</h2>
            <p className="text-sm text-slate-500 mt-1">Platform-wide notification statistics and status</p>
          </div>
          <button onClick={loadOperationsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Queued" value={data.notifications?.queuedNotifications ?? 0} icon={Clock} color="amber" />
          <StatCard label="Delivered" value={data.notifications?.deliveredNotifications ?? 0} icon={CheckCircle} color="emerald" />
          <StatCard label="Failed" value={data.notifications?.failedNotifications ?? 0} icon={AlertTriangle} color="red" />
          <StatCard label="Retry Queue" value={data.notifications?.retryQueue ?? 0} icon={RefreshCw} color="blue" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Service Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Push Notifications</p>
                <p className="text-sm font-black text-emerald-400">{data.notifications?.pushStatus || "—"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Firebase</p>
                <p className="text-sm font-black text-emerald-400">{data.notifications?.firebaseStatus || "—"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Email Service</p>
                <p className="text-sm font-black text-emerald-400">{data.notifications?.emailStatus || "—"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">SMS Service</p>
                <p className="text-sm font-black text-blue-400">{data.notifications?.smsStatus || "—"}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Recent Notifications</h3>
            <div className="text-center py-8">
              <Bell size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No recent notifications</p>
              <p className="text-xs text-slate-600 mt-1">Notification statistics update in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const OperationalTimeline = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Operational Timeline</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform History</h2>
            <p className="text-sm text-slate-500 mt-1">Chronological operational events and activities</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Search size={18} />
            </button>
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={18} />
            </button>
            <button onClick={loadOperationsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Recent Events</h3>
          <div className="space-y-3">
            {data.dashboard?.platformEvents?.slice(0, 10).map((event, index) => (
              <div key={index} className="flex items-start gap-4 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">{event.action || "Platform Event"}</p>
                  <p className="text-xs text-slate-500 mt-1">{event.description || "No description available"}</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unknown time"}
                  </p>
                </div>
              </div>
            ))}
            {(!data.dashboard?.platformEvents || data.dashboard.platformEvents.length === 0) && (
              <div className="text-center py-8">
                <Clock size={32} className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No operational events recorded</p>
                <p className="text-xs text-slate-600 mt-1">Events will appear here as platform operations occur</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 size={36} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-100 mb-2">Failed to load operations data</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={loadOperationsData} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Platform Operations</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Enterprise Operations Center</h2>
            <p className="text-sm text-slate-500 mt-1">Platform-wide operational management and monitoring</p>
          </div>
          <button onClick={loadOperationsData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
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
      {activeSection === "dashboard" && <OperationsDashboard />}
      {activeSection === "broadcast" && <BroadcastCenter />}
      {activeSection === "messaging" && <InternalMessaging />}
      {activeSection === "maintenance" && <MaintenanceCenter />}
      {activeSection === "features" && <FeatureFlagManagementView />}
      {activeSection === "jobs" && <BackgroundJobs />}
      {activeSection === "notifications" && <PlatformNotifications />}
      {activeSection === "timeline" && <OperationalTimeline />}
    </div>
  );
};

export default PlatformOperations;
