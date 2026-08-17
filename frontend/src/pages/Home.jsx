import { useMemo, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import CompanyBadge from "../components/CompanyBadge";
import { useDashboard } from "../context/DashboardProvider";
import FemaleAvatar from "../components/FemaleAvatar";
import { SkeletonHealthCard, SkeletonGrid, SkeletonInsightCard } from "../components/SkeletonLoader";
import PowerCountdown from "../components/PowerCountdown";
import { formatLastUpdated } from "../utils/dateConverter";

// Lazy load the analytics component - only loaded when visible
const HomeAnalytics = lazy(() => import("../components/HomeAnalytics"));

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    powerStatus,
    isLoading,
    powerError,
    refreshPowerStatus,
  } = useDashboard();

  // ===== POWER STATUS DERIVATION =====
  const status = powerStatus.status || (powerStatus.isActive ? "on" : "off");
  const isPowerOn = status === "on";
  const isMaintenance = status === "maintenance";
  const isPowerOff = status === "off";

  // ===== NIKOLA INSIGHTS (MEMOIZED) =====
  const insights = useMemo(() => {
    if (!user) {
      return ["Login to Nikola to unlock personalized feeder insights."];
    }

    const insightList = [];
    
    // Add insights based on available data (status, lastUpdated, etc.)
    if (isPowerOn) {
      insightList.push("Your feeder has remained stable today.");
    } else if (isMaintenance) {
      insightList.push("No emergency maintenance has been reported.");
    } else if (isPowerOff) {
      insightList.push("Nikola is monitoring your feeder for restoration updates.");
    }

    insightList.push("Network conditions remain stable.");
    insightList.push("Nikola continues monitoring for operator updates.");

    return insightList.slice(0, 3);
  }, [isPowerOn, isMaintenance, isPowerOff, user]);

  const displayName = user?.fullName || "Guest";
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6 pt-4 sm:pt-6">

        {/* ===== COMPACT MODERN WELCOME HEADER ===== */}
        <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-100 shadow-sm flex items-center gap-4 sm:gap-5 animate-in fade-in slide-in-from-top-3 duration-500">
          <FemaleAvatar className="flex-shrink-0" />
          <div className="space-y-1.5 min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {getGreeting()}, {displayName}
            </h2>
            <CompanyBadge prefix="Served by" variant="header" className="!py-0" />
            <p className="text-xs text-slate-400 font-semibold tracking-wide">Welcome back to Nikola.</p>
          </div>
        </div>

        {/* ===== ABOVE THE FOLD: GUEST MODE BANNER ===== */}
        {!user && (
          <div className="w-full bg-blue-600 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2 rounded-xl">
                <Lock size={20} />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-widest">Guest Mode</p>
                <p className="text-xs opacity-90">Login to unlock feeder intelligence</p>
              </div>
            </div>
            <Link to="/login" className="bg-white text-blue-600 px-5 py-2 rounded-xl font-bold text-xs uppercase hover:bg-blue-50 transition-all">
              Login
            </Link>
          </div>
        )}

        {/* ===== ABOVE THE FOLD: FEEDER STATUS HERO ===== */}
        <div className={`relative overflow-hidden rounded-[2rem] border p-8 shadow-xl transition-all duration-500 bg-white animate-in fade-in duration-300 ${
          isLoading ? "border-slate-100" :
          isPowerOn ? "border-green-100 shadow-green-100/20" :
          isMaintenance ? "border-yellow-100 shadow-yellow-100/20" :
          "border-red-100 shadow-red-100/20"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Zap size={14} className="text-blue-600" />
                Assigned Feeder
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {user?.assignedFeeders?.[0]?.name || user?.feeder || "Not Configured"}
              </h1>
              <p className="text-sm font-semibold text-slate-500">
                Area: {user?.ward || user?.state || "Unknown"}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs animate-pulse">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  SYNCING STATE...
                </div>
              ) : (
                <>
                  <div className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black tracking-wider uppercase shadow-sm ${
                    isPowerOn ? "bg-green-500 text-white" :
                    isMaintenance ? "bg-yellow-500 text-white" :
                    "bg-red-500 text-white"
                  }`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    {status === "on" ? "ONLINE" : status === "maintenance" ? "MAINTENANCE" : "OFFLINE"}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    Last Updated: {formatLastUpdated(powerStatus.lastUpdated)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {powerError && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {powerError}
          </div>
        )}

        <PowerCountdown
          status={status}
          expectedOutageTime={powerStatus.expectedOutageTime}
          expectedRestoreTime={powerStatus.expectedRestoreTime}
          maintenanceStart={powerStatus.maintenanceStart}
          maintenanceEnd={powerStatus.maintenanceEnd}
          reason={powerStatus.reason || powerStatus.maintenanceReason}
          updatedBy={powerStatus.updatedBy}
          nextScheduledOutage={powerStatus.nextScheduledOutage}
          estimatedRestoreTime={powerStatus.estimatedNextOutage}
          onExpire={refreshPowerStatus}
        />



        {/* ===== LAZY LOAD: ANALYTICS SECTION (BELOW THE FOLD) ===== */}
        <Suspense fallback={
          <div className="space-y-6 animate-in fade-in duration-500">
            <SkeletonHealthCard />
            <SkeletonGrid count={4} />
            <SkeletonInsightCard />
          </div>
        }>
          <div className="space-y-6 animate-in fade-in duration-500">
            <HomeAnalytics user={user} userFeeder={user?.feeder} />
          </div>
        </Suspense>

        {/* ===== REPORT ISSUE ACTION BUTTON ===== */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 mt-2 animate-in fade-in duration-300 delay-200">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-black text-slate-900">Report an Infrastructure Issue</h3>
            <p className="text-sm text-slate-400 font-medium max-w-md">
              Report fallen power lines, sparking transformers, or low-voltage complaints to alert engineers.
            </p>
          </div>
          <button
            onClick={() => navigate("/report-issue")}
            className="w-full md:w-auto primary-btn text-white px-8 py-4 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black active:scale-[0.98] transition-transform shadow-md text-sm cursor-pointer whitespace-nowrap"
          >
            Report a Fault
          </button>
        </div>

      </main>
    </div>
  );
};

export default Home;
