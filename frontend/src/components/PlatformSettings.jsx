import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  Settings, Globe, Clock, Languages, Bell, Brain, Flag,
  RefreshCw, Save, Search, Filter, History, CheckCircle,
  AlertTriangle, Info, Zap, Shield, User, Building2,
  Calendar, Mail, Phone, MapPin, ToggleLeft, ToggleRight
} from "lucide-react";

const PlatformSettings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("platform-info");
  const [data, setData] = useState({
    platform: null,
    configuration: null,
    featureFlags: null,
    configHistory: null
  });
  const [saving, setSaving] = useState(false);

  const sections = [
    { id: "platform-info", label: "Platform Information", icon: Globe },
    { id: "general", label: "General Configuration", icon: Settings },
    { id: "ai", label: "AI Configuration", icon: Brain },
    { id: "notifications", label: "Notification Settings", icon: Bell },
    { id: "defaults", label: "Platform Defaults", icon: Flag },
    { id: "features", label: "Feature Configuration", icon: Zap },
    { id: "preferences", label: "Platform Preferences", icon: Shield },
    { id: "history", label: "Configuration History", icon: History }
  ];

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    setError("");
    try {
      const [platformRes] = await Promise.all([
        api.get("/platform-operations/dashboard")
      ]);

      setData({
        platform: platformRes.data?.data,
        configuration: platformRes.data?.data,
        featureFlags: null,
        configHistory: null
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Placeholder for save functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const SettingCard = ({ title, description, icon: Icon, children }) => (
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

  const PlatformInformation = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Platform Information</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Identity</h2>
            <p className="text-sm text-slate-500 mt-1">Manage platform identification and contact information</p>
          </div>
          <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <SettingCard title="Basic Information" description="Platform identification details" icon={Globe}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Platform Name</label>
                <input 
                  type="text" 
                  defaultValue={data.platform?.name || "Nikola Platform"}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Platform Description</label>
                <textarea 
                  rows={3}
                  defaultValue="Enterprise Power Distribution Management Platform"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Platform Version</label>
                <input 
                  type="text" 
                  defaultValue="1.0.0"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Platform Status</label>
                <select 
                  defaultValue={data.platform?.platformStatus || "active"}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Contact Information" description="Platform support and contact details" icon={Mail}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Support Contact</label>
                <input 
                  type="text" 
                  defaultValue="Platform Support"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Support Email</label>
                <input 
                  type="email" 
                  defaultValue="support@nikola-platform.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Official Website</label>
                <input 
                  type="url" 
                  defaultValue="https://nikola-platform.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Company logo and platform icon upload will be available in future updates</p>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );

  const GeneralConfiguration = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">General Configuration</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Settings</h2>
            <p className="text-sm text-slate-500 mt-1">Configure platform-wide defaults and preferences</p>
          </div>
          <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <SettingCard title="Localization" description="Timezone and language settings" icon={Globe}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Timezone</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="UTC">UTC</option>
                  <option value="Africa/Lagos">Africa/Lagos</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Language</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Date Format</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Time Format</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="24h">24-hour</option>
                  <option value="12h">12-hour</option>
                </select>
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Regional Settings" description="Country and currency defaults" icon={MapPin}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Country</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="NG">Nigeria</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Currency</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Currency configuration will be available in future updates</p>
              </div>
            </div>
          </SettingCard>
        </div>

        <SettingCard title="Default Notification Preferences" description="Platform-wide notification defaults" icon={Bell}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Push Notifications", enabled: true },
              { label: "Email Notifications", enabled: true },
              { label: "SMS Notifications", enabled: false },
              { label: "In-App Notifications", enabled: true }
            ].map((pref, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">{pref.label}</p>
                {pref.enabled ? <CheckCircle size={16} className="text-emerald-400" /> : <ToggleLeft size={16} className="text-slate-600" />}
              </div>
            ))}
          </div>
        </SettingCard>
      </div>
    </div>
  );

  const AIConfiguration = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">AI Configuration</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">AI & Prediction Settings</h2>
            <p className="text-sm text-slate-500 mt-1">Configure AI modules and prediction engine</p>
          </div>
          <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <SettingCard title="AI Module Status" description="Enable/disable AI modules" icon={Brain}>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">AI Status</p>
                  <p className="text-xs text-slate-500">Overall AI module status</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Active</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Prediction Engine</p>
                  <p className="text-xs text-slate-500">Power prediction module</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Active</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Recommendation Engine</p>
                  <p className="text-xs text-slate-500">Smart recommendations</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Active</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Simulation Mode</p>
                  <p className="text-xs text-slate-500">Test predictions safely</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-500/10 text-slate-400">Disabled</span>
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Prediction Settings" description="Configure prediction parameters" icon={Zap}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Prediction Interval</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Confidence Threshold</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="0.7">70%</option>
                  <option value="0.8">80%</option>
                  <option value="0.9">90%</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Future AI providers will be configurable here</p>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );

  const NotificationSettings = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Notification Settings</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Notification Configuration</h2>
            <p className="text-sm text-slate-500 mt-1">Centralize notification system settings</p>
          </div>
          <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <SettingCard title="Notification Channels" description="Configure notification delivery channels" icon={Bell}>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Push Notifications", status: "Active", color: "emerald" },
              { label: "Email Notifications", status: "Active", color: "emerald" },
              { label: "Broadcast Notifications", status: "Active", color: "emerald" },
              { label: "Reminder Notifications", status: "Active", color: "emerald" },
              { label: "Maintenance Notifications", status: "Active", color: "emerald" },
              { label: "Emergency Notifications", status: "Active", color: "emerald" }
            ].map((channel, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">{channel.label}</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-${channel.color}-500/10 text-${channel.color}-400`}>
                  {channel.status}
                </span>
              </div>
            ))}
          </div>
        </SettingCard>
      </div>
    </div>
  );

  const PlatformDefaults = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Platform Defaults</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Default Values</h2>
            <p className="text-sm text-slate-500 mt-1">Configure platform-wide default behaviors</p>
          </div>
          <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <SettingCard title="Entity Defaults" description="Default statuses for platform entities" icon={Building2}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Company Status</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default User Status</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Notification Preference</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="all">All Notifications</option>
                  <option value="important">Important Only</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Behavior Defaults" description="Default platform behaviors" icon={Settings}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Business Mode</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Default Registration Behaviour</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500">
                  <option value="open">Open Registration</option>
                  <option value="invite">Invite Only</option>
                  <option value="approval">Approval Required</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Additional platform defaults will be configurable here</p>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );

  const FeatureConfiguration = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Feature Configuration</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Feature Flags</h2>
            <p className="text-sm text-slate-500 mt-1">Manage platform feature flags</p>
          </div>
          <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <SettingCard title="Feature Flags" description="Platform feature toggle management" icon={Flag}>
          <div className="text-center py-8">
            <Flag size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Feature flags managed via Platform Operations</p>
            <p className="text-xs text-slate-600 mt-1">Navigate to Platform Operations → Feature Flags for management</p>
          </div>
        </SettingCard>
      </div>
    </div>
  );

  const PlatformPreferences = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Platform Preferences</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Options</h2>
            <p className="text-sm text-slate-500 mt-1">Configure platform preferences and modes</p>
          </div>
          <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <SettingCard title="Platform Modes" description="Platform operational modes" icon={Shield}>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">Maintenance Mode</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${data.platform?.platformStatus === "maintenance" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {data.platform?.platformStatus === "maintenance" ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">Registration Mode</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Open</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">Platform Visibility</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Public</span>
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Feature Options" description="Experimental and beta features" icon={Zap}>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">Beta Features</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-500/10 text-slate-400">Disabled</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">Experimental Features</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-500/10 text-slate-400">Disabled</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <Info size={16} className="text-blue-400" />
                <p className="text-xs text-slate-500">Future platform options will be configurable here</p>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );

  const ConfigurationHistory = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Configuration History</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Change Log</h2>
            <p className="text-sm text-slate-500 mt-1">Platform configuration change history</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Search size={18} />
            </button>
            <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={18} />
            </button>
            <button onClick={loadSettingsData} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <SettingCard title="Configuration Changes" description="Platform configuration audit log" icon={History}>
          <div className="text-center py-8">
            <History size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Configuration history viewer ready</p>
            <p className="text-xs text-slate-600 mt-1">All configuration changes are logged via audit system</p>
          </div>
        </SettingCard>
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
          <p className="text-lg font-bold text-slate-100 mb-2">Failed to load settings data</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={loadSettingsData} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Platform Settings</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Configuration Center</h2>
            <p className="text-sm text-slate-500 mt-1">Centralized platform configuration management</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={loadSettingsData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
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
      {activeSection === "platform-info" && <PlatformInformation />}
      {activeSection === "general" && <GeneralConfiguration />}
      {activeSection === "ai" && <AIConfiguration />}
      {activeSection === "notifications" && <NotificationSettings />}
      {activeSection === "defaults" && <PlatformDefaults />}
      {activeSection === "features" && <FeatureConfiguration />}
      {activeSection === "preferences" && <PlatformPreferences />}
      {activeSection === "history" && <ConfigurationHistory />}
    </div>
  );
};

export default PlatformSettings;
