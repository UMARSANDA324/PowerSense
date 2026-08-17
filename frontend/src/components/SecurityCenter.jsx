import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  Shield, Activity, FileText, Users, Clock, Lock, Settings,
  AlertTriangle, CheckCircle, RefreshCw, Search, Filter, Calendar,
  ChevronDown, ChevronUp, Eye, Ban, Unlock, Key, Zap, History,
  Bell, Globe, Server, Database, UserCheck, UserX, LogOut,
  Building2, Flag, Send, Wrench, User
} from "lucide-react";

const SecurityCenter = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [data, setData] = useState({
    dashboard: null,
    sessions: null,
    loginHistory: null,
    compliance: null,
    backup: null
  });

  const sections = [
    { id: "dashboard", label: "Security Dashboard", icon: Shield },
    { id: "audit", label: "Audit Center", icon: FileText },
    { id: "sessions", label: "Session Management", icon: Users },
    { id: "login-history", label: "Login History", icon: History },
    { id: "account-security", label: "Account Security", icon: Lock },
    { id: "policies", label: "Security Policies", icon: Settings },
    { id: "risk", label: "Risk Monitoring", icon: AlertTriangle },
    { id: "notifications", label: "Security Notifications", icon: Bell }
  ];

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardRes, sessionsRes, loginHistoryRes, complianceRes, backupRes] = await Promise.all([
        api.get("/platform-security/dashboard"),
        api.get("/platform-security/sessions"),
        api.get("/platform-security/login-history"),
        api.get("/platform-security/compliance"),
        api.get("/platform-security/backup-recovery")
      ]);

      setData({
        dashboard: dashboardRes.data?.data,
        sessions: sessionsRes.data?.data,
        loginHistory: loginHistoryRes.data?.data,
        compliance: complianceRes.data?.data,
        backup: backupRes.data?.data
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color = "indigo", trend }) => {
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
          {trend && (
            <span className={`text-xs font-bold ${trend > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {trend > 0 ? "+" : ""}{trend}%
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-slate-100 mb-1">{value}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    );
  };

  const SecurityDashboard = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Security Dashboard</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Security Overview</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time security metrics and monitoring</p>
          </div>
          <button onClick={loadSecurityData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Security Score" value={data.dashboard?.overallSecurityScore ?? 0} icon={Shield} color="indigo" />
          <StatCard label="Active Sessions" value={data.dashboard?.onlineUsers ?? 0} icon={Users} color="blue" />
          <StatCard label="Failed Logins" value={data.dashboard?.failedLoginAttempts ?? 0} icon={Ban} color="red" />
          <StatCard label="Successful Logins" value={data.dashboard?.successfulLogins ?? 0} icon={CheckCircle} color="emerald" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Locked Accounts" value={data.dashboard?.lockedAccounts ?? 0} icon={Lock} color="amber" />
          <StatCard label="Disabled Accounts" value={data.dashboard?.lockedAccounts ?? 0} icon={UserX} color="red" />
          <StatCard label="Security Alerts" value={data.dashboard?.systemAlerts ?? 0} icon={AlertTriangle} color="red" />
          <StatCard label="Suspicious Activity" value={data.dashboard?.suspiciousActivities ?? 0} icon={Zap} color="purple" />
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
                <p className="text-sm text-slate-400">Platform Owners</p>
                <p className="text-sm font-black text-slate-100">{data.dashboard?.activePlatformOwners ?? 0}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Company Owners</p>
                <p className="text-sm font-black text-slate-100">{data.dashboard?.activeCompanyOwners ?? 0}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Total Companies</p>
                <p className="text-sm font-black text-slate-100">{data.dashboard?.companyCount ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Recent Security Events</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Failed Login Attempts</p>
                <p className="text-sm font-black text-red-400">{data.dashboard?.failedLoginAttempts ?? 0}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Suspicious Activities</p>
                <p className="text-sm font-black text-purple-400">{data.dashboard?.suspiciousActivities ?? 0}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Expired Sessions</p>
                <p className="text-sm font-black text-amber-400">{data.dashboard?.expiredSessions ?? 0}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">System Alerts</p>
                <p className="text-sm font-black text-red-400">{data.dashboard?.systemAlerts ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const AuditCenter = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Audit Center</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Immutable Audit Logs</h2>
            <p className="text-sm text-slate-500 mt-1">Complete platform activity history</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Search size={18} />
            </button>
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={18} />
            </button>
            <button onClick={loadSecurityData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Audit Log Categories</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Authentication", icon: Key },
              { label: "Authorization", icon: Shield },
              { label: "Company Management", icon: Building2 },
              { label: "Platform Operations", icon: Server },
              { label: "Feature Flags", icon: Flag },
              { label: "Configuration", icon: Settings },
              { label: "Broadcasts", icon: Send },
              { label: "Maintenance", icon: Wrench }
            ].map((category, index) => (
              <div key={index} className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <category.icon size={16} className="text-indigo-400" />
                <p className="text-sm font-semibold text-slate-100">{category.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Recent Audit Entries</h3>
          <div className="text-center py-8">
            <FileText size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Audit log viewer ready</p>
            <p className="text-xs text-slate-600 mt-1">All platform activities are logged immutably</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SessionManagement = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Session Management</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Active Sessions</h2>
            <p className="text-sm text-slate-500 mt-1">Monitor and manage active platform sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">
              <LogOut size={16} />
              Emergency Logout
            </button>
            <button onClick={loadSecurityData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Sessions" value={data.sessions?.activeSessions ?? 0} icon={Users} color="blue" />
          <StatCard label="Company Sessions" value={data.sessions?.companySessions ?? 0} icon={Building2} color="indigo" />
          <StatCard label="Admin Sessions" value={data.sessions?.adminSessions ?? 0} icon={Shield} color="purple" />
          <StatCard label="Platform Sessions" value={data.sessions?.platformSessions ?? 0} icon={Server} color="emerald" />
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Session Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Terminate Selected Session", icon: Ban, color: "red" },
              { label: "Terminate User Sessions", icon: UserX, color: "amber" },
              { label: "Terminate Company Sessions", icon: Building2, color: "blue" },
              { label: "Emergency Logout", icon: AlertTriangle, color: "red" }
            ].map((action, index) => (
              <button key={index} className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 hover:bg-slate-800 transition-colors">
                <action.icon size={16} className={`text-${action.color}-400`} />
                <p className="text-sm font-semibold text-slate-100">{action.label}</p>
              </button>
            ))}
          </div>
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
            <p className="text-sm text-slate-500 mt-1">Complete login and logout activity log</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Search size={18} />
            </button>
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={18} />
            </button>
            <button onClick={loadSecurityData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Recent Login Activity</h3>
          <div className="text-center py-8">
            <History size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Login history viewer ready</p>
            <p className="text-xs text-slate-600 mt-1">All authentication events are logged</p>
          </div>
        </div>
      </div>
    </div>
  );

  const AccountSecurity = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Account Security</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Account Management</h2>
            <p className="text-sm text-slate-500 mt-1">Platform Owner account security actions</p>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Account Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Lock Account", icon: Lock, color: "amber" },
              { label: "Unlock Account", icon: Unlock, color: "emerald" },
              { label: "Disable Account", icon: Ban, color: "red" },
              { label: "Enable Account", icon: CheckCircle, color: "emerald" },
              { label: "Force Password Reset", icon: Key, color: "blue" },
              { label: "Force Logout", icon: LogOut, color: "red" }
            ].map((action, index) => (
              <button key={index} className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 hover:bg-slate-800 transition-colors">
                <action.icon size={16} className={`text-${action.color}-400`} />
                <p className="text-sm font-semibold text-slate-100">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Target Roles</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "User", icon: User },
              { label: "Admin", icon: Shield },
              { label: "Super Admin", icon: UserCheck },
              { label: "Company Owner", icon: Building2 }
            ].map((role, index) => (
              <div key={index} className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <role.icon size={16} className="text-indigo-400" />
                <p className="text-sm font-semibold text-slate-100">{role.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const SecurityPolicies = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Security Policies</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Security Policies</h2>
            <p className="text-sm text-slate-500 mt-1">Centralized security policy management</p>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Current Policies</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Key size={16} className="text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Password Length</p>
                  <p className="text-xs text-slate-500">Minimum password length requirement</p>
                </div>
              </div>
              <p className="text-sm font-black text-slate-100">{data.dashboard?.policies?.minimumPasswordLength ?? 12} characters</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Password Complexity</p>
                  <p className="text-xs text-slate-500">Password complexity requirement</p>
                </div>
              </div>
              <p className="text-sm font-black text-slate-100">{data.dashboard?.policies?.passwordComplexity ?? "strong"}</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Session Timeout</p>
                  <p className="text-xs text-slate-500">Automatic session timeout duration</p>
                </div>
              </div>
              <p className="text-sm font-black text-slate-100">{data.dashboard?.policies?.sessionTimeoutMinutes ?? 30} minutes</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Ban size={16} className="text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Max Login Attempts</p>
                  <p className="text-xs text-slate-500">Maximum failed login attempts before lockout</p>
                </div>
              </div>
              <p className="text-sm font-black text-slate-100">{data.dashboard?.policies?.maxLoginAttempts ?? 5} attempts</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Lockout Duration</p>
                  <p className="text-xs text-slate-500">Account lockout duration after failed attempts</p>
                </div>
              </div>
              <p className="text-sm font-black text-slate-100">{data.dashboard?.policies?.lockoutDurationMinutes ?? 15} minutes</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Key size={16} className="text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">JWT Expiration</p>
                  <p className="text-xs text-slate-500">JWT token expiration time</p>
                </div>
              </div>
              <p className="text-sm font-black text-slate-100">{data.dashboard?.policies?.jwtExpirationMinutes ?? 60} minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RiskMonitoring = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Risk Monitoring</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Risk Assessment</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time risk monitoring and scoring</p>
          </div>
          <button onClick={loadSecurityData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-6">
          <h3 className="text-lg font-black text-slate-100 mb-4">Overall Risk Score</h3>
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center text-3xl font-black ${
              data.dashboard?.overallSecurityScore < 30 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              data.dashboard?.overallSecurityScore < 60 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
              "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {data.dashboard?.overallSecurityScore ?? 0}
            </div>
            <div>
              <p className="text-sm text-slate-400">Risk Level</p>
              <p className={`text-lg font-black ${
                data.dashboard?.overallSecurityScore < 30 ? "text-emerald-400" :
                data.dashboard?.overallSecurityScore < 60 ? "text-amber-400" :
                "text-red-400"
              }`}>
                {data.dashboard?.overallSecurityScore < 30 ? "Low Risk" :
                 data.dashboard?.overallSecurityScore < 60 ? "Medium Risk" :
                 "High Risk"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Risk Factors</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Ban size={16} className="text-red-400" />
                <p className="text-sm font-semibold text-slate-100">Repeated Login Failures</p>
              </div>
              <p className="text-sm font-black text-red-400">{data.dashboard?.failedLoginAttempts ?? 0}</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-amber-400" />
                <p className="text-sm font-semibold text-slate-100">Permission Escalation Attempts</p>
              </div>
              <p className="text-sm font-black text-amber-400">0</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Activity size={16} className="text-purple-400" />
                <p className="text-sm font-semibold text-slate-100">Abnormal API Usage</p>
              </div>
              <p className="text-sm font-black text-purple-400">0</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <UserX size={16} className="text-amber-400" />
                <p className="text-sm font-semibold text-slate-100">Inactive Super Admins</p>
              </div>
              <p className="text-sm font-black text-amber-400">0</p>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Key size={16} className="text-red-400" />
                <p className="text-sm font-semibold text-slate-100">Multiple Failed Tokens</p>
              </div>
              <p className="text-sm font-black text-red-400">0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SecurityNotifications = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Security Notifications</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Security Alerts</h2>
            <p className="text-sm text-slate-500 mt-1">Platform security notifications and alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={18} />
            </button>
            <button onClick={loadSecurityData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">Recent Security Notifications</h3>
          <div className="text-center py-8">
            <Bell size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No recent security notifications</p>
            <p className="text-xs text-slate-600 mt-1">Security alerts will appear here</p>
          </div>
        </div>
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
          <p className="text-lg font-bold text-slate-100 mb-2">Failed to load security data</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={loadSecurityData} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Security Center</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Enterprise Security Operations</h2>
            <p className="text-sm text-slate-500 mt-1">Platform-wide security monitoring and management</p>
          </div>
          <button onClick={loadSecurityData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
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
      {activeSection === "dashboard" && <SecurityDashboard />}
      {activeSection === "audit" && <AuditCenter />}
      {activeSection === "sessions" && <SessionManagement />}
      {activeSection === "login-history" && <LoginHistory />}
      {activeSection === "account-security" && <AccountSecurity />}
      {activeSection === "policies" && <SecurityPolicies />}
      {activeSection === "risk" && <RiskMonitoring />}
      {activeSection === "notifications" && <SecurityNotifications />}
    </div>
  );
};

export default SecurityCenter;
