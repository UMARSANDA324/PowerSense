import { useMemo, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../context/DashboardProvider";
import { SkeletonHealthCard, SkeletonGrid, SkeletonInsightCard } from "../components/SkeletonLoader";
import PowerCountdown from "../components/PowerCountdown";

// Lazy load the analytics component - only loaded when visible
const HomeAnalytics = lazy(() => import("../components/HomeAnalytics"));

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userFeeder = user?.feeder;
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

  // ===== BUSINESS MODE TIPS (MEMOIZED) =====
  const businessModeEnabled = user?.businessModeEnabled;
  const businessModeName = useMemo(() => {
    if (!user?.businessType) return "Business";
    return `${user.businessType.charAt(0).toUpperCase()}${user.businessType.slice(1)}`;
  }, [user?.businessType]);

  const businessTips = useMemo(() => {
    if (!user) {
      return ["Login to PowerSense to unlock smart energy tips tailored to your location and operations."];
    }

    const tips = [];
    if (!businessModeEnabled) {
      tips.push("Enable Business Mode in your profile for tailored operational energy recommendations and continuity alerts.");
    }

    if (isPowerOff) {
      tips.push(`Your ${businessModeName.toLowerCase()} operations are at risk while this feeder remains offline. Keep critical systems on backup power and alert staff.`);
    } else if (isMaintenance) {
      tips.push(`This feeder is in maintenance. Schedule non-essential work for later and keep essential equipment on minimum load.`);
    } else {
      tips.push(`Feeder health looks good. Keep essentials running efficiently and save heavier loads for stable periods.`);
    }

    if (userFeeder && !businessModeEnabled) {
      tips.push(`Business Mode will use your assigned feeder (${userFeeder}) to personalize alerts and continuity recommendations.`);
    }

    return tips.slice(0, 3);
  }, [businessModeEnabled, businessModeName, isPowerOff, isMaintenance, userFeeder, user]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6 pt-6 sm:pt-10">

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
                {user?.feeder || "Not Configured"}
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
                    Last Updated: {powerStatus.lastUpdated}
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

        {/* ===== ABOVE THE FOLD: SMART ENERGY TIPS ===== */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-[2rem] p-6 shadow-xl animate-in fade-in duration-300 delay-150">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">Smart Energy Tips</p>
              <h3 className="text-2xl font-black mt-3">Keep your business running smoothly</h3>
              <p className="mt-2 text-sm text-slate-300">
                {businessModeEnabled ? "Business mode is active" : "Enable Business Mode for personalized recommendations"}
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.25em] font-bold px-3 py-2 rounded-2xl bg-white/10 border border-white/15">
              {businessModeEnabled ? `${businessModeName} Mode` : "Standard Insights"}
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {businessTips.map((tip, index) => (
              <div key={index} className="bg-white/10 border border-white/10 rounded-3xl p-4">
                <p className="text-sm leading-6 text-slate-100">{tip}</p>
              </div>
            ))}
          </div>
        </div>

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
            className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black active:scale-[0.98] transition-transform shadow-md text-sm cursor-pointer whitespace-nowrap"
          >
            Report a Fault
          </button>
        </div>

      </main>
    </div>
  );
};

export default Home;
