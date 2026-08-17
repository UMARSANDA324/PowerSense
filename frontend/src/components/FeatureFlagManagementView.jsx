import React, { useState, useEffect, useCallback } from "react";
import {
  fetchAllFlags, createFlag, updateFlag, toggleFlag, deleteFlag, fetchFlagAuditHistory
} from "../services/featureFlagService";
import api from "../services/api";
import {
  ToggleLeft, ToggleRight, Plus, Search, Filter, Shield, Activity,
  AlertTriangle, RefreshCw, Loader2, Edit, Trash2, CheckCircle2, XCircle,
  History, Settings, Sliders, Layers, ChevronRight, Eye, Check, X,
  Building2, Globe, UserCheck, AlertCircle
} from "lucide-react";

/**
 * Production-grade Feature Flag & Controlled Rollout Management UI.
 * Allows Platform Owner to create, target, rollout (0-100%), and perform
 * immediate zero-downtime rollbacks for feature releases.
 */
const FeatureFlagManagementView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flags, setFlags] = useState([]);
  const [stats, setStats] = useState({ totalFlags: 0, activeFlags: 0, productionFlags: 0, emergencyDisabledFlags: 0 });
  const [companies, setCompanies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const emptyForm = {
    key: "",
    displayName: "",
    description: "",
    isEnabled: false,
    environment: "production",
    defaultValue: false,
    rolloutPercentage: 0,
    targetRoles: [],
    targetCompanies: [],
    targetStates: [],
    reason: ""
  };
  const [form, setForm] = useState(emptyForm);

  // Load Flags
  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllFlags();
      setFlags(data.flags || []);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
    api.get("/companies").then(res => {
      const list = res.data?.data || res.data || [];
      setCompanies(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, [loadFlags]);

  const loadAuditHistory = async () => {
    try {
      const logs = await fetchFlagAuditHistory();
      setAuditLogs(logs);
      setShowAuditDrawer(true);
    } catch (err) {
      console.error("Failed to load flag audit history:", err);
    }
  };

  // Quick Toggle (Immediate Rollback)
  const handleToggle = async (flag) => {
    try {
      const isDisabling = flag.isEnabled;
      const reason = isDisabling
        ? prompt("Emergency Rollback: Enter reason for disabling feature flag:") || "Emergency Rollback"
        : "Enabled feature flag";

      await toggleFlag(flag._id, reason);
      loadFlags();
    } catch (err) {
      alert("Failed to toggle feature flag: " + err.message);
    }
  };

  // Quick Rollout Change
  const handleRolloutChange = async (flag, newPct) => {
    try {
      await updateFlag(flag._id, {
        rolloutPercentage: Number(newPct),
        reason: `Changed rollout percentage from ${flag.rolloutPercentage}% to ${newPct}%`
      });
      loadFlags();
    } catch (err) {
      alert("Failed to update rollout percentage: " + err.message);
    }
  };

  // Create / Update Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingFlag) {
        await updateFlag(editingFlag._id, form);
      } else {
        await createFlag(form);
      }
      setShowCreateModal(false);
      setEditingFlag(null);
      setForm(emptyForm);
      loadFlags();
    } catch (err) {
      alert("Operation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (flag) => {
    setEditingFlag(flag);
    setForm({
      key: flag.key,
      displayName: flag.displayName,
      description: flag.description || "",
      isEnabled: flag.isEnabled,
      environment: flag.environment || "production",
      defaultValue: flag.defaultValue || false,
      rolloutPercentage: flag.rolloutPercentage || 0,
      targetRoles: flag.targetRoles || [],
      targetCompanies: (flag.targetCompanies || []).map(c => typeof c === "string" ? c : c._id),
      targetStates: flag.targetStates || [],
      reason: ""
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (flag) => {
    if (!window.confirm(`Are you sure you want to delete feature flag '${flag.key}'?`)) return;
    try {
      await deleteFlag(flag._id, "Flag deleted by platform owner");
      loadFlags();
    } catch (err) {
      alert("Failed to delete flag: " + err.message);
    }
  };

  const filteredFlags = flags.filter(f => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || f.key.includes(q) || f.displayName.toLowerCase().includes(q);
    const matchEnv = envFilter === "all" || f.environment === envFilter;
    return matchQ && matchEnv;
  });

  const getStatusBadge = (flag) => {
    if (!flag.isEnabled) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
          <XCircle size={12} /> OFF
        </span>
      );
    }
    const pct = flag.rolloutPercentage;
    let badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    if (pct < 100) badgeColor = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";

    return (
      <span className={`px-2.5 py-1 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-1 ${badgeColor}`}>
        <CheckCircle2 size={12} /> ON — {pct}%
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ===== HEADER & ACTION BAR ===== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">Release Management</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">Feature Flags & Controlled Rollout</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Safely roll out features (0-100%) and perform instant zero-downtime emergency rollbacks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={loadAuditHistory} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-2">
            <History size={14} /> Audit Trail
          </button>
          <button onClick={() => { setEditingFlag(null); setForm(emptyForm); setShowCreateModal(true); }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2">
            <Plus size={16} /> Create Feature Flag
          </button>
        </div>
      </div>

      {/* ===== SUMMARY STATS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase">Total Flags</span>
          <div className="text-2xl font-black text-slate-100">{stats.totalFlags || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase">Active Flags</span>
          <div className="text-2xl font-black text-emerald-400">{stats.activeFlags || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase">In Production</span>
          <div className="text-2xl font-black text-indigo-400">{stats.productionFlags || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase">Emergency Disabled</span>
          <div className="text-2xl font-black text-red-400">{stats.emergencyDisabledFlags || 0}</div>
        </div>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search by key or name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold outline-none focus:border-indigo-500" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500">Env:</span>
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold outline-none">
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
          <button onClick={loadFlags} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ===== FEATURE FLAGS LIST ===== */}
      {loading && flags.length === 0 ? (
        <div className="flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 size={32} className="text-indigo-400 animate-spin" />
        </div>
      ) : filteredFlags.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-sm font-medium">
          No feature flags matched your filter criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlags.map(flag => (
            <div key={flag._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-black text-slate-100">{flag.displayName}</h3>
                    <code className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{flag.key}</code>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{flag.environment}</span>
                    {getStatusBadge(flag)}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{flag.description || "No description provided."}</p>

                  {/* Targeting Info */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400 font-bold">
                    {flag.targetRoles?.length > 0 && <span className="flex items-center gap-1"><Shield size={12} className="text-indigo-400" /> Roles: {flag.targetRoles.join(", ")}</span>}
                    {flag.targetCompanies?.length > 0 && <span className="flex items-center gap-1"><Building2 size={12} className="text-emerald-400" /> Companies: {flag.targetCompanies.map(c => c.code || c.name || c).join(", ")}</span>}
                    {flag.targetStates?.length > 0 && <span className="flex items-center gap-1"><Globe size={12} className="text-amber-400" /> States: {flag.targetStates.join(", ")}</span>}
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* Rollout Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-bold">Rollout:</span>
                    <select value={flag.rolloutPercentage} onChange={e => handleRolloutChange(flag, e.target.value)} disabled={!flag.isEnabled}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-black outline-none disabled:opacity-40">
                      {[0, 1, 5, 10, 25, 50, 75, 100].map(pct => (
                        <option key={pct} value={pct}>{pct}%</option>
                      ))}
                    </select>
                  </div>

                  {/* Emergency Toggle Switch */}
                  <button onClick={() => handleToggle(flag)} title={flag.isEnabled ? "Emergency Rollback: Disable Immediately" : "Enable Feature Flag"}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      flag.isEnabled ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    }`}>
                    {flag.isEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {flag.isEnabled ? "Disable (Rollback)" : "Enable"}
                  </button>

                  {/* Edit & Delete */}
                  <button onClick={() => openEditModal(flag)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(flag)} className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== CREATE / EDIT MODAL ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-black text-slate-100">{editingFlag ? "Edit Feature Flag" : "Create Feature Flag"}</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Flag Key (unique)</label>
                  <input type="text" required disabled={!!editingFlag} value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value.toLowerCase() }))} placeholder="e.g. report_new_experience"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Display Name</label>
                  <input type="text" required value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="e.g. New Report Experience"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold uppercase block mb-1">Description</label>
                <textarea rows="2" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Purpose of this feature flag..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Environment</label>
                  <select value={form.environment} onChange={e => setForm(p => ({ ...p, environment: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 outline-none">
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Status</label>
                  <select value={form.isEnabled ? "true" : "false"} onChange={e => setForm(p => ({ ...p, isEnabled: e.target.value === "true" }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 outline-none">
                    <option value="false">Disabled (OFF)</option>
                    <option value="true">Enabled (ON)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Rollout %</label>
                  <select value={form.rolloutPercentage} onChange={e => setForm(p => ({ ...p, rolloutPercentage: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 outline-none">
                    {[0, 1, 5, 10, 25, 50, 75, 100].map(p => <option key={p} value={p}>{p}%</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <label className="text-slate-400 font-bold uppercase block mb-2">Target Roles (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {["platform-owner", "company-super-admin", "super-admin", "admin", "user"].map(role => {
                    const checked = form.targetRoles.includes(role);
                    return (
                      <button type="button" key={role} onClick={() => {
                        setForm(p => ({
                          ...p,
                          targetRoles: checked ? p.targetRoles.filter(r => r !== role) : [...p.targetRoles, role]
                        }));
                      }} className={`px-3 py-1.5 rounded-lg border font-bold ${checked ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {companies.length > 0 && (
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Target Companies (optional)</label>
                  <select multiple value={form.targetCompanies} onChange={e => {
                    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                    setForm(p => ({ ...p, targetCompanies: selected }));
                  }} className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 h-24">
                    {companies.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-bold uppercase block mb-1">Audit Reason</label>
                <input type="text" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for this configuration change..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 outline-none" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2">
                  {submitting && <Loader2 size={14} className="animate-spin" />} {editingFlag ? "Save Flag" : "Create Flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== AUDIT TRAIL DRAWER ===== */}
      {showAuditDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm" onClick={() => setShowAuditDrawer(false)}>
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-lg h-full p-6 overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2"><History size={18} /> Feature Flag Audit Log</h2>
              <button onClick={() => setShowAuditDrawer(false)} className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-xs">No feature flag audit events recorded.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {auditLogs.map(log => (
                  <div key={log._id} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-400 font-bold mb-1">
                      <span>{log.performedBy?.fullName || "Platform Owner"}</span>
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-200 font-semibold">{log.description}</p>
                    {log.reason && <p className="text-slate-500 italic mt-0.5">Reason: {log.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureFlagManagementView;
