import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import {
  Activity, TrendingUp, TrendingDown, Users, Building2, Globe,
  CheckCircle2, AlertTriangle, RefreshCw, Loader2, ArrowRight,
  Filter, Calendar, ChevronRight, PieChart, ShieldAlert, CheckCircle,
  HelpCircle, Eye, Play, Send, CheckSquare, XCircle, AlertCircle
} from "lucide-react";

/**
 * Production-grade Report Product Analytics Component.
 * Visualizes user adoption, funnel drop-off, usage trends, tenant breakdowns,
 * and product decision indicators using real backend API data.
 */
const ReportAnalyticsView = ({ isPlatformOwner = true, userCompanyId = null }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [companies, setCompanies] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    range: "30d",
    companyId: "all",
    state: "all"
  });

  // Fetch company list for Platform Owner filter dropdown
  useEffect(() => {
    if (isPlatformOwner) {
      const fetchCompanyList = async () => {
        try {
          const res = await api.get("/companies");
          const compList = res.data?.data || res.data || [];
          setCompanies(Array.isArray(compList) ? compList : []);
        } catch (err) {
          console.error("Failed to fetch companies for filter:", err);
        }
      };
      fetchCompanyList();
    }
  }, [isPlatformOwner]);

  // Load Report Analytics API
  const loadReportAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        range: filters.range,
        companyId: isPlatformOwner ? filters.companyId : (userCompanyId || "all"),
        state: filters.state
      });

      const res = await api.get(`/platform-analytics/reports?${params.toString()}`);
      const data = res.data?.data || null;
      setAnalyticsData(data);
    } catch (err) {
      console.error("[Report Analytics] Load error:", err);
      setError(err.response?.data?.message || err.message || "Failed to load Report analytics");
    } finally {
      setLoading(false);
    }
  }, [filters, isPlatformOwner, userCompanyId]);

  useEffect(() => {
    loadReportAnalytics();
  }, [loadReportAnalytics]);

  // Stat card sub-component with period-over-period trend badge
  const StatCard = ({ label, value, trend, icon: Icon, color = "indigo", suffix = "" }) => {
    const colorStyles = {
      indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      red: "bg-red-500/10 border-red-500/20 text-red-400"
    };

    const isPositive = trend > 0;
    const isNeutral = trend === 0 || trend === null || trend === undefined;

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorStyles[color]}`}>
            <Icon size={18} />
          </div>
          {!isNeutral && (
            <div className={`flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full ${
              isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? `+${trend}%` : `${trend}%`}
            </div>
          )}
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            {loading ? "..." : (typeof value === "number" ? value.toLocaleString() : value)}{suffix}
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    );
  };

  const core = analyticsData?.coreMetrics || {};
  const funnel = analyticsData?.funnel || { steps: [] };
  const indicators = analyticsData?.decisionIndicators || {};
  const usageTrend = analyticsData?.usageTrend || [];
  const breakdown = analyticsData?.breakdown || { byCompany: [], byState: [] };

  return (
    <div className="space-y-6 font-sans">
      {/* ===== HEADER & FILTER BAR ===== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">Product Analytics</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
            Report Feature Tracking & Funnel
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Measure end-to-end user adoption, form funnel completion, and system failure rates.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            {["7d", "30d", "90d"].map((r) => (
              <button
                key={r}
                onClick={() => setFilters((prev) => ({ ...prev, range: r }))}
                className={`px-3 py-1.5 rounded-lg transition-colors uppercase ${
                  filters.range === r ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Company Filter (Platform Owner Only) */}
          {isPlatformOwner && (
            <select
              value={filters.companyId}
              onChange={(e) => setFilters((prev) => ({ ...prev, companyId: e.target.value }))}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold outline-none focus:border-indigo-500"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
              ))}
            </select>
          )}

          {/* State Filter */}
          <select
            value={filters.state}
            onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold outline-none focus:border-indigo-500"
          >
            <option value="all">All States</option>
            <option value="Kano">Kano</option>
            <option value="Jigawa">Jigawa</option>
            <option value="Katsina">Katsina</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadReportAnalytics}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors active:scale-95 disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={loadReportAnalytics} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !analyticsData && (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 size={36} className="text-indigo-400 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            Analyzing Report Feature Intelligence...
          </p>
        </div>
      )}

      {/* ===== CORE METRICS GRID ===== */}
      {analyticsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Report Viewed" value={core.reportViewed} trend={core.trends?.viewedTrend} icon={Eye} color="blue" />
          <StatCard label="Report Started" value={core.reportStarted} trend={core.trends?.startedTrend} icon={Play} color="indigo" />
          <StatCard label="Submitted" value={core.reportSubmitted} trend={core.trends?.submittedTrend} icon={Send} color="purple" />
          <StatCard label="Created" value={core.reportsCreated} trend={core.trends?.createdTrend} icon={CheckSquare} color="emerald" />
          <StatCard label="Success Rate" value={core.submissionSuccessRate} suffix="%" trend={core.trends?.successRateTrend} icon={CheckCircle2} color="emerald" />
          <StatCard label="Failure Rate" value={core.submissionFailureRate} suffix="%" trend={core.trends?.failureRateTrend} icon={XCircle} color="red" />
          <StatCard label="Unique Users" value={core.uniqueReportingUsers} trend={core.trends?.uniqueUsersTrend} icon={Users} color="amber" />
        </div>
      )}

      {/* ===== PRODUCT DECISION INDICATORS ===== */}
      {analyticsData && indicators && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Actionable Insights</span>
              <h3 className="text-lg font-black text-slate-100 mt-0.5">Product Decision Indicators</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300">
              Strategy Guidance
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {(indicators.signals || []).map((sig) => (
              <div key={sig.label} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">{sig.label}</span>
                <span className={`text-sm font-black tracking-tight uppercase ${
                  sig.color === "emerald" ? "text-emerald-400" : sig.color === "amber" ? "text-amber-400" : sig.color === "red" ? "text-red-400" : "text-indigo-400"
                }`}>
                  {sig.value}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
            <HelpCircle size={20} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1">Strategic Recommendation</p>
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                {indicators.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== REPORT FUNNEL VISUALIZATION ===== */}
      {analyticsData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Completion Journey</span>
              <h3 className="text-xl font-black text-slate-100 mt-0.5">Report Conversion Funnel</h3>
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
              Overall Conversion: {funnel.overallConversionRate}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(funnel.steps || []).map((st, idx) => {
              const maxCount = funnel.steps[0]?.count || 1;
              const barHeightPct = Math.max(8, Math.round((st.count / maxCount) * 100));

              return (
                <div key={st.step} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative group hover:border-indigo-500/40 transition-colors">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
                      <span>Step {idx + 1}</span>
                      <span className="text-indigo-400">{st.conversionFromPrevious}% {idx > 0 ? "retained" : ""}</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-100 mb-1">{st.label}</h4>
                    <div className="text-2xl font-black text-indigo-300">{st.count.toLocaleString()}</div>
                  </div>

                  {/* Progress Bar Visualizer */}
                  <div className="my-4 space-y-1">
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${barHeightPct}%` }} />
                    </div>
                    {st.dropoffCount > 0 && (
                      <span className="text-[10px] font-bold text-red-400 block text-right">
                        -{st.dropoffCount.toLocaleString()} dropped off
                      </span>
                    )}
                  </div>

                  {idx < funnel.steps.length - 1 && (
                    <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 items-center justify-center text-indigo-400 z-10">
                      <ChevronRight size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== USAGE TREND TIME-SERIES CHART ===== */}
      {analyticsData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Activity Over Time</span>
              <h3 className="text-xl font-black text-slate-100 mt-0.5">Daily Report Usage Trend</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Viewed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Started</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Created</span>
            </div>
          </div>

          {usageTrend.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-medium">
              No analytics event data recorded for the selected period.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-48 flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-2 border-b border-slate-800 overflow-x-auto">
                {usageTrend.slice(-30).map((day) => {
                  const maxDayVal = Math.max(...usageTrend.map((d) => Math.max(d.viewed, d.created, 1)));
                  const createdH = Math.max(4, Math.round((day.created / maxDayVal) * 100));
                  const viewedH = Math.max(4, Math.round((day.viewed / maxDayVal) * 100));

                  return (
                    <div key={day.date} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-950 border border-slate-700 text-slate-100 p-2 rounded-xl text-[10px] whitespace-nowrap shadow-xl z-20 pointer-events-none">
                        <span className="font-bold border-b border-slate-800 pb-1 mb-1">{day.date}</span>
                        <span>Viewed: {day.viewed}</span>
                        <span>Started: {day.started}</span>
                        <span>Submitted: {day.submitted}</span>
                        <span className="text-emerald-400 font-bold">Created: {day.created}</span>
                        {day.failed > 0 && <span className="text-red-400 font-bold">Failed: {day.failed}</span>}
                      </div>

                      <div className="w-full flex items-end justify-center gap-0.5 h-36">
                        <div className="w-1.5 sm:w-2.5 bg-blue-500/50 group-hover:bg-blue-500 rounded-t transition-all" style={{ height: `${viewedH}%` }} />
                        <div className="w-1.5 sm:w-2.5 bg-emerald-500 group-hover:bg-emerald-400 rounded-t transition-all" style={{ height: `${createdH}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== COMPANY & GEOGRAPHIC BREAKDOWN ===== */}
      {analyticsData && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Company Adoption Breakdown */}
          {isPlatformOwner && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Tenant Adoption</span>
                  <h3 className="text-lg font-black text-slate-100 mt-0.5">Report Usage by Company</h3>
                </div>
                <Building2 size={20} className="text-slate-500" />
              </div>

              {breakdown.byCompany?.length === 0 ? (
                <p className="text-slate-500 text-sm p-4 text-center">No company usage events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="pb-3">Company</th>
                        <th className="pb-3 text-right">Viewed</th>
                        <th className="pb-3 text-right">Started</th>
                        <th className="pb-3 text-right">Created</th>
                        <th className="pb-3 text-right">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {breakdown.byCompany.map((c) => (
                        <tr key={c.companyId} className="hover:bg-slate-800/40">
                          <td className="py-3 font-bold text-slate-200">
                            {c.companyName} <span className="text-[10px] font-mono text-slate-500">({c.companyCode})</span>
                          </td>
                          <td className="py-3 text-right text-slate-400 font-mono">{c.viewed}</td>
                          <td className="py-3 text-right text-slate-400 font-mono">{c.started}</td>
                          <td className="py-3 text-right font-black text-emerald-400 font-mono">{c.created}</td>
                          <td className="py-3 text-right font-black text-indigo-300 font-mono">{c.successRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Geographic State Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Regional Footprint</span>
                <h3 className="text-lg font-black text-slate-100 mt-0.5">Report Usage by State</h3>
              </div>
              <Globe size={20} className="text-slate-500" />
            </div>

            {breakdown.byState?.length === 0 ? (
              <p className="text-slate-500 text-sm p-4 text-center">No state usage events recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="pb-3">State</th>
                      <th className="pb-3 text-right">Viewed</th>
                      <th className="pb-3 text-right">Started</th>
                      <th className="pb-3 text-right">Created</th>
                      <th className="pb-3 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {breakdown.byState.map((s) => (
                      <tr key={s.state} className="hover:bg-slate-800/40">
                        <td className="py-3 font-bold text-slate-200">{s.state}</td>
                        <td className="py-3 text-right text-slate-400 font-mono">{s.viewed}</td>
                        <td className="py-3 text-right text-slate-400 font-mono">{s.started}</td>
                        <td className="py-3 text-right font-black text-emerald-400 font-mono">{s.created}</td>
                        <td className="py-3 text-right font-black text-indigo-300 font-mono">{s.successRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAnalyticsView;
