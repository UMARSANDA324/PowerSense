import { useState, useEffect } from "react";
import { Search, MapPin, Power, AlertCircle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import locationService from "../services/locationService.js";
import { useNavigate } from "react-router-dom";
import socket from "../services/socket";
import api from "../services/api";

const AllStatus = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [feeders, setFeeders] = useState([]);
    const [filteredFeeders, setFilteredFeeders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedFeederId, setSelectedFeederId] = useState(null);
    const [showReportWarning, setShowReportWarning] = useState(false);

    // Fetch all feeders and power status on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!user) {
                    setLoading(false);
                    return; // Unauthenticated users cannot view statuses
                }

                setLoading(true);

                // Fetch all feeders and statuses in parallel
                const [feedersData, statusesData] = await Promise.all([
                    locationService.getFeeders(),
                    api.get("/power/all-status")
                ]);

                const statuses = statusesData.data;
                const allowedFeederIds = statuses.map(s => s.feeder?._id || s.feeder).filter(Boolean);

                // Only show feeders that were returned from the authorized /power/all-status endpoint
                // or super-admins can see all feeders regardless of status existing.
                let allowedFeeders = feedersData;
                if (user.role !== 'super-admin') {
                    // We also ensure we only display feeders for which the user is authorized
                    // Because we fetch statuses after enforcing authorization in the backend,
                    // we can safely rely on frontend role-filtering as long as we also check backend output
                    if (user.role === 'admin') {
                        allowedFeeders = feedersData.filter(f => (user.assignedFeeders || []).includes(f._id));
                    } else if (user.role === 'user' && user.state) {
                        allowedFeeders = feedersData.filter(f => f.wards?.some(w => w.lga?.state?.name === user.state));
                    } else {
                        allowedFeeders = [];
                    }
                }

                const enrichedFeeders = allowedFeeders.map((feeder) => {
                    const feederStatus = statuses.find(s => s.feeder?._id === feeder._id || s.feeder === feeder._id);
                    let status = "Off";
                    if (feederStatus) {
                        status = feederStatus.status ? feederStatus.status.charAt(0).toUpperCase() + feederStatus.status.slice(1) : (feederStatus.isActive ? "On" : "Off");
                    } else {
                        status = "On"; // Default if no status record exists
                    }

                    return {
                        ...feeder,
                        status: status,
                        lastUpdated: feederStatus ? new Date(feederStatus.lastUpdated).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : "Just Now"
                    };
                });

                setFeeders(enrichedFeeders);
                setFilteredFeeders(enrichedFeeders);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching feeders:", error);
                setLoading(false);
            }
        };

        fetchData();

        // Listen for real-time status updates
        const handleStatusUpdate = (update) => {
            setFeeders(prevFeeders =>
                prevFeeders.map(feeder => {
                    if (feeder._id === update.feederId) {
                        const status = update.status ? update.status.charAt(0).toUpperCase() + update.status.slice(1) : (update.isActive ? "On" : "Off");
                        return {
                            ...feeder,
                            status: status,
                            lastUpdated: "Just Now"
                        };
                    }
                    return feeder;
                })
            );
        };

        socket.on("powerStatusUpdated", handleStatusUpdate);

        return () => {
            socket.off("powerStatusUpdated", handleStatusUpdate);
        };
    }, []);

    // Handle search/filter
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredFeeders(feeders);
        } else {
            const searchLower = searchTerm.toLowerCase();
            const filtered = feeders.filter((feeder) => {
                // Support multiple wards per feeder
                const wardNames = feeder.wards?.map(w => w.name?.toLowerCase() || "") || [];
                const feederName = feeder.name?.toLowerCase() || "";
                const lgaNames = feeder.wards?.map(w => w.lga?.name?.toLowerCase() || "") || [];

                return (
                    wardNames.some(name => name.includes(searchLower)) ||
                    feederName.includes(searchLower) ||
                    lgaNames.some(name => name.includes(searchLower))
                );
            });
            setFilteredFeeders(filtered);
        }
    }, [searchTerm, feeders]);

    // Get status icon and colors
    const getStatusIcon = (status) => {
        switch (status) {
            case "On":
                return {
                    icon: <CheckCircle size={20} className="text-green-600" />,
                    bgColor: "bg-green-50",
                    textColor: "text-green-700",
                    badge: "bg-green-100 text-green-700"
                };
            case "Off":
                return {
                    icon: <Power size={20} className="text-black" />,
                    bgColor: "bg-white border-gray-200",
                    textColor: "text-black",
                    badge: "bg-black text-white"
                };
            case "Maintenance":
                return {
                    icon: <AlertCircle size={20} className="text-red-600" />,
                    bgColor: "bg-red-50",
                    textColor: "text-red-700",
                    badge: "bg-red-100 text-red-700"
                };
            default:
                return {
                    icon: <Clock size={20} className="text-gray-600" />,
                    bgColor: "bg-gray-50",
                    textColor: "text-gray-700",
                    badge: "bg-gray-100 text-gray-700"
                };
        }
    };

    // Check if user can report for this feeder
    const canReportForFeeder = (feeder) => {
        if (!user) return false;
        const userArea = user.ward?.toLowerCase().trim() || user.area?.toLowerCase().trim();
        // Support multiple wards per feeder
        const wardNames = feeder.wards?.map(w => w.name?.toLowerCase().trim() || "") || [];
        return wardNames.includes(userArea);
    };

    // Handle report click
    const handleReportClick = (feeder) => {
        if (!canReportForFeeder(feeder)) {
            setSelectedFeederId(feeder._id);
            setShowReportWarning(true);
            return;
        }
        // Redirect to report issue page with feeder pre-selected
        navigate("/report-issue", { state: { feeder: feeder.name } });
    };

    // Calculate system status summary
    const activeFeedersCount = feeders.filter(f => f.status === "On").length;
    const isSystemMostlyOn = activeFeedersCount > feeders.length / 2;
    const systemStatusInfo = getStatusIcon(activeFeedersCount > 0 ? "On" : "Off");

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-6 pt-12">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">Status</h1>
                        <p className="text-gray-500 mt-2 font-medium">
                            View the real-time electricity status of all feeders in the system
                        </p>
                    </div>

                    {/* System Status Summary */}
                    <div className="flex items-center gap-3 mt-6 bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            {systemStatusInfo.icon}
                        </div>
                        <div>
                            <p className="text-sm text-blue-600 font-semibold">System Status</p>
                            <p className={`text-lg font-bold ${systemStatusInfo.textColor}`}>
                                {activeFeedersCount} / {feeders.length} Feeders Active
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 sm:p-6">
                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by area, ward, or feeder name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    {searchTerm && (
                        <p className="text-sm text-gray-600 mt-2">
                            Found {filteredFeeders.length} feeder{filteredFeeders.length !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex justify-center items-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredFeeders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                        <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No Feeders Found</h3>
                        <p className="text-gray-500">
                            {searchTerm
                                ? "Try adjusting your search terms"
                                : "No feeders available in the system"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFeeders.map((feeder) => {
                            const statusIcon = getStatusIcon(feeder.status);
                            const isUserArea = canReportForFeeder(feeder);

                            return (
                                <div
                                    key={feeder._id}
                                    className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow overflow-hidden"
                                >
                                    {/* Status Header */}
                                    <div className={`${statusIcon.bgColor} p-4 border-b border-gray-100`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {statusIcon.icon}
                                                <span className={`text-sm font-bold ${statusIcon.textColor}`}>
                                                    {feeder.status}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-xs font-semibold px-3 py-1 rounded-full ${statusIcon.badge}`}
                                            >
                                                {feeder.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Feeder Info */}
                                    <div className="p-6">
                                        {/* Feeder Name */}
                                        <h3 className="text-lg font-black text-gray-800 mb-4">
                                            {feeder.name}
                                        </h3>

                                        {/* Location Details */}
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-start gap-3">
                                                <MapPin size={18} className="text-blue-600 mt-1 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                                        Ward
                                                    </p>
                                                    <p className="text-gray-800 font-bold">
                                                        {feeder.ward?.name || "Not specified"}
                                                    </p>
                                                </div>
                                            </div>

                                            {feeder.ward?.lga && (
                                                <div className="flex items-start gap-3">
                                                    <MapPin size={18} className="text-blue-600 mt-1 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                                            LGA
                                                        </p>
                                                        <p className="text-gray-800 font-bold">
                                                            {feeder.ward.lga.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {feeder.ward?.lga?.state && (
                                                <div className="flex items-start gap-3">
                                                    <MapPin size={18} className="text-blue-600 mt-1 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                                            State
                                                        </p>
                                                        <p className="text-gray-800 font-bold">
                                                            {feeder.ward.lga.state.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* User Area Indicator */}
                                        {user && (
                                            <div
                                                className={`mb-6 p-3 rounded-lg border ${isUserArea
                                                    ? "bg-green-50 border-green-200"
                                                    : "bg-gray-50 border-gray-200"
                                                    }`}
                                            >
                                                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                                                    Your registered area
                                                </p>
                                                <p
                                                    className={`text-sm font-bold ${isUserArea ? "text-green-700" : "text-gray-700"
                                                        }`}
                                                >
                                                    {isUserArea ? (
                                                        <span className="flex items-center gap-2">
                                                            <CheckCircle size={16} />
                                                            You can report here
                                                        </span>
                                                    ) : (
                                                        `Your area: ${user.ward || user.area || "Not set"}`
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {/* Last Updated */}
                                        <p className="text-xs text-gray-500 mb-6">
                                            Updated at {feeder.lastUpdated}
                                        </p>

                                        {/* Report Button */}
                                        {user && user.role === "user" && (
                                            <button
                                                onClick={() => handleReportClick(feeder)}
                                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${isUserArea
                                                    ? "bg-black hover:bg-gray-900 text-white shadow-lg shadow-gray-200"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                    }`}
                                                disabled={!isUserArea}
                                            >
                                                <AlertCircle size={18} />
                                                {isUserArea ? "Report Issue" : "Cannot Report Here"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Report Warning Modal */}
            {showReportWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-yellow-100 p-3 rounded-full">
                                <AlertCircle size={24} className="text-yellow-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Cannot Report Here</h2>
                        </div>

                        <p className="text-gray-600 mb-6">
                            You can only report issues in your registered area. To report an issue in another area,
                            you need to update your profile first.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setShowReportWarning(false);
                                    navigate("/profile");
                                }}
                                className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                            >
                                <ChevronRight size={18} />
                                Edit Profile & Change Area
                            </button>

                            <button
                                onClick={() => setShowReportWarning(false)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-bold transition"
                            >
                                Cancel
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 text-center mt-4">
                            Your current area: {user?.ward || user?.area || "Not set"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllStatus;
