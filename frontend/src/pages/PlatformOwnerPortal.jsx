import React, { useState, useEffect, useCallback, useRef } from "react";
import PlatformLayout from "../components/PlatformLayout";
import GlobalAnalytics from "../components/GlobalAnalytics";
import PlatformOperations from "../components/PlatformOperations";
import SecurityCenter from "../components/SecurityCenter";
import PlatformSettings from "../components/PlatformSettings";
import PlatformOwnerProfile from "../components/PlatformOwnerProfile";
import CoverageStatesSelector from "../components/CoverageStatesSelector";
import CountrySelector from "../components/CountrySelector";
import api from "../services/api";
import locationService from "../services/locationService";
import { usePlatformRealtime } from "../hooks/usePlatformRealtime";
import {
  Building2, Users, Activity, Cpu, Lock, Settings, User, Gauge,
  ArrowUpRight, Plus, Search, Filter, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, Eye, Edit, Ban, CheckCircle, X, AlertTriangle,
  Globe, Mail, Phone, MapPin, Calendar, Clock, Shield, Layers,
  RefreshCw, Loader2, Trash2, Map, Check, AlertCircle
} from "lucide-react";
import {
  fetchCompanyStats, fetchCompanies, fetchCompanyById,
  createCompany, updateCompany, suspendCompany, activateCompany,
  provisionCompanySuperAdmin
} from "../services/companyService";

/* ─────────────────────────────────────────────────────────────
   SHARED UTILITY COMPONENTS
───────────────────────────────────────────────────────────── */
const PlaceholderCard = ({ title, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 border border-slate-800/80 rounded-[2rem] text-center shadow-2xl relative overflow-hidden group min-h-[400px]">
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-300">
      <Icon size={28} className="animate-pulse" />
    </div>
    <h3 className="text-xl font-black text-slate-100 tracking-tight mb-2">{title}</h3>
    <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 w-fit mx-auto">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
      Coming in next phase
    </div>
    <p className="text-slate-400 text-sm font-medium max-w-sm">
      This operational module is scheduled for implementation in the next phase.
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalizeStatus = (value) => {
    if (!value) return "pending-setup";
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "pending-setup" || normalized === "pending_setup" || normalized === "pending") return "pending-setup";
    return normalized;
  };

  const styles = {
    "pending-setup": "bg-amber-500/10 text-amber-400 border-amber-500/30",
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    suspended: "bg-red-500/10 text-red-400 border-red-500/30",
    inactive: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    archived: "bg-violet-500/10 text-violet-400 border-violet-500/30"
  };

  const labelMap = {
    "pending-setup": "Pending Setup",
    active: "Active",
    suspended: "Suspended",
    inactive: "Inactive",
    archived: "Archived"
  };

  const normalizedStatus = normalizeStatus(status);
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${styles[normalizedStatus] || styles.inactive}`}>
      {labelMap[normalizedStatus] || normalizedStatus}
    </span>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center p-16">
    <Loader2 size={36} className="text-indigo-400 animate-spin" />
  </div>
);

const ExecutiveIntelligencePanel = ({ intelligence }) => {
  if (!intelligence) return null;

  const severityStyles = {
    critical: "border-red-500/30 bg-red-500/10 text-red-300",
    high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  };

  return (
    <section className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Executive intelligence</p>
          <h3 className="text-xl font-black text-slate-100 mt-1">What needs executive attention</h3>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">{intelligence.summary}</p>
        </div>
        <div className="min-w-[112px] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health score</p>
          <p className="text-3xl font-black text-emerald-300">{intelligence.healthScore?.score ?? "-"}<span className="text-sm text-emerald-400"> / 100</span></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mt-5">
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Insights</p>
          <div className="space-y-2 mt-3">
            {(intelligence.insights || []).map((insight, index) => <p key={`${insight}-${index}`} className="text-sm text-slate-200">{insight}</p>)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recommended actions</p>
          <div className="space-y-2 mt-3">
            {(intelligence.recommendations || []).map((recommendation, index) => <p key={`${recommendation}-${index}`} className="text-sm text-indigo-200">{recommendation}</p>)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active risks</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{intelligence.source}</span>
          </div>
          <div className="space-y-2 mt-3 max-h-32 overflow-auto">
            {(intelligence.risks || []).slice(0, 4).map((risk) => <div key={risk.id} className={`rounded-xl border px-3 py-2 text-xs ${severityStyles[risk.severity] || severityStyles.medium}`}><span className="font-bold uppercase">{risk.severity}</span> {risk.message}</div>)}
            {intelligence.risks?.length === 0 && <p className="text-sm text-emerald-300">No active risks detected.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   DASHBOARD STATS CARDS (Task 9)
───────────────────────────────────────────────────────────── */
const StatsCards = ({ stats, loading }) => {
  const cards = [
    { label: "Total Companies", value: stats?.totalCompanies ?? "—", icon: Building2, color: "indigo" },
    { label: "Active Companies", value: stats?.activeCompanies ?? "—", icon: CheckCircle, color: "emerald" },
    { label: "Suspended", value: stats?.suspendedCompanies ?? "—", icon: Ban, color: "red" },
    { label: "Total Users", value: stats?.totalUsers ?? "—", icon: Users, color: "blue" },
    { label: "Total Admins", value: stats?.totalAdmins ?? "—", icon: Shield, color: "purple" },
    { label: "Added This Month", value: stats?.companiesAddedThisMonth ?? "—", icon: ArrowUpRight, color: "amber" }
  ];
  const colorMap = {
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400"
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
            <Icon size={17} />
          </div>
          <div className={`text-2xl font-black ${loading ? "text-slate-600" : "text-slate-100"}`}>
            {loading ? "..." : value.toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 leading-tight">{label}</div>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   REUSABLE ACCESSIBLE FORM FIELD (Fixes Focus/Cursor Bug)
───────────────────────────────────────────────────────────── */
const FormField = ({
  label,
  id,
  name,
  value,
  onChange,
  error,
  type = "text",
  placeholder = "",
  inputRef,
  autoFocus = false,
  required = false,
  disabled = false,
  className = ""
}) => {
  const fieldId = id || name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        id={fieldId}
        name={name || fieldId}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full px-4 py-2.5 rounded-xl bg-slate-800 border text-slate-100 text-sm placeholder-slate-600 outline-none transition-colors disabled:opacity-50
          ${error ? "border-red-500" : "border-slate-700 focus:border-indigo-500"} ${className}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   GLOBAL GEOGRAPHY MODALS & VIEW
───────────────────────────────────────────────────────────── */
const CreateCountryModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: "", code: "", isoCode: "", isActive: true });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (f, v) => {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((e) => ({ ...e, [f]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Country name is required";
    if (!form.code.trim()) e.code = "Country code is required (e.g. NG, GH)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await locationService.createCountry({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        isoCode: form.isoCode.trim().toUpperCase() || undefined,
        isActive: form.isActive
      });
      onCreated?.(res?.country || res?.data || res);
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || "Failed to create country");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-100">Create Country</h2>
            <p className="text-xs text-slate-500">Add a new operational country to Nikola Platform</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <FormField
            label="Country Name"
            id="countryName"
            value={form.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
            placeholder="e.g. Nigeria, Ghana, Kenya"
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Country Code"
              id="countryCode"
              value={form.code}
              onChange={(v) => set("code", v.toUpperCase())}
              error={errors.code}
              placeholder="e.g. NG, GH, KE"
              required
            />
            <FormField
              label="ISO Code (3-letter)"
              id="countryIsoCode"
              value={form.isoCode}
              onChange={(v) => set("isoCode", v.toUpperCase())}
              placeholder="e.g. NGA, GHA, KEN"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="countryIsActive"
              name="countryIsActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="countryIsActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Set country status to Active immediately
            </label>
          </div>
          {submitError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertTriangle size={14} className="flex-shrink-0" /> {submitError}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Create Country
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateStateModal = ({ countries = [], initialCountryId = "", onClose, onCreated }) => {
  const [form, setForm] = useState({
    countryId: initialCountryId || (countries[0]?._id || ""),
    name: "",
    isActive: true
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (f, v) => {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((e) => ({ ...e, [f]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.countryId) e.countryId = "Please select a country";
    if (!form.name.trim()) e.name = "State name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await locationService.createState({
        countryId: form.countryId,
        name: form.name.trim(),
        isActive: form.isActive
      });
      onCreated?.(res?.state || res?.data || res);
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || "Failed to create state");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-100">Create State</h2>
            <p className="text-xs text-slate-500">Add an operational state under a country</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stateCountrySelect" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              id="stateCountrySelect"
              name="stateCountrySelect"
              value={form.countryId}
              onChange={(e) => set("countryId", e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl bg-slate-800 border text-slate-100 text-sm outline-none transition-colors ${
                errors.countryId ? "border-red-500" : "border-slate-700 focus:border-indigo-500"
              }`}
            >
              <option value="">Select country...</option>
              {countries.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code || "N/A"})
                </option>
              ))}
            </select>
            {errors.countryId && <p className="text-xs text-red-400">{errors.countryId}</p>}
          </div>

          <FormField
            label="State Name"
            id="stateName"
            value={form.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
            placeholder="e.g. Kano, Lagos, Greater Accra, Nairobi"
            required
            autoFocus
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              id="stateIsActive"
              name="stateIsActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="stateIsActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Set state status to Active immediately
            </label>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertTriangle size={14} className="flex-shrink-0" /> {submitError}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Create State
          </button>
        </div>
      </div>
    </div>
  );
};

const GlobalGeographyView = ({ onNotify }) => {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");

  const [showCreateCountry, setShowCreateCountry] = useState(false);
  const [showCreateState, setShowCreateState] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingType, setDeletingType] = useState(null); // "country" | "state"
  const [actionLoading, setActionLoading] = useState(false);

  const loadCountries = useCallback(async () => {
    setLoadingCountries(true);
    try {
      const res = await locationService.getCountries();
      const list = Array.isArray(res) ? res : (res?.data || res?.countries || []);
      setCountries(list);
      if (list.length > 0 && !selectedCountryId) {
        setSelectedCountryId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to load countries", err);
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  }, [selectedCountryId]);

  const loadStates = useCallback(async (cId) => {
    if (!cId) {
      setStates([]);
      return;
    }
    setLoadingStates(true);
    try {
      const res = await locationService.getStates(cId);
      const list = Array.isArray(res) ? res : (res?.data || res?.states || []);
      setStates(list);
    } catch (err) {
      console.error("Failed to load states", err);
      setStates([]);
    } finally {
      setLoadingStates(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    if (selectedCountryId) {
      loadStates(selectedCountryId);
    } else {
      setStates([]);
    }
  }, [selectedCountryId, loadStates]);

  const handleCountryCreated = (newCountry) => {
    loadCountries();
    if (newCountry?._id) {
      setSelectedCountryId(newCountry._id);
    }
    onNotify?.(`Country "${newCountry?.name || "New Country"}" created successfully!`, "success");
  };

  const handleStateCreated = (newState) => {
    if (selectedCountryId) {
      loadStates(selectedCountryId);
    }
    onNotify?.(`State "${newState?.name || "New State"}" created successfully!`, "success");
  };

  const handleToggleCountryStatus = async (country) => {
    try {
      await locationService.toggleCountryStatus(country._id, { active: !country.isActive });
      loadCountries();
      onNotify?.(`Country status updated.`, "success");
    } catch (err) {
      onNotify?.(err.response?.data?.message || err.message || "Failed to update country status", "error");
    }
  };

  const handleDeleteCountry = async (country) => {
    setActionLoading(true);
    try {
      await locationService.deleteCountry(country._id);
      loadCountries();
      if (selectedCountryId === country._id) {
        setSelectedCountryId("");
      }
      setDeletingId(null);
      setDeletingType(null);
      onNotify?.(`Country "${country.name}" deleted successfully`, "success");
    } catch (err) {
      onNotify?.(err.response?.data?.message || err.message || "Failed to delete country", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteState = async (state) => {
    setActionLoading(true);
    try {
      await locationService.deleteState(state._id);
      if (selectedCountryId) {
        loadStates(selectedCountryId);
      }
      setDeletingId(null);
      setDeletingType(null);
      onNotify?.(`State "${state.name}" deleted successfully`, "success");
    } catch (err) {
      onNotify?.(err.response?.data?.message || err.message || "Failed to delete state", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const selectedCountry = countries.find((c) => c._id === selectedCountryId);
  const filteredCountries = countries.filter((c) =>
    (c.name || "").toLowerCase().includes(countrySearch.toLowerCase().trim()) ||
    (c.code || "").toLowerCase().includes(countrySearch.toLowerCase().trim())
  );
  const filteredStates = states.filter((s) =>
    (s.name || "").toLowerCase().includes(stateSearch.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Geography Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Globe size={16} />
          </div>
          <div className="text-2xl font-black text-slate-100">{loadingCountries ? "..." : countries.length}</div>
          <div className="text-xs font-semibold text-slate-400">Total Countries</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle size={16} />
          </div>
          <div className="text-2xl font-black text-slate-100">
            {loadingCountries ? "..." : countries.filter((c) => c.isActive !== false && c.status !== "inactive").length}
          </div>
          <div className="text-xs font-semibold text-slate-400">Active Countries</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Map size={16} />
          </div>
          <div className="text-2xl font-black text-slate-100">{loadingStates ? "..." : states.length}</div>
          <div className="text-xs font-semibold text-slate-400">
            States in {selectedCountry ? selectedCountry.name : "Selection"}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1.5 justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateCountry(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Plus size={14} /> Country
            </button>
            <button
              onClick={() => setShowCreateState(true)}
              disabled={countries.length === 0}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <Plus size={14} /> State
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Geography Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Countries List */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-100">Countries</h3>
              <p className="text-xs text-slate-500">Select a country to manage its states</p>
            </div>
            <button
              onClick={() => setShowCreateCountry(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors flex items-center gap-1"
            >
              <Plus size={13} /> Add Country
            </button>
          </div>

          {/* Country Search */}
          <div className="relative my-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="countrySearchInput"
              name="countrySearchInput"
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search countries..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Countries Scroll Area */}
          <div className="space-y-2 flex-1 max-h-[480px] overflow-y-auto pr-1">
            {loadingCountries ? (
              <div className="py-12 text-center"><Spinner /></div>
            ) : filteredCountries.length === 0 ? (
              <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 p-6">
                <Globe size={28} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-300">No countries yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Create your first operational country to get started.</p>
                <button
                  onClick={() => setShowCreateCountry(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Create Country
                </button>
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c._id === selectedCountryId;
                return (
                  <div
                    key={c._id}
                    onClick={() => setSelectedCountryId(c._id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600/15 border-indigo-500/50 shadow-md shadow-indigo-600/10"
                        : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {c.code || "NG"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-100 truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>Code: {c.code}</span>
                          {c.isoCode && <span>· ISO: {c.isoCode}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleCountryStatus(c)}
                        title={c.isActive !== false ? "Active (click to deactivate)" : "Inactive (click to activate)"}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                          c.isActive !== false && c.status !== "inactive"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                        }`}
                      >
                        {c.isActive !== false && c.status !== "inactive" ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => {
                          setDeletingId(c._id);
                          setDeletingType("country");
                        }}
                        title="Delete Country"
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: States under selected country */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-100">
                {selectedCountry ? `States in ${selectedCountry.name}` : "States"}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedCountry
                  ? `${states.length} regional state(s) linked to ${selectedCountry.name}`
                  : "Select a country on the left to view and create states"}
              </p>
            </div>
            {selectedCountry && (
              <button
                onClick={() => setShowCreateState(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors flex items-center gap-1"
              >
                <Plus size={13} /> Add State
              </button>
            )}
          </div>

          {selectedCountry ? (
            <>
              {/* State Search */}
              <div className="relative my-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="stateSearchInput"
                  name="stateSearchInput"
                  type="text"
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  placeholder={`Search states in ${selectedCountry.name}...`}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* States Grid */}
              <div className="space-y-2 flex-1 max-h-[480px] overflow-y-auto pr-1">
                {loadingStates ? (
                  <div className="py-12 text-center"><Spinner /></div>
                ) : filteredStates.length === 0 ? (
                  <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 p-6">
                    <MapPin size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-bold text-slate-300">No states created yet for {selectedCountry.name}</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Add the states or provinces that belong to {selectedCountry.name}.</p>
                    <button
                      onClick={() => setShowCreateState(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Create State
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredStates.map((s) => (
                      <div
                        key={s._id}
                        className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span className="font-bold text-sm text-slate-100 truncate">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                          <button
                            onClick={() => {
                              setDeletingId(s._id);
                              setDeletingType("state");
                            }}
                            title="Delete State"
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
              <Globe size={32} className="text-slate-600 mb-3" />
              <p className="text-sm font-semibold">Select or create a country to manage its states.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Deletions */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-black text-slate-100 mb-1">
              Delete {deletingType === "country" ? "Country" : "State"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to remove this {deletingType}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeletingId(null);
                  setDeletingType(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deletingType === "country") {
                    const c = countries.find((item) => item._id === deletingId);
                    if (c) handleDeleteCountry(c);
                  } else {
                    const s = states.find((item) => item._id === deletingId);
                    if (s) handleDeleteState(s);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateCountry && (
        <CreateCountryModal
          onClose={() => setShowCreateCountry(false)}
          onCreated={handleCountryCreated}
        />
      )}

      {showCreateState && (
        <CreateStateModal
          countries={countries}
          initialCountryId={selectedCountryId}
          onClose={() => setShowCreateState(false)}
          onCreated={handleStateCreated}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   COMPANY CREATION WIZARD (Task 3)
───────────────────────────────────────────────────────────── */
const UTILITY_TYPES = ["Distribution Company", "Mini Grid", "Private Utility", "Industrial Utility"];
const STEPS = ["Basic Info", "Contact & Address", "Configuration & Coverage", "Review"];
const emptyForm = {
  name: "",
  shortName: "",
  code: "",
  utilityType: "",
  country: "",
  countryId: "",
  status: "pending-setup",
  officialEmail: "",
  officialPhone: "",
  primaryContact: "",
  headquarters: { address: "", city: "", state: "", country: "" },
  coverageStates: [],
  subscription: { tier: "standard" },
  logo: ""
};

const CreateCompanyWizard = ({ onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const firstFieldRef = useRef(null);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };
  const setHq = (field, value) => {
    setForm((f) => ({ ...f, headquarters: { ...f.headquarters, [field]: value } }));
    setErrors((e) => ({ ...e, [`hq_${field}`]: "" }));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [step]);

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.name.trim() || form.name.length < 3) e.name = "Company name must be at least 3 characters";
      if (!form.shortName.trim() || form.shortName.length < 2) e.shortName = "Short name must be at least 2 characters";
      if (!form.code.trim() || !/^[A-Z0-9]{3,10}$/.test(form.code.toUpperCase())) e.code = "Code must be 3–10 uppercase alphanumeric characters";
      if (!form.utilityType) e.utilityType = "Select a utility type";
    }
    if (step === 1) {
      if (!form.officialEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.officialEmail)) e.officialEmail = "Valid email required";
      if (!form.officialPhone || form.officialPhone.length < 7) e.officialPhone = "Valid phone number required";
      if (!form.headquarters.address.trim()) e.hq_address = "Address required";
      if (!form.headquarters.city.trim()) e.hq_city = "City required";
      if (!form.headquarters.state.trim()) e.hq_state = "State required";
    }
    if (step === 2) {
      if (!form.country && !form.countryId) {
        e.country = "Select a country for the company";
      }
      if (!form.coverageStates || !Array.isArray(form.coverageStates) || form.coverageStates.length < 1) {
        e.coverageStates = "Select at least 1 coverage state";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        metadata: { description: form.utilityType }
      };
      const result = await createCompany(payload);
      onCreated(result.data);
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || "Failed to create company");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-100">Create New Company</h2>
            <p className="text-xs text-slate-500 mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-6 pt-4">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-indigo-500" : "bg-slate-800"}`} />
          ))}
        </div>

        {/* Step content */}
        <div className="p-6 space-y-4">
          {step === 0 && (
            <>
              <FormField
                label="Company Name"
                id="companyName"
                value={form.name}
                onChange={(v) => set("name", v)}
                error={errors.name}
                inputRef={firstFieldRef}
                autoFocus
                placeholder="e.g. Kano Electricity Distribution Company"
                required
              />
              <FormField
                label="Short Name"
                id="companyShortName"
                value={form.shortName}
                onChange={(v) => set("shortName", v)}
                error={errors.shortName}
                placeholder="e.g. KEDCO"
                required
              />
              <FormField
                label="Company Code (unique uppercase)"
                id="companyCode"
                value={form.code}
                onChange={(v) => set("code", v.toUpperCase())}
                error={errors.code}
                placeholder="e.g. KEDCO"
                required
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="companyUtilityType" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Utility Type <span className="text-red-400">*</span>
                </label>
                <select
                  id="companyUtilityType"
                  name="companyUtilityType"
                  value={form.utilityType}
                  onChange={(e) => set("utilityType", e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-800 border text-slate-100 text-sm outline-none transition-colors ${
                    errors.utilityType ? "border-red-500" : "border-slate-700 focus:border-indigo-500"
                  }`}
                >
                  <option value="">Select utility type...</option>
                  {UTILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.utilityType && <p className="text-xs text-red-400">{errors.utilityType}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="companyLogoFile" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Logo (Optional)</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden p-1">
                    {form.logo ? <img src={form.logo} alt="Preview" className="w-full h-full object-contain" /> : <Building2 size={20} className="text-slate-500" />}
                  </div>
                  <input
                    id="companyLogoFile"
                    name="companyLogoFile"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) return alert("Logo must be under 2MB.");
                        const reader = new FileReader();
                        reader.onloadend = () => set("logo", reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="companyStatus" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Initial Status</label>
                <select
                  id="companyStatus"
                  name="companyStatus"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="pending-setup">Pending Setup</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <FormField
                label="Official Email"
                id="companyEmail"
                type="email"
                value={form.officialEmail}
                onChange={(v) => set("officialEmail", v)}
                error={errors.officialEmail}
                placeholder="info@company.com"
                required
              />
              <FormField
                label="Official Phone"
                id="companyPhone"
                value={form.officialPhone}
                onChange={(v) => set("officialPhone", v)}
                error={errors.officialPhone}
                placeholder="+234 800 000 0000"
                required
              />
              <FormField
                label="Primary Contact Person"
                id="primaryContact"
                value={form.primaryContact}
                onChange={(v) => set("primaryContact", v)}
                error={errors.primaryContact}
                placeholder="Full name of primary contact"
              />
              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Headquarters Location</p>
                <div className="space-y-3">
                  <FormField
                    label="Address"
                    id="hq_address"
                    value={form.headquarters.address}
                    onChange={(v) => setHq("address", v)}
                    error={errors.hq_address}
                    placeholder="123 Main Street"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label="City"
                      id="hq_city"
                      value={form.headquarters.city}
                      onChange={(v) => setHq("city", v)}
                      error={errors.hq_city}
                      placeholder="City"
                      required
                    />
                    <FormField
                      label="State"
                      id="hq_state"
                      value={form.headquarters.state}
                      onChange={(v) => setHq("state", v)}
                      error={errors.hq_state}
                      placeholder="State"
                      required
                    />
                  </div>
                  <FormField
                    label="Country"
                    id="hq_country"
                    value={form.headquarters.country}
                    onChange={(v) => setHq("country", v)}
                    error={errors.hq_country}
                    placeholder="Country name"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="companyTier" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription Tier</label>
                <select
                  id="companyTier"
                  name="companyTier"
                  value={form.subscription.tier}
                  onChange={(e) => setForm((f) => ({ ...f, subscription: { ...f.subscription, tier: e.target.value } }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-4">
                <CountrySelector
                  value={form.country || form.countryId}
                  onChange={(countryVal) => {
                    set("country", countryVal);
                    set("countryId", countryVal);
                    set("coverageStates", []);
                  }}
                  error={errors.country}
                />

                <CoverageStatesSelector
                  countryId={form.country || form.countryId}
                  selectedStates={form.coverageStates}
                  onChange={(states) => {
                    set("coverageStates", states);
                  }}
                  error={errors.coverageStates}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Review Company Details</p>
                {[
                  ["Company Name", form.name],
                  ["Short Name", form.shortName],
                  ["Code", form.code],
                  ["Utility Type", form.utilityType],
                  ["Status", form.status],
                  ["Official Email", form.officialEmail],
                  ["Official Phone", form.officialPhone],
                  ["Address", `${form.headquarters.address}, ${form.headquarters.city}, ${form.headquarters.state}, ${form.headquarters.country || ""}`],
                  ["Coverage States", (form.coverageStates || []).join(", ") || "None"],
                  ["Subscription", form.subscription.tier]
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-slate-700/60 last:border-0">
                    <span className="text-xs text-slate-500 font-semibold">{label}</span>
                    <span className="text-xs text-slate-200 font-bold text-right max-w-[60%]">{value || "—"}</span>
                  </div>
                ))}
              </div>
              {submitError && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{submitError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-slate-800">
          <button
            onClick={step === 0 ? onClose : back}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Create Company
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   CREATE SUCCESS DIALOG
───────────────────────────────────────────────────────────── */
const CreateSuccessDialog = ({ company, onAssign, onLater }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-md shadow-2xl p-6">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
        <CheckCircle size={24} />
      </div>
      <h2 className="text-lg font-black text-slate-100 mb-1">Company Created Successfully!</h2>
      <p className="text-sm text-slate-400 mb-2">
        <strong className="text-slate-200">{company?.name}</strong> ({company?.code}) has been created with status{" "}
        <span className="text-amber-400 font-bold">Pending Setup</span>.
      </p>
      <p className="text-xs text-slate-500 mb-6">
        To activate this company and give them access to Nikola Platform, assign their first Super Admin now.
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={onAssign}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-600/20"
        >
          Assign Super Admin Now
        </button>
        <button
          onClick={onLater}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
        >
          I'll Do It Later
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   PROVISION SUPER ADMIN MODAL
───────────────────────────────────────────────────────────── */
const ProvisionSuperAdminModal = ({ company, onClose, onProvisioned }) => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    temporaryPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  };

  const submit = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.temporaryPassword.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await provisionCompanySuperAdmin(company._id, {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        temporaryPassword: form.temporaryPassword.trim()
      });
      onProvisioned?.(result.data || result);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to provision super admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-100">Assign Super Admin</h2>
            <p className="text-xs text-slate-500">{company?.name} · {company?.code}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              label="Full Name"
              id="adminFullName"
              value={form.fullName}
              onChange={(v) => updateField("fullName", v)}
              placeholder="e.g. Fatima Bello"
              required
            />
            <FormField
              label="Email"
              id="adminEmail"
              type="email"
              value={form.email}
              onChange={(v) => updateField("email", v)}
              placeholder="superadmin@company.com"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              label="Phone Number"
              id="adminPhone"
              value={form.phone}
              onChange={(v) => updateField("phone", v)}
              placeholder="+234 800 000 0000"
              required
            />
            <FormField
              label="Temporary Password"
              id="adminPassword"
              type="password"
              value={form.temporaryPassword}
              onChange={(v) => updateField("temporaryPassword", v)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 text-sm text-slate-400">
            The role will be assigned as Super Admin and the company will be activated automatically once provisioning succeeds.
          </div>
          {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"><AlertTriangle size={14} /> {error}</div>}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Provision Super Admin
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   COMPANY DETAIL DRAWER (Task 4)
───────────────────────────────────────────────────────────── */
const CompanyDetailDrawer = ({ company, onClose, onEdit, onSuspend, onActivate, onAssignSuperAdmin }) => {
  if (!company) return null;

  const info = [
    { icon: Building2, label: "Full Name", value: company.name },
    { icon: Layers, label: "Short Name", value: company.shortName },
    { icon: Shield, label: "Code", value: company.code },
    { icon: Globe, label: "Country", value: company.headquarters?.country || "—" },
    { icon: Activity, label: "Utility Type", value: company.metadata?.description || "Distribution Company" },
    { icon: Mail, label: "Email", value: company.officialEmail },
    { icon: Phone, label: "Phone", value: company.officialPhone },
    {
      icon: MapPin,
      label: "Address",
      value: [company.headquarters?.address, company.headquarters?.city, company.headquarters?.state].filter(Boolean).join(", ") || "—"
    },
    {
      icon: Layers,
      label: "Coverage States",
      value: Array.isArray(company.coverageStates) && company.coverageStates.length > 0
        ? company.coverageStates.map((s) => (typeof s === "string" ? s : s.name)).join(", ")
        : "None"
    },
    { icon: Calendar, label: "Created", value: company.createdAt ? new Date(company.createdAt).toLocaleDateString() : "—" },
    { icon: Clock, label: "Last Active", value: company.lastActivity ? new Date(company.lastActivity).toLocaleDateString() : "—" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden p-1">
              {company.logo ? <img src={company.logo} alt="" className="w-full h-full object-contain" /> : <Building2 size={22} className="text-slate-400" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100">{company.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-indigo-400 font-bold">{company.code}</span>
                <StatusBadge status={company.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Action toolbar */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onEdit(company)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-colors">
              <Edit size={13} /> Edit Details
            </button>
            {!company.assignedSuperAdmin && (
              <button onClick={() => onAssignSuperAdmin(company)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/20 transition-colors">
                <Shield size={13} /> Assign Super Admin
              </button>
            )}
            {company.status === "active" ? (
              <button onClick={() => onSuspend(company)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-colors">
                <Ban size={13} /> Suspend
              </button>
            ) : (
              <button onClick={() => onActivate(company)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition-colors">
                <CheckCircle size={13} /> Activate
              </button>
            )}
          </div>

          {/* Super Admin Status Card */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Super Admin Account</p>
            {company.assignedSuperAdmin ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-100">{company.assignedSuperAdmin.fullName}</p>
                  <p className="text-xs text-slate-400">{company.assignedSuperAdmin.email}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Active</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-400 font-semibold">No Super Admin assigned yet</p>
                <button onClick={() => onAssignSuperAdmin(company)} className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 transition-colors">
                  Assign Now
                </button>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Information</p>
            {info.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5 break-words">{value || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   EDIT COMPANY MODAL (Task 5)
───────────────────────────────────────────────────────────── */
const EditCompanyModal = ({ company, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    name: company?.name || "",
    shortName: company?.shortName || "",
    code: company?.code || "",
    logo: company?.logo || null,
    officialEmail: company?.officialEmail || "",
    officialPhone: company?.officialPhone || "",
    status: company?.status || "active",
    headquarters: {
      address: company?.headquarters?.address || "",
      city: company?.headquarters?.city || "",
      state: company?.headquarters?.state || "",
      country: company?.headquarters?.country || "Nigeria"
    },
    coverageStates: Array.isArray(company?.coverageStates) && company.coverageStates.length > 0
      ? company.coverageStates.map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean)
      : []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setHq = (field, value) => setForm((f) => ({ ...f, headquarters: { ...f.headquarters, [field]: value } }));

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo image file size must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      set("logo", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.coverageStates || !Array.isArray(form.coverageStates) || form.coverageStates.length < 1) {
      setError("At least one coverage state must be selected");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await updateCompany(company._id, form);
      onUpdated(result.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-100">Edit Company</h2>
            <p className="text-xs text-slate-500">{company?.name} · {company?.code}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Company Logo Section */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden p-1">
                {form.logo ? (
                  <img src={form.logo} alt="Company Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 size={24} className="text-slate-500" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Company Logo</span>
                <span className="text-[10px] text-slate-500 block">Optional PNG, JPG or WebP (max 2MB)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors">
                {form.logo ? "Replace" : "Upload"}
                <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleLogoUpload} className="hidden" />
              </label>
              {form.logo && (
                <button type="button" onClick={() => set("logo", null)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-bold transition-colors">
                  Remove
                </button>
              )}
            </div>
          </div>

          <FormField label="Company Name" id="edit_name" value={form.name} onChange={(v) => set("name", v)} />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Short Name" id="edit_short_name" value={form.shortName} onChange={(v) => set("shortName", v)} />
            <FormField label="Code (unique)" id="edit_code" value={form.code} onChange={(v) => set("code", v.toUpperCase())} />
          </div>
          <FormField label="Official Email" id="edit_email" type="email" value={form.officialEmail} onChange={(v) => set("officialEmail", v)} />
          <FormField label="Official Phone" id="edit_phone" value={form.officialPhone} onChange={(v) => set("officialPhone", v)} />
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Headquarters</p>
            <FormField label="Address" id="edit_addr" value={form.headquarters.address} onChange={(v) => setHq("address", v)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City" id="edit_city" value={form.headquarters.city} onChange={(v) => setHq("city", v)} />
              <FormField label="State" id="edit_state" value={form.headquarters.state} onChange={(v) => setHq("state", v)} />
            </div>
            <FormField label="Country" id="edit_country" value={form.headquarters.country} onChange={(v) => setHq("country", v)} />
          </div>
          <div className="border-t border-slate-800 pt-4">
            <CoverageStatesSelector
              selectedStates={form.coverageStates}
              onChange={(states) => setForm((f) => ({ ...f, coverageStates: states }))}
              error={!form.coverageStates || form.coverageStates.length === 0 ? "Select at least 1 state" : ""}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SUSPEND DIALOG (Task 6)
───────────────────────────────────────────────────────────── */
const SuspendDialog = ({ company, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    if (!reason.trim()) { setError("Suspension reason is required"); return; }
    setLoading(true);
    try { await onConfirm(company._id, reason); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-red-500/20 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <Ban size={22} />
          </div>
          <h2 className="text-lg font-black text-slate-100 mb-1">Suspend Company</h2>
          <p className="text-sm text-slate-400 mb-5">
            Suspending <strong className="text-slate-200">{company?.name}</strong> will immediately block all Admin and Super Admin logins. Users remain in read-only mode.
          </p>
          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="suspendReasonText" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suspension Reason *</label>
            <textarea
              id="suspendReasonText"
              name="suspendReasonText"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              rows={3}
              placeholder="Explain why this company is being suspended..."
              className={`w-full px-4 py-3 rounded-xl bg-slate-800 border text-slate-100 text-sm placeholder-slate-600 outline-none resize-none transition-colors ${error ? "border-red-500" : "border-slate-700 focus:border-red-400"}`}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">Cancel</button>
            <button onClick={confirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />} Suspend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ACTIVATE DIALOG (Task 7)
───────────────────────────────────────────────────────────── */
const ActivateDialog = ({ company, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const confirm = async () => {
    setLoading(true);
    try { await onConfirm(company._id); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl w-full max-w-md shadow-2xl p-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle size={22} />
        </div>
        <h2 className="text-lg font-black text-slate-100 mb-1">Reactivate Company</h2>
        <p className="text-sm text-slate-400 mb-6">
          Reactivating <strong className="text-slate-200">{company?.name}</strong> will restore full access for all Admin and Super Admin users without any data loss.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={confirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Reactivate
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   COMPANY MANAGEMENT MODULE (With Integrated Global Geography)
───────────────────────────────────────────────────────────── */
const CompanyManagement = () => {
  const [subTab, setSubTab] = useState("companies"); // "companies" | "geography"
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & sort
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editCompany, setEditCompany] = useState(null);
  const [suspendCompanyTarget, setSuspendCompanyTarget] = useState(null);
  const [activateCompanyTarget, setActivateCompanyTarget] = useState(null);
  const [provisioningCompany, setProvisioningCompany] = useState(null);
  const [createdCompany, setCreatedCompany] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState("info");

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try { const statsData = await fetchCompanyStats(); setStats(statsData); }
    catch { /* silently fail */ }
    finally { setStatsLoading(false); }
  }, []);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCompanies({ page, limit: 8, search, status: statusFilter, sortBy, sortOrder });
      setCompanies(res.companies || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch { setCompanies([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  const handleCompanyRealtimeEvent = useCallback((eventName) => {
    if ([
      "company.created", "company.updated", "company.suspended", "company.activated",
      "user.created", "user.updated", "user.deleted", "admin.created", "superadmin.created", "dashboard.metric.changed"
    ].includes(eventName)) {
      loadStats();
      loadCompanies();
    }
  }, [loadCompanies, loadStats]);

  usePlatformRealtime(handleCompanyRealtimeEvent);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronUp size={12} className="text-slate-600" />;
    return sortOrder === "asc"
      ? <ChevronUp size={12} className="text-indigo-400" />
      : <ChevronDown size={12} className="text-indigo-400" />;
  };

  // Handlers
  const handleCreated = (company) => {
    setShowCreate(false);
    setCreatedCompany(company);
    setFeedbackMessage(`Company "${company?.name || "New Company"}" created. Assign the first super admin to activate it.`);
    setFeedbackTone("info");
    loadStats();
    loadCompanies();
  };
  const handleUpdated = (company) => {
    setEditCompany(null);
    setSelectedCompany(null);
    loadCompanies();
  };
  const handleSuspend = async (id, reason) => {
    await suspendCompany(id, reason);
    setSuspendCompanyTarget(null);
    setSelectedCompany(null);
    loadStats();
    loadCompanies();
  };
  const handleActivate = async (id) => {
    await activateCompany(id);
    setActivateCompanyTarget(null);
    setSelectedCompany(null);
    loadStats();
    loadCompanies();
  };
  const handleProvisioned = async () => {
    setProvisioningCompany(null);
    setCreatedCompany(null);
    setSelectedCompany(null);
    setFeedbackMessage("Super admin provisioned successfully. The company is now active.");
    setFeedbackTone("success");
    loadStats();
    loadCompanies();
  };

  const cols = [
    { key: "name", label: "Company" },
    { key: "code", label: "Code" },
    { key: "status", label: "Status" },
    { key: "superAdmin", label: "Super Admin" },
    { key: "adminsCount", label: "Admins" },
    { key: "usersCount", label: "Users" },
    { key: "createdAt", label: "Created" },
    { key: "lastActivity", label: "Last Active" },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-Navigation: Companies vs Global Geography */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab("companies")}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            subTab === "companies"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 size={16} /> Companies Management ({total || companies.length})
        </button>
        <button
          onClick={() => setSubTab("geography")}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            subTab === "geography"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe size={16} /> Global Geography
        </button>
      </div>

      {feedbackMessage && (
        <div className={`rounded-2xl border px-4 py-3 text-sm flex items-center justify-between ${
          feedbackTone === "success"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : feedbackTone === "error"
            ? "border-red-500/20 bg-red-500/10 text-red-300"
            : "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
        }`}>
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage("")} className="text-slate-400 hover:text-slate-200">
            <X size={14} />
          </button>
        </div>
      )}

      {subTab === "geography" ? (
        <GlobalGeographyView onNotify={(msg, tone = "info") => {
          setFeedbackMessage(msg);
          setFeedbackTone(tone);
        }} />
      ) : (
        <>
          {/* Stats cards */}
          <StatsCards stats={stats} loading={statsLoading} />

          {/* Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="company-search"
                name="company-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search companies..."
                autoComplete="off"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Status filter */}
            <select
              id="status-filter"
              name="status-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => { loadStats(); loadCompanies(); }}
              className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-colors"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Create */}
            <button
              id="create-company-btn"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Plus size={15} /> New Company
            </button>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {cols.map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">{label}<SortIcon col={key} /></div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={cols.length + 1} className="py-16 text-center"><Spinner /></td></tr>
                  ) : companies.length === 0 ? (
                    <tr>
                      <td colSpan={cols.length + 1} className="py-16 text-center text-slate-500 text-sm">
                        {search ? "No companies match your search." : "No companies found. Create your first company."}
                      </td>
                    </tr>
                  ) : (
                    companies.map((c) => (
                      <tr key={c._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-100 text-sm">{c.name}</div>
                          <div className="text-[11px] text-slate-500">{c.shortName}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-400 font-bold">{c.code}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3">
                          {c.assignedSuperAdmin ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-slate-100">{c.assignedSuperAdmin.fullName}</span>
                              <span className="text-[11px] text-slate-500">{c.assignedSuperAdmin.email}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-amber-400 font-semibold">Not assigned</span>
                              <button
                                onClick={() => setProvisioningCompany(c)}
                                className="w-fit rounded-lg bg-amber-600/10 px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-600/20 transition-colors"
                              >
                                Assign Super Admin
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 font-semibold text-center">{c.adminsCount ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 font-semibold text-center">{c.usersCount ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {c.lastActivity ? new Date(c.lastActivity).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              title="View details"
                              onClick={() => setSelectedCompany(c)}
                              className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              title="Edit company"
                              onClick={() => setEditCompany(c)}
                              className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
                            >
                              <Edit size={13} />
                            </button>
                            {!c.assignedSuperAdmin && (
                              <button
                                title="Assign Super Admin"
                                onClick={() => setProvisioningCompany(c)}
                                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              >
                                <Shield size={13} />
                              </button>
                            )}
                            {c.status === "active" ? (
                              <button
                                title="Suspend company"
                                onClick={() => setSuspendCompanyTarget(c)}
                                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Ban size={13} />
                              </button>
                            ) : (
                              <button
                                title="Reactivate company"
                                onClick={() => setActivateCompanyTarget(c)}
                                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                <CheckCircle size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                <p className="text-xs text-slate-500">{total} companies total</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-slate-400 font-semibold">{page} / {pages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals / Drawers */}
      {showCreate && <CreateCompanyWizard onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {createdCompany && (
        <CreateSuccessDialog
          company={createdCompany}
          onAssign={() => { setProvisioningCompany(createdCompany); setCreatedCompany(null); }}
          onLater={() => setCreatedCompany(null)}
        />
      )}
      {selectedCompany && (
        <CompanyDetailDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onEdit={(c) => { setSelectedCompany(null); setEditCompany(c); }}
          onSuspend={(c) => setSuspendCompanyTarget(c)}
          onActivate={(c) => setActivateCompanyTarget(c)}
          onAssignSuperAdmin={(c) => setProvisioningCompany(c)}
        />
      )}
      {provisioningCompany && (
        <ProvisionSuperAdminModal
          company={provisioningCompany}
          onClose={() => setProvisioningCompany(null)}
          onProvisioned={handleProvisioned}
        />
      )}
      {editCompany && <EditCompanyModal company={editCompany} onClose={() => setEditCompany(null)} onUpdated={handleUpdated} />}
      {suspendCompanyTarget && (
        <SuspendDialog company={suspendCompanyTarget} onClose={() => setSuspendCompanyTarget(null)} onConfirm={handleSuspend} />
      )}
      {activateCompanyTarget && (
        <ActivateDialog company={activateCompanyTarget} onClose={() => setActivateCompanyTarget(null)} onConfirm={handleActivate} />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   PLATFORM DASHBOARD (LIVE DATA)
───────────────────────────────────────────────────────────── */
const PlatformDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [summary, setSummary] = useState(null);
  const [metricErrors, setMetricErrors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [missionControl, setMissionControl] = useState(null);
  const [executiveIntelligence, setExecutiveIntelligence] = useState(null);

  const loadDashboard = useCallback(async () => {
    const [dashboardResult, intelligenceResult] = await Promise.allSettled([
      api.get("/platform-analytics/dashboard"),
      api.get("/platform-analytics/executive-intelligence")
    ]);
    if (dashboardResult.status === "rejected") throw dashboardResult.reason;
    const data = dashboardResult.value.data?.data || null;
    setDashboard(data);
    setSummary(data?.overview?.metrics || null);
    setMissionControl(data?.missionControl || null);
    setMetricErrors([
      ...(Array.isArray(data?.overview?.errors) ? data.overview.errors : []),
      ...(Array.isArray(data?.missionControl?.activity?.errors) ? data.missionControl.activity.errors : [])
    ]);
    setActivity(Array.isArray(data?.missionControl?.activity?.recent) ? data.missionControl.activity.recent : []);
    setExecutiveIntelligence(intelligenceResult.status === "fulfilled" ? intelligenceResult.value.data?.data || null : null);
  }, []);

  const handleRealtimeEvent = useCallback(async (eventName) => {
    if (["platform.health.changed", "dashboard.metric.changed"].includes(eventName)) {
      await loadDashboard();
      return;
    }

    // Lifecycle events change the metric and activity snapshots; the existing API remains the fallback source of truth.
    await loadDashboard();
  }, [loadDashboard]);

  const { connected } = usePlatformRealtime(handleRealtimeEvent);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!active) return;
        await loadDashboard();
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || err.message || "Unable to load platform dashboard");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [loadDashboard]);

  const cards = [
    { label: "Suspended Companies", value: summary?.suspendedCompanies ?? "—", icon: Ban, accent: "red" },
    { label: "Total Users", value: summary?.totalUsers ?? "—", icon: Users, accent: "amber" },
    { label: "Total Super Admins", value: summary?.totalSuperAdmins ?? "—", icon: Shield, accent: "blue" },
    { label: "Total Admins", value: summary?.totalAdmins ?? "—", icon: Lock, accent: "purple" },
    { label: "Total Reports", value: summary?.totalReports ?? "—", icon: Activity, accent: "indigo" },
    { label: "Total Notifications", value: summary?.totalNotifications ?? "—", icon: Mail, accent: "amber" }
  ];

  const colorMap = {
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400"
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-sm text-red-300">
          {error}
        </div>
      )}

      {metricErrors.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-sm text-amber-300">
          Some metrics are temporarily unavailable: {metricErrors.map((item) => item.metric).join(", ")}.
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[accent]}`}>
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-black text-slate-100">{value}</div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ["Platform Status", summary?.platformStatus],
              ["Database Status", summary?.databaseStatus],
              ["API Status", summary?.apiStatus]
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                <span className={`text-sm font-bold ${value === "Healthy" ? "text-emerald-400" : value === "Loading" ? "text-slate-400" : "text-amber-400"}`}>
                  {value || "Unavailable"}
                </span>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Platform monitoring</p>
                  <h3 className="text-lg font-black text-slate-100">Mission control health</h3>
                </div>
                <div className="text-sm font-semibold text-indigo-400">
                  {missionControl?.monitoring?.summary?.status || "Unknown"}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ["API", missionControl?.monitoring?.api?.status],
                  ["Database", missionControl?.monitoring?.database?.status],
                  ["AI Engine", missionControl?.monitoring?.ai?.status],
                  ["Notifications", missionControl?.monitoring?.notifications?.status],
                  ["Firebase", missionControl?.monitoring?.notifications?.firebase?.status],
                  ["Email", missionControl?.monitoring?.notifications?.email?.status],
                  ["Push Queue", missionControl?.monitoring?.notifications?.pushQueue?.status],
                  ["Scheduled Jobs", missionControl?.monitoring?.scheduledJobs?.status]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className={`text-lg font-black mt-1 ${value === "Healthy" ? "text-emerald-400" : value === "Unknown" ? "text-slate-400" : "text-amber-400"}`}>{value || "Unknown"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Platform alerts</p>
                  <h3 className="text-lg font-black text-slate-100">Operational attention</h3>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                {(missionControl?.alerts || []).slice(0, 4).map((alert, index) => (
                  <div key={`${alert.type}-${alert.companyId || index}`} className="rounded-2xl bg-slate-800/60 border border-slate-700 p-3">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${alert.severity === "high" ? "text-red-400" : "text-amber-400"}`}>{alert.severity || "Unknown"}</p>
                    <p className="font-semibold text-slate-100 mt-1">{alert.message}</p>
                  </div>
                ))}
                {missionControl?.alerts?.length === 0 && <p className="text-sm text-emerald-400">No operational alerts detected.</p>}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Onboarding pulse</p>
                  <h3 className="text-lg font-black text-slate-100">Recently created companies</h3>
                </div>
              </div>
              <div className="space-y-2">
                {(missionControl?.activity?.recentlyCreatedCompanies || []).slice(0, 5).map((company) => (
                  <div key={company._id} className="flex items-center justify-between rounded-2xl bg-slate-800/60 border border-slate-700 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{company.name}</p>
                      <p className="text-[11px] text-slate-500">{company.code} - {company.status}</p>
                    </div>
                    <div className="text-[11px] text-slate-500">{new Date(company.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
                {missionControl?.activity?.recentlyCreatedCompanies?.length === 0 && <p className="text-sm text-slate-400">No companies have been onboarded yet.</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Recently created Super Admins</p>
                  <div className="space-y-2">
                    {(missionControl?.activity?.recentlyCreatedSuperAdmins || []).slice(0, 3).map((user) => (
                      <div key={user._id} className="text-sm text-slate-300">{user.fullName}<span className="block text-[11px] text-slate-500">{user.email}</span></div>
                    ))}
                    {missionControl?.activity?.recentlyCreatedSuperAdmins?.length === 0 && <p className="text-sm text-slate-400">No Super Admin accounts yet.</p>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Recently registered users</p>
                  <div className="space-y-2">
                    {(missionControl?.activity?.recentlyRegisteredUsers || []).slice(0, 3).map((user) => (
                      <div key={user._id} className="text-sm text-slate-300">{user.fullName}<span className="block text-[11px] text-slate-500">{user.email}</span></div>
                    ))}
                    {missionControl?.activity?.recentlyRegisteredUsers?.length === 0 && <p className="text-sm text-slate-400">No registered users yet.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Recent activity</p>
                  <h3 className="text-lg font-black text-slate-100">Platform timeline</h3>
                </div>
              </div>
              <div className="space-y-2">
                {activity.slice(0, 6).map((item, index) => (
                  <div key={`${item.type}-${index}`} className="flex items-start gap-3 rounded-2xl bg-slate-800/60 border border-slate-700 p-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Activity size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100">{item.description}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.company?.name || "Platform"} - {new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-sm text-slate-400">Platform activity will appear here as companies, users, and operational resources are created.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PORTAL COMPONENT
───────────────────────────────────────────────────────────── */
const PlatformOwnerPortal = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("Platform Owner Route Loaded");
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <PlatformDashboard />;
      case "companies":
        return <CompanyManagement />;
      case "analytics":
        return <GlobalAnalytics />;
      case "operations":
        return <PlatformOperations />;
      case "security":
        return <SecurityCenter />;
      case "settings":
        return <PlatformSettings />;
      case "profile":
        return <PlatformOwnerProfile />;
      default:
        return <PlaceholderCard title="Module Loading" icon={Cpu} />;
    }
  };

  return (
    <PlatformLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </PlatformLayout>
  );
};

export default PlatformOwnerPortal;
