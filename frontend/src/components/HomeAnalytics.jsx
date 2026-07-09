import { useMemo } from "react";
import { Heart, Zap, ShieldAlert, Activity, FileText } from "lucide-react";
import { useDashboard } from "../context/DashboardProvider";
import { SkeletonGrid, SkeletonHealthCard, SkeletonInsightCard } from "./SkeletonLoader";

const HomeAnalytics = ({ user, userFeeder }) => {
  const { dashboardData, isDashboardLoading } = useDashboard();

  // Match user's feeder health
  const userFeederHealth = useMemo(() => {
    if (!dashboardData || !userFeeder) return null;
    return dashboardData.feederHealth?.find(
      (f) => f.feeder?.toLowerCase() === userFeeder.toLowerCase() || 
             f.feederId?.toString() === userFeeder?.toString()
    );
  }, [dashboardData, userFeeder]);

  const healthScore = useMemo(() => {
    if (userFeederHealth && userFeederHealth.riskScore !== undefined) {
      return Math.max(0, 100 - userFeederHealth.riskScore);
    }
    return Math.max(0, 100 - (dashboardData?.globalRiskScore || 15));
  }, [userFeederHealth, dashboardData]);

  const healthStatus = useMemo(() => {
    if (healthScore >= 80) return { label: "Stable", colorClass: "text-green-600 bg-green-50" };
    if (healthScore >= 50) return { label: "Unstable", colorClass: "text-yellow-600 bg-yellow-50" };
    return { label: "Critical", colorClass: "text-red-600 bg-red-50" };
  }, [healthScore]);

  const aiInsight = useMemo(() => {
    if (dashboardData?.insights?.[0]) {
      return dashboardData.insights[0];
    }
    return "System telemetry is operating within nominal parameters.";
  }, [dashboardData]);

  if (isDashboardLoading) {
    return (
      <>
        <SkeletonHealthCard />
        <SkeletonGrid count={4} />
        <SkeletonInsightCard />
      </>
    );
  }

  return (
    <>
      {/* FEEDER HEALTH SCORE */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center sm:text-left">
            <h3 className="text-slate-400 font-black text-xs uppercase tracking-widest flex items-center gap-1.5 justify-center sm:justify-start">
              <Heart size={14} className="text-red-500 fill-red-500" />
              Feeder Reliability & Health
            </h3>
            <h2 className="text-3xl font-black text-slate-900">{healthScore}%</h2>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${healthStatus.colorClass}`}>
                Status: {healthStatus.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 text-center sm:text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Risk Level</span>
              <span className="text-sm font-black text-slate-900 capitalize">
                {userFeederHealth?.status || "Low"}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 text-center sm:text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Uptime %</span>
              <span className="text-sm font-black text-slate-900">
                {userFeederHealth?.uptimePercent !== undefined && userFeederHealth?.uptimePercent !== null 
                  ? `${userFeederHealth.uptimePercent}%` 
                  : (dashboardData?.globalUptimePercent ? `${dashboardData.globalUptimePercent}%` : "92%")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GRID INTELLIGENCE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Reports Today */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-blue-600 bg-blue-50 p-2.5 rounded-xl self-start">
            <FileText size={18} />
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reports Today</span>
            <span className="text-xl font-black text-slate-900">
              {dashboardData?.recentReportsCount || 0}
            </span>
          </div>
        </div>

        {/* Active Outages */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-red-600 bg-red-50 p-2.5 rounded-xl self-start">
            <ShieldAlert size={18} />
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Outages</span>
            <span className="text-xl font-black text-slate-900">
              {dashboardData?.activeOutagesCount || 0}
            </span>
          </div>
        </div>

        {/* Outage Risk */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-yellow-600 bg-yellow-50 p-2.5 rounded-xl self-start">
            <Activity size={18} />
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Outage Risk</span>
            <span className="text-xl font-black text-slate-900 capitalize">
              {dashboardData?.userPrediction 
                ? `${dashboardData.userPrediction.riskLevel} (${(dashboardData.userPrediction.confidence * 100).toFixed(0)}%)` 
                : (userFeederHealth ? `${userFeederHealth.riskScore}%` : `${dashboardData?.globalRiskScore || 15}%`)}
            </span>
          </div>
        </div>

        {/* Feeder Status */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="text-green-600 bg-green-50 p-2.5 rounded-xl self-start">
            <Zap size={18} />
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quick Stats</span>
            <span className="text-xl font-black text-slate-900 uppercase">
              {dashboardData?.statsLabel || "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* AI INSIGHT CARD */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[2rem] p-6 shadow-xl shadow-blue-200">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-2xl mt-0.5 shrink-0">
            <Zap size={22} className="text-yellow-300 fill-yellow-300" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block">AI Grid Assistant Insight</span>
            <p className="text-sm font-bold leading-relaxed">
              "{aiInsight}"
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeAnalytics;
