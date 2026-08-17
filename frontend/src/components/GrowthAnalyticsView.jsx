import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import {
  Users, TrendingUp, TrendingDown, Activity, UserPlus, Building2,
  Globe, RefreshCw, Loader2, AlertCircle, Shield, Repeat,
  ChevronRight, HelpCircle, ArrowRight, DollarSign, Share2,
  Eye, Target, BarChart3, Zap
} from "lucide-react";

/**
 * Production-grade Product Growth Analytics (AARRR + DAU/WAU/MAU + Retention + Stickiness).
 * All metrics are real API data, never hardcoded.
 */
const GrowthAnalyticsView = ({ isPlatformOwner = true, userCompanyId = null }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({ range: "30d", companyId: "all", state: "all" });

  useEffect(() => {
    if (isPlatformOwner) {
      api.get("/companies").then(res => {
        const list = res.data?.data || res.data || [];
        setCompanies(Array.isArray(list) ? list : []);
      }).catch(() => {});
    }
  }, [isPlatformOwner]);

  const loadGrowth = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        range: filters.range,
        companyId: isPlatformOwner ? filters.companyId : (userCompanyId || "all"),
        state: filters.state
      });
      const res = await api.get(`/platform-analytics/growth?${params.toString()}`);
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load growth analytics");
    } finally {
      setLoading(false);
    }
  }, [filters, isPlatformOwner, userCompanyId]);

  useEffect(() => { loadGrowth(); }, [loadGrowth]);

  const ov = data?.overview || {};
  const aarrr = data?.aarrr || {};
  const trends = data?.growthTrends || [];
  const breakdown = data?.breakdown || {};
  const guidance = data?.decisionGuidance || {};

  // --- Sub-components ---

  const BigMetricCard = ({ label, value, trend, icon: Icon, color = "indigo", suffix = "", unavailable = false }) => {
    const colors = {
      indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      red: "bg-red-500/10 border-red-500/20 text-red-400",
      slate: "bg-slate-500/10 border-slate-500/20 text-slate-400"
    };
    const isUp = trend > 0;
    const isNeutral = trend === 0 || trend === null || trend === undefined;
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:border-slate-700 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
            <Icon size={18} />
          </div>
          {!unavailable && !isNeutral && (
            <div className={`flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full ${
              isUp ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isUp ? `+${trend}%` : `${trend}%`}
            </div>
          )}
        </div>
        <div>
          {unavailable ? (
            <div className="text-sm font-bold text-slate-500 italic">Not yet available</div>
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {loading ? "..." : (typeof value === "number" ? value.toLocaleString() : value)}{suffix}
            </div>
          )}
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    );
  };

  const StickinessGauge = ({ value, label }) => {
    const pct = Math.min(100, Math.max(0, value || 0));
    let barColor = "bg-red-500";
    if (pct >= 25) barColor = "bg-emerald-500";
    else if (pct >= 15) barColor = "bg-amber-500";
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
          <span className="text-xl font-black text-slate-100">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ===== HEADER & FILTERS ===== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">AARRR Framework</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1">Product Growth Analytics</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            DAU / WAU / MAU · Acquisition · Activation · Retention · Stickiness
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            {["7d", "30d", "90d"].map(r => (
              <button key={r} onClick={() => setFilters(p => ({ ...p, range: r }))}
                className={`px-3 py-1.5 rounded-lg transition-colors uppercase ${filters.range === r ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}>
                {r}
              </button>
            ))}
          </div>
          {isPlatformOwner && (
            <select value={filters.companyId} onChange={e => setFilters(p => ({ ...p, companyId: e.target.value }))}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold outline-none focus:border-emerald-500">
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
          <select value={filters.state} onChange={e => setFilters(p => ({ ...p, state: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold outline-none focus:border-emerald-500">
            <option value="all">All States</option>
            <option value="Kano">Kano</option>
            <option value="Jigawa">Jigawa</option>
            <option value="Katsina">Katsina</option>
          </select>
          <button onClick={loadGrowth} disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors active:scale-95 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-3"><AlertCircle size={20} /><span>{error}</span></div>
          <button onClick={loadGrowth} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 size={36} className="text-emerald-400 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Aggregating Growth Intelligence...</p>
        </div>
      )}

      {/* ===== PRIMARY METRICS: DAU / WAU / MAU ===== */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <BigMetricCard label="DAU" value={ov.dau} trend={ov.trends?.dauTrend} icon={Activity} color="emerald" />
            <BigMetricCard label="WAU" value={ov.wau} trend={ov.trends?.wauTrend} icon={Users} color="blue" />
            <BigMetricCard label="MAU" value={ov.mau} trend={ov.trends?.mauTrend} icon={Users} color="indigo" />
            <BigMetricCard label="DAU / MAU Stickiness" value={ov.dauMauStickiness} suffix="%" trend={ov.trends?.stickinessTrend} icon={Target} color="purple" />
            <BigMetricCard label="Activation Rate" value={ov.activationRate} suffix="%" trend={ov.trends?.activationTrend} icon={Zap} color="amber" />
            <BigMetricCard label="New Registrations" value={ov.newRegistrations} trend={ov.trends?.registrationsTrend} icon={UserPlus} color="emerald" />
          </div>

          {/* ===== RETENTION STRIP ===== */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <StickinessGauge value={ov.retention7DayRate} label="7-Day Retention" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <StickinessGauge value={ov.retention30DayRate} label="30-Day Retention" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <StickinessGauge value={ov.dauMauStickiness} label="DAU / MAU Stickiness" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New vs Returning</span>
              <div className="mt-2 flex items-end gap-4">
                <div>
                  <div className="text-xl font-black text-emerald-400">{(aarrr.retention?.newActiveUsers ?? 0).toLocaleString()}</div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">New</span>
                </div>
                <div>
                  <div className="text-xl font-black text-blue-400">{(aarrr.retention?.returningActiveUsers ?? 0).toLocaleString()}</div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Returning</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== AARRR FRAMEWORK CARDS ===== */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Growth Framework</span>
              <span className="text-[10px] font-bold text-slate-500">AARRR Pirate Metrics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Acquisition */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"><UserPlus size={16} /></div>
                  <span className="text-xs font-black text-emerald-400 uppercase">Acquisition</span>
                </div>
                <div className="text-2xl font-black text-slate-100">{(aarrr.acquisition?.newRegistrations ?? 0).toLocaleString()}</div>
                <span className="text-[10px] text-slate-500 font-bold">New Users</span>
                {isPlatformOwner && <div className="text-lg font-black text-slate-300 mt-1">{(aarrr.acquisition?.newCompanies ?? 0).toLocaleString()} <span className="text-[10px] text-slate-500">Companies</span></div>}
              </div>

              {/* Activation */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400"><Zap size={16} /></div>
                  <span className="text-xs font-black text-amber-400 uppercase">Activation</span>
                </div>
                <div className="text-2xl font-black text-slate-100">{(aarrr.activation?.activationRate ?? 0)}%</div>
                <span className="text-[10px] text-slate-500 font-bold">{(aarrr.activation?.activatedUsers ?? 0)} of {(aarrr.activation?.registeredUsers ?? 0)} activated</span>
              </div>

              {/* Retention */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><Repeat size={16} /></div>
                  <span className="text-xs font-black text-blue-400 uppercase">Retention</span>
                </div>
                <div className="text-2xl font-black text-slate-100">{(aarrr.retention?.retention7DayRate ?? 0)}%</div>
                <span className="text-[10px] text-slate-500 font-bold">7-Day Retention</span>
                <div className="text-lg font-black text-slate-300 mt-1">{(aarrr.retention?.retention30DayRate ?? 0)}% <span className="text-[10px] text-slate-500">30-Day</span></div>
              </div>

              {/* Revenue */}
              <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-4 opacity-60">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-500"><DollarSign size={16} /></div>
                  <span className="text-xs font-black text-slate-500 uppercase">Revenue</span>
                </div>
                <div className="text-sm font-bold text-slate-500 italic">{aarrr.revenue?.title || "Not implemented"}</div>
                <span className="text-[10px] text-slate-600 font-medium mt-1 block">{aarrr.revenue?.message || "Awaiting billing integration"}</span>
              </div>

              {/* Referral */}
              <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-4 opacity-60">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-500"><Share2 size={16} /></div>
                  <span className="text-xs font-black text-slate-500 uppercase">Referral</span>
                </div>
                {aarrr.referral?.status === "ACTIVE" ? (
                    <div className="space-y-3 mt-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Referral Clicks</span>
                            <span className="text-sm font-black text-slate-300">{aarrr.referral.clicks || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Referral Signups</span>
                            <span className="text-sm font-black text-slate-300">{aarrr.referral.signups || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Activation Rate</span>
                            <span className="text-sm font-black text-slate-300">{aarrr.referral.activationRate || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Conversion Rate</span>
                            <span className="text-sm font-black text-slate-300">{aarrr.referral.conversionRate || 0}%</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-sm font-bold text-slate-500 italic">{aarrr.referral?.title || "Referral Attribution Pending"}</div>
                        <span className="text-[10px] text-slate-600 font-medium mt-1 block">{aarrr.referral?.message || ""}</span>
                    </>
                )}
              </div>
            </div>
          </div>

          {/* ===== DECISION GUIDANCE ===== */}
          {guidance.verdict && (
            <div className={`rounded-2xl p-5 border shadow-xl flex items-start gap-4 ${
              guidance.verdict === "PERSEVERE" ? "bg-emerald-500/5 border-emerald-500/20" :
              guidance.verdict === "IMPROVE" ? "bg-amber-500/5 border-amber-500/20" :
              guidance.verdict === "INVESTIGATE" ? "bg-red-500/5 border-red-500/20" :
              "bg-purple-500/5 border-purple-500/20"
            }`}>
              <HelpCircle size={24} className={
                guidance.verdict === "PERSEVERE" ? "text-emerald-400" :
                guidance.verdict === "IMPROVE" ? "text-amber-400" :
                guidance.verdict === "INVESTIGATE" ? "text-red-400" : "text-purple-400"
              } />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    guidance.verdict === "PERSEVERE" ? "text-emerald-400" :
                    guidance.verdict === "IMPROVE" ? "text-amber-400" :
                    guidance.verdict === "INVESTIGATE" ? "text-red-400" : "text-purple-400"
                  }`}>{guidance.verdict}</span>
                  <span className="text-[10px] font-bold text-slate-500">Strategic Growth Recommendation</span>
                </div>
                <p className="text-sm font-medium text-slate-200 leading-relaxed">{guidance.message}</p>
              </div>
            </div>
          )}

          {/* ===== GROWTH TRENDS TIME-SERIES ===== */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Activity Over Time</span>
                <h3 className="text-xl font-black text-slate-100 mt-0.5">Daily Growth Trends</h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> New Users</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Active Users</span>
              </div>
            </div>

            {trends.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-medium">No growth data recorded for the selected period.</div>
            ) : (
              <div className="h-48 flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-2 border-b border-slate-800 overflow-x-auto">
                {trends.slice(-30).map(day => {
                  const maxVal = Math.max(...trends.map(d => Math.max(d.activeUsers, d.newRegistrations, 1)));
                  const activeH = Math.max(4, Math.round((day.activeUsers / maxVal) * 100));
                  const regH = Math.max(4, Math.round((day.newRegistrations / maxVal) * 100));

                  return (
                    <div key={day.date} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-950 border border-slate-700 text-slate-100 p-2 rounded-xl text-[10px] whitespace-nowrap shadow-xl z-20 pointer-events-none">
                        <span className="font-bold border-b border-slate-800 pb-1 mb-1">{day.date}</span>
                        <span className="text-emerald-400">New: {day.newRegistrations}</span>
                        <span className="text-blue-400">Active: {day.activeUsers}</span>
                      </div>
                      <div className="w-full flex items-end justify-center gap-0.5 h-36">
                        <div className="w-1.5 sm:w-2.5 bg-emerald-500/60 group-hover:bg-emerald-500 rounded-t transition-all" style={{ height: `${regH}%` }} />
                        <div className="w-1.5 sm:w-2.5 bg-blue-500 group-hover:bg-blue-400 rounded-t transition-all" style={{ height: `${activeH}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">{day.date.slice(8)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== COMPANY & STATE BREAKDOWN ===== */}
          <div className="grid lg:grid-cols-2 gap-6">
            {isPlatformOwner && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Acquisition by Tenant</span>
                    <h3 className="text-lg font-black text-slate-100 mt-0.5">New Users by Company</h3>
                  </div>
                  <Building2 size={20} className="text-slate-500" />
                </div>
                {breakdown.byCompany?.length === 0 ? (
                  <p className="text-slate-500 text-sm p-4 text-center">No company acquisition data for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr><th className="pb-3">Company</th><th className="pb-3 text-right">New Users</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {breakdown.byCompany.map(c => (
                          <tr key={c.companyId} className="hover:bg-slate-800/40">
                            <td className="py-3 font-bold text-slate-200">{c.companyName} <span className="text-[10px] font-mono text-slate-500">({c.companyCode})</span></td>
                            <td className="py-3 text-right font-black text-emerald-400 font-mono">{c.newUsers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Regional Acquisition</span>
                  <h3 className="text-lg font-black text-slate-100 mt-0.5">New Users by State</h3>
                </div>
                <Globe size={20} className="text-slate-500" />
              </div>
              {breakdown.byState?.length === 0 ? (
                <p className="text-slate-500 text-sm p-4 text-center">No state acquisition data for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <tr><th className="pb-3">State</th><th className="pb-3 text-right">New Users</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {breakdown.byState.map(s => (
                        <tr key={s.state} className="hover:bg-slate-800/40">
                          <td className="py-3 font-bold text-slate-200">{s.state}</td>
                          <td className="py-3 text-right font-black text-emerald-400 font-mono">{s.newUsers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GrowthAnalyticsView;
