import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Clock, AlertTriangle, Loader2, RefreshCw, Lock } from "lucide-react";
import { getPowerStatus } from "../services/powerService";
import { getCurrentUser } from "../services/authService";
import socket from "../services/socket";

const Home = () => {
    const navigate = useNavigate();
    const user = getCurrentUser();

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
                // Pass feeder name to getPowerStatus
                const data = await getPowerStatus(user?.feeder);
                setPowerStatus(data);
            } catch (error) {
                console.error("Home: Failed to fetch power status:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();

        // Listen for real-time updates
        const handleStatusUpdate = (update) => {
            // Super admins see all updates; regular users see only their feeder updates
            const isSuperAdmin = user?.role === "super-admin";
            const isTargetFeeder = !user?.feeder || update.feederId === user.feeder || update.feederName === user.feeder;

            if (isSuperAdmin || isTargetFeeder) {
                setPowerStatus(prev => ({
                    ...prev,
                    isActive: update.isActive,
                    estimatedNextOutage: update.estimatedNextOutage || prev.estimatedNextOutage,
                    lastUpdated: "Just Now",
                    // For super admin, we might want to show which feeder was updated
                    message: isSuperAdmin ? `Update for ${update.feederName}` : prev.message
                }));
            }
        };

        socket.on("powerStatusUpdated", handleStatusUpdate);

        return () => {
            socket.off("powerStatusUpdated", handleStatusUpdate);
        };
    }, [user?.feeder, user?.role]);

    const isPowerOn = powerStatus.isActive;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col items-center gap-6 sm:gap-8 pt-8 sm:pt-12">

                {!user && (
                    <div className="w-full max-w-lg bg-blue-600 text-white p-6 rounded-3xl shadow-xl shadow-blue-200 flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Lock size={20} />
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase tracking-widest">Guest Mode</p>
                                <p className="text-xs font-medium opacity-80">Login for localized grid updates</p>
                            </div>
                        </div>
                        <Link to="/login" className="bg-white text-blue-600 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all">
                            Login
                        </Link>
                    </div>
                )}
                <div className={`w-full max-w-lg p-10 sm:p-14 rounded-[3rem] shadow-2xl transition-all duration-700 relative overflow-hidden group border ${isLoading ? "bg-white border-blue-50" :
                    isPowerOn ? "bg-white border-green-50 shadow-green-100/50" : "bg-white border-red-50 shadow-red-100/30"
                    }`}>

                    {/* Background Glow Effect */}
                    <div className={`absolute -top-40 -right-20 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000 ${isPowerOn ? "bg-green-400/20" : "bg-red-400/10"
                        }`} />

                    {isLoading ? (
                        <div className="py-16 flex flex-col items-center gap-6">
                            <div className="relative">
                                <Loader2 size={64} className="text-blue-600 animate-spin" />
                                <div className="absolute inset-0 blur-xl bg-blue-400/20 animate-pulse rounded-full" />
                            </div>
                            <p className="text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Synchronizing Core...</p>
                        </div>
                    ) : (
                        <div className="relative z-10 flex flex-col items-center">
                            {/* PowerSense Bulb Indicator */}
                            <div className="relative mb-10 group cursor-default">
                                {/* Glow Halo */}
                                <div className={`absolute inset-0 blur-[40px] rounded-full transition-all duration-1000 scale-150 ${
                                    isPowerOn ? "bg-green-500/30 opacity-100" : "bg-red-500/20 opacity-0"
                                }`} />
                                
                                {/* The Bulb Logo */}
                                <div className={`relative p-8 rounded-[3rem] transition-all duration-700 transform ${
                                    isPowerOn ? "scale-110 shadow-[0_0_50px_rgba(34,197,94,0.3)] bg-green-50" : "scale-100 bg-gray-50 opacity-80"
                                }`}>
                                    <svg 
                                        viewBox="0 0 24 24" 
                                        className={`w-24 h-24 sm:w-32 sm:h-32 transition-all duration-1000 ${
                                            isPowerOn ? "fill-green-500 filter drop-shadow(0 0 10px rgba(34,197,94,0.5))" : "fill-red-500 filter grayscale-[0.5]"
                                        }`}
                                    >
                                        <path d="M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C8.67 12.05 8 10.58 8 9c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.58-.67 3.05-2.15 4.1zM11 10h2V7h-2v3zm4.55-1.55l1.41-1.41-1.41-1.41-1.41 1.41 1.41 1.41zM9.86 5.64l-1.41-1.41-1.41 1.41 1.41 1.41 1.41-1.41z" />
                                        {/* Lightning inner bolt mimicking logo */}
                                        <path 
                                            d="M13 9h3l-4 5v-3H9l4-5v3z" 
                                            className={`${isPowerOn ? "fill-white animate-pulse" : "fill-white/40"}`}
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Status Text Redesign */}
                            <div className="text-center space-y-2">
                                <h2 className={`text-4xl sm:text-5xl font-black transition-all duration-700 tracking-tight ${
                                    isPowerOn ? "text-gray-900" : "text-gray-900"
                                }`}>
                                    {isPowerOn ? "Power Available" : "Grid Outage"}
                                </h2>
                                <p className={`text-sm sm:text-base font-bold uppercase tracking-widest transition-colors duration-700 ${
                                    isPowerOn ? "text-green-600" : "text-red-500"
                                }`}>
                                    {isPowerOn ? "System is fully operational" : "Area administrators investigating"}
                                </p>
                            </div>

                            {/* Refined Indicators */}
                            <div className="mt-12 flex flex-col items-center gap-6">
                                <div className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-sm font-black transition-all duration-700 ${
                                    isPowerOn ? "bg-green-600 text-white shadow-xl shadow-green-200" : "bg-black text-white shadow-xl shadow-gray-200"
                                }`}>
                                    <span className={`w-3 h-3 rounded-full ${isPowerOn ? "bg-white animate-pulse" : "bg-red-500"}`}></span>
                                    {isPowerOn ? "LIVE UPDATES ACTIVE" : "SYSTEM INACTIVE"}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 opacity-60">
                                    <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                                    Last Check: {powerStatus.lastUpdated}
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
                            {isPowerOn 
                                ? `Next outage expected: ${powerStatus.estimatedNextOutage || "TBD"}`
                                : `Power restoration expected: ${powerStatus.estimatedNextOutage || "TBD"}`
                            }
                        </p>
                        <p className="text-blue-600 text-xs sm:text-sm font-semibold mt-1">
                            Schedule updated by area administrators
                        </p>
                    </div>
                </div>

                {/* Report Issue Card - Updated from Indigo to Blue */}
                <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] bg-white border border-blue-100 shadow-xl shadow-blue-50/50 flex flex-col items-center text-center gap-6 sm:gap-8 transition-all hover:scale-[1.02]">
                    <div className="bg-blue-600 text-white p-5 sm:p-6 rounded-[2rem] shadow-xl shadow-blue-200 shrink-0">
                        <AlertTriangle size={48} className="sm:w-12 sm:h-12 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Report an Issue</h3>
                        <p className="text-gray-500 text-sm sm:text-base leading-relaxed font-medium px-4">
                            Spotted a fallen pole, transformer sparks, or an illegal connection? Help us keep the community safe.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/report-issue")}
                        className="w-full bg-black text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-gray-900 active:scale-[0.98] transition-all shadow-lg text-sm sm:text-base submit-btn"
                    >
                        Submit a Report
                    </button>

                </div>


            </main>
        </div>
    );
};

export default Home;
