import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Clock, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { getPowerStatus } from "../services/powerService";

const Home = () => {
    const navigate = useNavigate();

    // State controlled by the Admin Dashboard via powerService
    const [powerStatus, setPowerStatus] = useState({
        isActive: true,
        lastUpdated: "Fetching...",
        estimatedNextOutage: "TBD"
    });
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Admin-controlled status
    useEffect(() => {
        const fetchStatus = async () => {
            setIsLoading(true);
            try {
                const data = await getPowerStatus();
                setPowerStatus(data);
            } catch (error) {
                console.error("Home: Failed to fetch power status:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();

        // Setup polling to reflect Admin changes in real-time
        const interval = setInterval(fetchStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const isPowerOn = powerStatus.isActive;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col items-center gap-6 sm:gap-8 pt-8 sm:pt-12">

                {/* Power Status Card */}
                <div className={`w-full max-w-lg p-8 sm:p-12 rounded-[2.5rem] shadow-2xl transition-all duration-700 relative overflow-hidden group ${isLoading ? "bg-white border-blue-50" :
                        isPowerOn ? "bg-white border-blue-50 shadow-blue-100" : "bg-slate-900 border-slate-800 shadow-slate-200"
                    } border`}>

                    {/* Background Glow Effect */}
                    <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[80px] transition-opacity duration-700 ${isPowerOn ? "bg-blue-400/20" : "bg-red-500/10"
                        }`} />

                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center gap-4">
                            <Loader2 size={48} className="text-blue-600 animate-spin" />
                            <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing status...</p>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            {/* Icon */}
                            <div className={`inline-flex p-5 sm:p-6 rounded-[2rem] mb-6 sm:mb-8 transition-all duration-700 ${isPowerOn ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "bg-slate-800 text-slate-400 shadow-none border border-slate-700"
                                }`}>
                                <Zap size={48} className="sm:w-12 sm:h-12" fill={isPowerOn ? "white" : "none"} />
                            </div>

                            {/* Status Text */}
                            <h2 className={`text-4xl sm:text-5xl font-black mb-3 sm:mb-4 transition-colors duration-700 ${isPowerOn ? "text-gray-900" : "text-white"
                                }`}>
                                {isPowerOn ? "Power On" : "Power Off"}
                            </h2>

                            <p className={`text-base sm:text-lg font-medium px-2 transition-colors duration-700 ${isPowerOn ? "text-gray-500" : "text-slate-400"
                                }`}>
                                {isPowerOn ? "Electricity is stable in your area" : "Outage detected by technical team"}
                            </p>

                            {/* Indicators & Refresh */}
                            <div className="mt-8 sm:mt-10 flex flex-col items-center gap-4">
                                <span className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-700 ${isPowerOn ? "bg-green-100 text-green-700" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                    }`}>
                                    <span className={`w-2.5 h-2.5 rounded-full ${isPowerOn ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                                    {isPowerOn ? "Active" : "Inactive"}
                                </span>

                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isPowerOn ? "text-gray-400" : "text-slate-500"}`}>
                                    <RefreshCw size={12} />
                                    Updated {powerStatus.lastUpdated}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Estimated Outage Card - Themed to Blue/White */}
                <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] bg-white border border-blue-100 shadow-xl shadow-blue-50/50 flex flex-col items-center text-center gap-4 sm:gap-6 transition-all hover:scale-[1.02]">
                    <div className="bg-blue-600 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-200 shrink-0">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-gray-900 font-bold text-lg sm:text-xl leading-tight">
                            Est. next outage approx {powerStatus.estimatedNextOutage || "TBD"}
                        </p>
                        <p className="text-blue-600 text-xs sm:text-sm font-semibold mt-1">
                            Schedule based on recent area data
                        </p>
                    </div>
                </div>

                {/* Report Issue Card - Updated from Indigo to Blue */}
                <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] bg-blue-600 text-white shadow-xl shadow-blue-200 flex flex-col items-center text-center gap-5 sm:gap-6 transition-all hover:translate-y-[-4px]">
                    <div className="w-full flex items-center justify-between">
                        <div className="p-3 bg-white/20 rounded-xl sm:rounded-2xl">
                            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <span className="bg-white/20 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                            Quick Action
                        </span>
                    </div>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-2">Report an Issue</h3>
                        <p className="text-blue-50 text-xs sm:text-sm leading-relaxed opacity-90">
                            Spotted a fallen pole, transformer sparks, or an illegal connection? Help us keep the community safe.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/report")}
                        className="w-full bg-white text-blue-600 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg text-sm sm:text-base"
                    >
                        Submit a Report
                    </button>
                </div>


            </main>
        </div>
    );
};

export default Home;
