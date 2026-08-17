import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  BarChart3, TrendingUp, Users, Building2, Activity, Shield,
  Globe, MapPin, Zap, Cpu, Filter, Calendar, RefreshCw,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle,
  Loader2, ChevronDown, ChevronUp, LineChart, FileText
} from "lucide-react";
import ReportAnalyticsView from "./ReportAnalyticsView";
import GrowthAnalyticsView from "./GrowthAnalyticsView";

const GlobalAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("product-growth");
  const [filters, setFilters] = useState({
    dateRange: "30d",
    company: "all",
    state: "all",
    status: "all"
  });
  const [data, setData] = useState({
    dashboard: null,
    metrics: null,
    rankings: null,
    coverage: null,
    aiInsights: null,
    health: null,
    kpis: null,
    trends: null,
    operational: null
  });

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        range: filters.dateRange,
        companyId: filters.company,
        state: filters.state,
        status: filters.status
      });
      const response = await api.get(`/platform-analytics/global?${params.toString()}`);
      const result = response.data?.data || {};

      setData({
        dashboard: result.dashboard,
        metrics: result.metrics,
        rankings: result.rankings,
        coverage: result.coverage,
        aiInsights: result.aiInsights,
        health: result.health,
        kpis: result.kpis,
        trends: result.trends,
        operational: result.operational
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: "product-growth", label: "Product Growth (AARRR)", icon: TrendingUp },
    { id: "growth", label: "Growth Overview", icon: BarChart3 },
    { id: "reports", label: "Report Feature Tracking", icon: FileText },
    { id: "operational", label: "Operational Analytics", icon: Activity },
    { id: "companies", label: "Company Analytics", icon: Building2 },
    { id: "rankings", label: "Company Rankings", icon: TrendingUp },
    { id: "geographic", label: "Geographic Analytics", icon: Globe },
    { id: "users", label: "User Analytics", icon: Users },
    { id: "infrastructure", label: "Infrastructure", icon: Zap },
    { id: "ai", label: "AI Analytics", icon: Cpu },
    { id: "trends", label: "Trend Analysis", icon: LineChart }
  ];

  const StatCard = ({ label, value, icon: Icon, trend, color = "indigo" }) => {
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
            <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-black text-slate-100 mb-1">{value}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, max, color = "indigo" }) => {
    const percentage = Math.min(100, (value / max) * 100);
    const colors = {
      indigo: "bg-indigo-500",
      emerald: "bg-emerald-500",
      red: "bg-red-500",
      blue: "bg-blue-500",
      purple: "bg-purple-500",
      amber: "bg-amber-500"
    };

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-semibold">{label}</span>
          <span className="text-slate-200 font-bold">{value}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${colors[color]} transition-all duration-500`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  const SimpleBarChart = ({ data, color = "indigo" }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const colors = {
      indigo: "bg-indigo-500",
      emerald: "bg-emerald-500",
      red: "bg-red-500",
      blue: "bg-blue-500",
      purple: "bg-purple-500",
      amber: "bg-amber-500"
    };

    return (
      <div className="flex items-end gap-2 h-32">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className={`w-full ${colors[color]} rounded-t-sm transition-all duration-300 hover:opacity-80`}
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            />
            <span className="text-[10px] text-slate-500 truncate w-full text-center">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const ExecutiveDashboard = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Executive Dashboard</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Overview</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time platform performance metrics</p>
          </div>
          <button onClick={loadAnalytics} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Companies" value={data.metrics?.totalCompanies ?? "—"} icon={Building2} color="indigo" />
          <StatCard label="Active Companies" value={data.metrics?.activeCompanies ?? "—"} icon={CheckCircle} color="emerald" />
          <StatCard label="Platform Health" value={`${data.metrics?.platformHealthScore ?? "—"}%`} icon={Shield} color="blue" />
          <StatCard label="Active Outages" value={data.metrics?.totalActiveOutages ?? "—"} icon={AlertTriangle} color="red" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={data.metrics?.totalUsers ?? "—"} icon={Users} color="amber" />
          <StatCard label="Total Feeders" value={data.metrics?.totalFeeders ?? "—"} icon={Zap} color="purple" />
          <StatCard label="AI Success Rate" value={`${data.metrics?.aiPredictionSuccessRate ?? "—"}%`} icon={Cpu} color="blue" />
          <StatCard label="Platform Uptime" value={`${data.metrics?.platformUptime ?? "—"}%`} icon={Activity} color="emerald" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Executive KPIs</p>
              <h3 className="text-lg font-black text-slate-100">Performance Metrics</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform Growth</p>
              <p className="text-xl font-black text-slate-100 mt-1">{data.kpis?.platformGrowth ?? "—"}</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform Reliability</p>
              <p className="text-xl font-black text-slate-100 mt-1">{data.kpis?.platformReliability ? `${data.kpis.platformReliability}%` : "—"}</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform Availability</p>
              <p className="text-xl font-black text-slate-100 mt-1">{data.kpis?.platformAvailability ? `${data.kpis.platformAvailability}%` : "—"}</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Company Health</p>
              <p className="text-xl font-black text-slate-100 mt-1">{data.kpis?.averageCompanyHealth ? `${data.kpis.averageCompanyHealth}%` : "—"}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">AI Insights</p>
              <h3 className="text-lg font-black text-slate-100">Priority Watchlist</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Highest Outage Trend</p>
              <p className="text-sm font-semibold text-slate-100 mt-1">{data.aiInsights?.highestOutageTrend?.companyName || "—"}</p>
              <p className="text-xs text-slate-500">{data.aiInsights?.highestOutageTrend?.outageCount ?? 0} outages</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fastest Improving</p>
              <p className="text-sm font-semibold text-slate-100 mt-1">{data.aiInsights?.improvingFastest?.companyName || "—"}</p>
              <p className="text-xs text-slate-500">{data.aiInsights?.improvingFastest?.reliability ? `${Math.round(data.aiInsights.improvingFastest.reliability)}%` : "—"} reliability</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Needs Review</p>
              <p className="text-sm font-semibold text-slate-100 mt-1">{data.aiInsights?.needsOperationalReview?.companyName || "—"}</p>
              <p className="text-xs text-slate-500">Operational attention required</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const GrowthOverview = () => {
    const growth = data.growth || data.trends;
    const dailyData = growth?.dailyData || [];
    const chartData = (key) => dailyData.slice(-12).map((item) => ({ label: item.date.slice(5), value: item[key] || 0 }));
    const formatRate = (value) => value === null || value === undefined ? "Insufficient history" : `${value > 0 ? "+" : ""}${value}%`;

    return (
      <div className="space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Historical intelligence</p>
              <h2 className="text-2xl font-black text-slate-100 mt-1">Platform growth over time</h2>
              <p className="text-sm text-slate-500 mt-1">Registration and adoption activity for the selected period.</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{growth?.startDate ? `${new Date(growth.startDate).toLocaleDateString()} - ${new Date(growth.endDate).toLocaleDateString()}` : "Historical range"}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="New Companies" value={growth?.summary?.totalCompanies ?? "—"} icon={Building2} color="indigo" />
            <StatCard label="New Users" value={growth?.summary?.totalUsers ?? "—"} icon={Users} color="emerald" />
            <StatCard label="New Super Admins" value={growth?.summary?.totalSuperAdmins ?? "—"} icon={Shield} color="blue" />
            <StatCard label="New Admins" value={growth?.summary?.totalAdmins ?? "—"} icon={Activity} color="purple" />
            <StatCard label="Report Activity" value={growth?.summary?.totalReports ?? "—"} icon={LineChart} color="amber" />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {[
            ["Company Growth", "companies", "indigo"],
            ["User Growth", "users", "emerald"],
            ["Super Admin Growth", "superAdmins", "blue"],
            ["Admin Growth", "admins", "purple"]
          ].map(([label, key, color]) => (
            <div key={key} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-100">{label}</h3>
                <span className={`text-xs font-bold ${growth?.kpis?.[`${key === "companies" ? "company" : key.slice(0, -1)}GrowthRate`] > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                  {formatRate(growth?.kpis?.[`${key === "companies" ? "company" : key.slice(0, -1)}GrowthRate`])}
                </span>
              </div>
              <SimpleBarChart data={chartData(key)} color={color} />
              {!dailyData.length && <p className="text-sm text-slate-500 mt-3">Historical data is not available for this range yet.</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const OperationalAnalytics = () => {
    const operational = data.operational;
    const infrastructure = operational?.infrastructureGrowth?.daily || [];
    const activity = operational?.activityAnalytics?.daily || [];
    const reportData = (operational?.reportAnalytics?.daily || []).slice(-12).map((item) => ({ label: item.date.slice(5), value: item.reports }));
    const notificationData = (operational?.notificationAnalytics?.daily || []).slice(-12).map((item) => ({ label: item.date.slice(5), value: item.notifications }));
    const resourceData = (key) => infrastructure.slice(-12).map((item) => ({ label: item.date.slice(5), value: item[key] || 0 }));
    const activityData = activity.slice(-12).map((item) => ({ label: item.date.slice(5), value: item.activities || 0 }));
    return (
      <div className="space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Operational intelligence</p>
          <h2 className="text-2xl font-black text-slate-100 mt-1">How the platform is operating</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <StatCard label="Reports" value={operational?.reportAnalytics?.total ?? "—"} icon={Activity} color="red" trend={operational?.reportAnalytics?.growthRate} />
            <StatCard label="Notifications Sent" value={operational?.notificationAnalytics?.sent ?? "—"} icon={Shield} color="blue" trend={operational?.notificationAnalytics?.trend} />
            <StatCard label="Activities" value={operational?.activityAnalytics?.totalActivities ?? "—"} icon={TrendingUp} color="emerald" />
            <StatCard label="Audit Events" value={operational?.activityAnalytics?.totalAudits ?? "—"} icon={CheckCircle} color="purple" />
          </div>
          <p className="text-xs text-slate-500 mt-4">Notification delivery success is not shown because the current notification record does not contain a delivery outcome field.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          {[["Report Trend", reportData, "red"], ["Notification Trend", notificationData, "blue"], ["Feeder Growth", resourceData("feeders"), "emerald"], ["Operational Activity", activityData, "purple"]].map(([title, chart, color]) => (
            <div key={title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5"><h3 className="text-lg font-black text-slate-100 mb-4">{title}</h3><SimpleBarChart data={chart} color={color} />{!chart.length && <p className="text-sm text-slate-500 mt-3">No historical records in this range.</p>}</div>
          ))}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5"><h3 className="text-lg font-black text-slate-100 mb-4">Infrastructure creation trends</h3><div className="grid lg:grid-cols-4 gap-4">{[["States", "states"], ["LGAs", "lgas"], ["Wards", "wards"], ["Substations", "substations"]].map(([label, key]) => <div key={key}><p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p><SimpleBarChart data={resourceData(key)} color="indigo" /></div>)}</div></div>
      </div>
    );
  };

  const CompanyAnalytics = () => {
    const operational = data.operational;
    const companies = operational?.companyPerformance || [];
    const selected = operational?.detail;
    const renderRanking = (label, rows) => <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><h3 className="text-lg font-black text-slate-100 mb-3">{label}</h3><div className="space-y-2">{(rows || []).slice(0, 5).map((company, index) => <div key={`${label}-${company.companyId}`} className="flex items-center justify-between border-b border-slate-800 pb-2"><span className="text-sm text-slate-200">{index + 1}. {company.name}</span><span className="text-xs font-bold text-indigo-300">{company.health || company.reports || company.operationalResources}</span></div>)}</div></div>;
    return <div className="space-y-5"><div className="grid lg:grid-cols-3 gap-4">{renderRanking("Most Active", operational?.rankings?.mostActive)}{renderRanking("Fastest Growing", operational?.rankings?.fastestGrowing)}{renderRanking("Most Configured", operational?.rankings?.mostConfigured)}{renderRanking("Most Reports", operational?.rankings?.mostReports)}{renderRanking("Least Active", operational?.rankings?.leastActive)}{renderRanking("Newest Companies", operational?.rankings?.newest)}</div><div className="bg-slate-900 border border-slate-800 rounded-2xl p-5"><h3 className="text-lg font-black text-slate-100 mb-4">Company performance comparison</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Company</th><th className="pb-3">Health</th><th className="pb-3">Users</th><th className="pb-3">Admins</th><th className="pb-3">Resources</th><th className="pb-3">Reports</th></tr></thead><tbody>{companies.map((company) => <tr key={company.companyId} className="border-t border-slate-800"><td className="py-3 font-semibold text-slate-200">{company.name}</td><td className="py-3 text-indigo-300">{company.health}</td><td className="py-3 text-slate-400">{company.users}</td><td className="py-3 text-slate-400">{company.admins}</td><td className="py-3 text-slate-400">{company.operationalResources}</td><td className="py-3 text-slate-400">{company.reports}</td></tr>)}</tbody></table></div></div>{selected && <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-5"><p className="text-[10px] uppercase tracking-wider text-indigo-400">Company detail</p><h3 className="text-xl font-black text-slate-100 mt-1">{selected.name}</h3><p className="text-sm text-slate-400 mt-2">{selected.health} · {selected.operationalResources} operational resources · {selected.reports} reports in the selected period.</p></div>}</div>;
  };

  const CompanyRankings = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Company Rankings</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Performance Leaderboard</h2>
            <p className="text-sm text-slate-500 mt-1">Live company performance rankings</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-lg font-black text-slate-100 mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
              Top Performing
            </h3>
            <div className="space-y-2">
              {data.rankings?.topPerforming?.slice(0, 5).map((company, index) => (
                <div key={company._id} className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.code}</p>
                    </div>
                  </div>
                  <div className="text-sm font-black text-emerald-400">{Math.round(company.performance)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-100 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              Requiring Attention
            </h3>
            <div className="space-y-2">
              {data.rankings?.requiringAttention?.slice(0, 5).map((company, index) => (
                <div key={company._id} className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-sm font-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.outageCount ?? 0} outages</p>
                    </div>
                  </div>
                  <div className="text-sm font-black text-red-400">{Math.round(company.performance)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <div>
            <h3 className="text-lg font-black text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              Recently Improved
            </h3>
            <div className="space-y-2">
              {data.rankings?.recentlyImproved?.slice(0, 5).map((company, index) => (
                <div key={company._id} className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.code}</p>
                    </div>
                  </div>
                  <div className="text-sm font-black text-blue-400">{Math.round(company.reliability)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-100 mb-4 flex items-center gap-2">
              <ArrowDownRight size={18} className="text-amber-400" />
              Recently Declined
            </h3>
            <div className="space-y-2">
              {data.rankings?.recentlyDeclined?.slice(0, 5).map((company, index) => (
                <div key={company._id} className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.code}</p>
                    </div>
                  </div>
                  <div className="text-sm font-black text-amber-400">{Math.round(company.reliability)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const GeographicAnalytics = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Geographic Analytics</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Coverage</h2>
            <p className="text-sm text-slate-500 mt-1">Geographic distribution and coverage metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Coverage Areas" value={data.coverage?.totalCoverageAreas ?? "—"} icon={MapPin} color="indigo" />
          <StatCard label="Active Networks" value={data.coverage?.activeNetworks ?? "—"} icon={Zap} color="emerald" />
          <StatCard label="Platform Coverage" value={data.coverage?.platformCoverage ?? "—"} icon={Globe} color="blue" />
          <StatCard label="Companies" value={data.metrics?.totalCompanies ?? "—"} icon={Building2} color="purple" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-100 mb-4">Coverage by Company</h3>
          <div className="space-y-2">
            {data.coverage?.companiesByState?.map((company, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-black">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{company.name}</p>
                    <p className="text-xs text-slate-500">{company.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-100">{company.stateCount ?? 0}</p>
                    <p className="text-[10px] text-slate-500">States</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-100">{company.feederCount ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Feeders</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const UserAnalytics = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">User Analytics</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">User Growth & Distribution</h2>
            <p className="text-sm text-slate-500 mt-1">Platform user metrics and trends</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Users" value={data.metrics?.totalUsers ?? "—"} icon={Users} color="indigo" />
          <StatCard label="Super Admins" value={data.metrics?.totalSuperAdmins ?? "—"} icon={Shield} color="emerald" />
          <StatCard label="Admins" value={data.metrics?.totalAdmins ?? "—"} icon={Building2} color="blue" />
          <StatCard label="Regular Users" value={data.metrics?.totalUsers ? data.metrics.totalUsers - data.metrics.totalAdmins : "—"} icon={Users} color="purple" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">User Distribution</h3>
            <SimpleBarChart 
              data={[
                { label: "Super Admins", value: data.metrics?.totalSuperAdmins || 0 },
                { label: "Admins", value: data.metrics?.totalAdmins || 0 },
                { label: "Users", value: data.metrics?.totalUsers ? data.metrics.totalUsers - data.metrics.totalAdmins : 0 }
              ]}
              color="purple"
            />
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Growth Metrics</h3>
            <div className="space-y-4">
              <ProgressBar 
                label="Monthly New Users" 
                value={data.kpis?.monthlyNewUsers || 0} 
                max={data.metrics?.totalUsers || 100} 
                color="indigo"
              />
              <ProgressBar 
                label="Platform Growth" 
                value={parseFloat(data.kpis?.platformGrowth) || 0} 
                max={100} 
                color="emerald"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-black text-slate-100 mb-4">User Growth Trends</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-100">{data.kpis?.monthlyNewUsers ?? "—"}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Monthly New</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-slate-100">{data.metrics?.totalUsers ?? "—"}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-slate-100">{data.kpis?.platformGrowth ?? "—"}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Growth Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const InfrastructureAnalytics = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Infrastructure Analytics</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Infrastructure</h2>
            <p className="text-sm text-slate-500 mt-1">Feeders, substations, and coverage metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Feeders" value={data.metrics?.totalFeeders ?? "—"} icon={Zap} color="indigo" />
          <StatCard label="Substations" value={data.metrics?.totalSubstations ?? "—"} icon={Building2} color="emerald" />
          <StatCard label="Active Outages" value={data.metrics?.totalActiveOutages ?? "—"} icon={AlertTriangle} color="red" />
          <StatCard label="Predictions" value={data.metrics?.totalPredictions ?? "—"} icon={Cpu} color="purple" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Infrastructure Health</h3>
            <div className="space-y-4">
              <ProgressBar 
                label="Platform Health Score" 
                value={data.metrics?.platformHealthScore || 0} 
                max={100} 
                color={data.metrics?.platformHealthScore > 80 ? "emerald" : data.metrics?.platformHealthScore > 60 ? "amber" : "red"}
              />
              <ProgressBar 
                label="Platform Uptime" 
                value={data.metrics?.platformUptime || 0} 
                max={100} 
                color="emerald"
              />
              <ProgressBar 
                label="AI Prediction Success" 
                value={data.metrics?.aiPredictionSuccessRate || 0} 
                max={100} 
                color="blue"
              />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Database Health</p>
                <p className="text-sm font-black text-emerald-400">{data.health?.databaseHealth ?? "—"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">API Health</p>
                <p className="text-sm font-black text-emerald-400">{data.health?.apiHealth ?? "—"}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Prediction Engine</p>
                <p className="text-sm font-black text-emerald-400">{data.health?.predictionEngine ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const AIAnalytics = () => (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">AI Analytics</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">AI Performance & Insights</h2>
            <p className="text-sm text-slate-500 mt-1">AI prediction accuracy and operational insights</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Predictions" value={data.metrics?.totalPredictions ?? "—"} icon={Cpu} color="indigo" />
          <StatCard label="Success Rate" value={`${data.metrics?.aiPredictionSuccessRate ?? "—"}%`} icon={CheckCircle} color="emerald" />
          <StatCard label="AI Confidence" value={`${data.kpis?.averageAiConfidence ? `${data.kpis.averageAiConfidence}%` : "—"}`} icon={Shield} color="blue" />
          <StatCard label="Reports" value={data.metrics?.totalReports ?? "—"} icon={Activity} color="purple" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-lg font-black text-slate-100 mb-4">AI Insights by Company</h3>
            <div className="space-y-2">
              {data.aiInsights?.aiConfidenceByCompany?.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-black">
                      {index + 1}
                    </div>
                    <p className="text-sm font-semibold text-slate-100">{item.companyName}</p>
                  </div>
                  <div className="text-sm font-black text-purple-400">{Math.round(item.aiConfidence)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-100 mb-4">Emerging Risks</h3>
            <div className="space-y-2">
              {data.aiInsights?.emergingRisks?.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-sm font-black">
                      {index + 1}
                    </div>
                    <p className="text-sm font-semibold text-slate-100">{item.companyName}</p>
                  </div>
                  <div className="text-sm font-black text-red-400">{item.outageCount ?? 0} outages</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const TrendAnalysis = () => {
    const periodOptions = [
      { id: "today", label: "Today" },
      { id: "week", label: "This Week" },
      { id: "month", label: "This Month" },
      { id: "quarter", label: "This Quarter" },
      { id: "year", label: "This Year" }
    ];

    return (
      <div className="space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Trend Analysis</p>
              <h2 className="text-2xl font-black text-slate-100 mt-1">Platform Growth Trends</h2>
              <p className="text-sm text-slate-500 mt-1">Historical platform performance over time</p>
            </div>
            <div className="flex items-center gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setFilters({ ...filters, dateRange: option.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filters.dateRange === option.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="New Companies" value={data.trends?.summary?.totalCompanies ?? "—"} icon={Building2} color="indigo" />
            <StatCard label="New Users" value={data.trends?.summary?.totalUsers ?? "—"} icon={Users} color="emerald" />
            <StatCard label="Outages" value={data.trends?.summary?.totalOutages ?? "—"} icon={AlertTriangle} color="red" />
            <StatCard label="Predictions" value={data.trends?.summary?.totalPredictions ?? "—"} icon={Cpu} color="purple" />
            <StatCard label="Reports" value={data.trends?.summary?.totalReports ?? "—"} icon={Activity} color="blue" />
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="text-lg font-black text-slate-100 mb-4">Daily Breakdown</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.trends?.dailyData?.slice().reverse().map((day, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-4">
                    <p className="text-xs font-semibold text-slate-500 w-24">{day.date}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">C: {day.companies}</span>
                      <span className="text-xs text-slate-400">U: {day.users}</span>
                      <span className="text-xs text-slate-400">O: {day.outages}</span>
                      <span className="text-xs text-slate-400">P: {day.predictions}</span>
                      <span className="text-xs text-slate-400">R: {day.reports}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500" 
                        style={{ width: `${Math.min(100, (day.companies / Math.max(data.trends.summary.totalCompanies, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 size={36} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Global Analytics</p>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Enterprise Analytics Center</h2>
            <p className="text-sm text-slate-500 mt-1">Historical trends, operational intelligence, and company performance</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Companies</option>
              {(data.operational?.companyPerformance || []).map((company) => <option key={company.companyId} value={company.companyId}>{company.name}</option>)}
            </select>
            <select 
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All States</option>
            </select>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={loadAnalytics} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSection === section.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700"
              }`}
            >
              <section.icon size={16} />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeSection === "product-growth" && <GrowthAnalyticsView isPlatformOwner={true} />}
      {activeSection === "growth" && <GrowthOverview />}
      {activeSection === "reports" && <ReportAnalyticsView isPlatformOwner={true} />}
      {activeSection === "operational" && <OperationalAnalytics />}
      {activeSection === "companies" && <CompanyAnalytics />}
      {activeSection === "rankings" && <CompanyRankings />}
      {activeSection === "geographic" && <GeographicAnalytics />}
      {activeSection === "users" && <UserAnalytics />}
      {activeSection === "infrastructure" && <InfrastructureAnalytics />}
      {activeSection === "ai" && <AIAnalytics />}
      {activeSection === "trends" && <TrendAnalysis />}
    </div>
  );
};

export default GlobalAnalytics;
