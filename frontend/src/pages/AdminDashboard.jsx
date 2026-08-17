import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Send, AlertTriangle, Info, CheckCircle2,
    Loader2, Users, FileText, Activity, Shield, Trash2,
    Search, RefreshCw, ChevronRight, Menu, X, Clock, MapPin, Lock,
    ChevronDown, ChevronUp, Package, Zap, MessageSquare
} from "lucide-react";
import adminService from "../services/adminService";
import { getAllReports } from "../services/reportService";
import { getCurrentUser } from "../services/authService";
import api from "../services/api";
import { isoToDatetimeLocal, datetimeLocalToIso } from "../utils/dateConverter";
import CompanyMessagingModule from "../components/CompanyMessagingModule";
import { getUnreadCount } from "../services/companyMessageService";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const [activeTab, setActiveTab] = useState("overview");
    const [assignedFeeders, setAssignedFeeders] = useState([]);
    const [substations, setSubstations] = useState([]);
    const [expandedSubstations, setExpandedSubstations] = useState(new Set());
    const [feederStatuses, setFeederStatuses] = useState({});
    const [selectedFeeder, setSelectedFeeder] = useState(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [msgUnreadCount, setMsgUnreadCount] = useState(0);
    
    // Helper function to clean feeder name
    const cleanFeederName = (name) => {
        if (!name) return name;
        // Split on " - " and take the first part
        return name.split(" - ")[0].trim();
    };
    
    // Feeder search state
    const [feederSearchQuery, setFeederSearchQuery] = useState("");
    
    // Filter feeders based on search query
    const filteredFeeders = assignedFeeders.filter(feeder => {
        const feederName = typeof feeder === "string" ? feeder : feeder.name;
        const cleanedName = cleanFeederName(feederName);
        return cleanedName.toLowerCase().includes(feederSearchQuery.toLowerCase());
    });

    // Auth Check & Initial Data Loading
    useEffect(() => {
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin" && currentUser.role !== "company-super-admin" && currentUser.role !== "regional-admin")) {
            navigate("/");
            return;
        }
        
        // Only load if we haven't loaded yet
        getUnreadCount().then(r => setMsgUnreadCount(r?.count || 0)).catch(() => {});
        if (!hasLoaded) {
            loadAdminFeeders();
            setHasLoaded(true);
        }
    }, [currentUser?._id, navigate, hasLoaded]);

    const loadAdminFeeders = async () => {
        try {
            const [profileResult, substationResult, statusResult] = await Promise.allSettled([
                adminService.getProfile().catch((err) => {
                    console.warn("Admin profile load skipped", err?.response?.status || err?.message);
                    return null;
                }),
                api.get('/admin/injection-substations').catch((err) => {
                    console.warn("Injection substations load skipped", err?.response?.status || err?.message);
                    return { data: [] };
                }),
                api.get('/power/all-status').catch((err) => {
                    console.warn("Power status load skipped", err?.response?.status || err?.message);
                    return { data: [] };
                })
            ]);

            const profileData = profileResult.status === "fulfilled" ? profileResult.value : null;
            const substationPayload = substationResult.status === "fulfilled" ? substationResult.value : null;
            const substationData = Array.isArray(substationPayload?.data)
                ? substationPayload.data
                : Array.isArray(substationPayload)
                    ? substationPayload
                    : [];

            setSubstations(substationData);

            let feedersToLoad = [];
            substationData.forEach((substation) => {
                if (substation?.feeders) {
                    feedersToLoad.push(...substation.feeders);
                }
            });

            if (feedersToLoad.length === 0 && Array.isArray(profileData?.assignedFeeders)) {
                feedersToLoad = profileData.assignedFeeders;
            }

            if (feedersToLoad.length === 0 && Array.isArray(currentUser?.assignedFeeders)) {
                feedersToLoad = currentUser.assignedFeeders;
            }

            setAssignedFeeders(feedersToLoad);

            if (feedersToLoad.length > 0) {
                setSelectedFeeder(feedersToLoad[0]._id || feedersToLoad[0]);
            }

            const statusPayload = statusResult.status === "fulfilled" ? statusResult.value : null;
            const statusData = Array.isArray(statusPayload?.data)
                ? statusPayload.data
                : [];

            if (feedersToLoad.length > 0 && statusData.length > 0) {
                const statusMap = {};
                statusData.forEach((s) => {
                    if (s && s.feeder) {
                        const fId = s.feeder._id || s.feeder;
                        const fName = s.feeder.name || s.feederName;
                        const status = s.status || (s.isActive ? "on" : "off");
                        statusMap[fId] = status;
                        if (fName) statusMap[fName] = status;
                    }
                });
                setFeederStatuses(statusMap);
            }
        } catch (err) {
            console.error("Failed to load admin feeders", err);
            if (currentUser?.assignedFeeders && currentUser.assignedFeeders[0]) {
                setAssignedFeeders(currentUser.assignedFeeders);
                setSelectedFeeder(currentUser.assignedFeeders[0]._id || currentUser.assignedFeeders[0]);
            }
        }
    };

    const toggleSubstationExpansion = (substationId) => {
        const newExpanded = new Set(expandedSubstations);
        if (newExpanded.has(substationId)) {
            newExpanded.delete(substationId);
        } else {
            newExpanded.add(substationId);
        }
        setExpandedSubstations(newExpanded);
    };
        const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [searchQuery, setSearchQuery] = useState("");

    // Notification State
    const [notifData, setNotifData] = useState({ title: "", message: "" });

    // Power Status State
    const [powerForm, setPowerForm] = useState({
        status: "on",
        isActive: true,
        expectedOutageTime: "",
        expectedRestoreTime: "",
        maintenanceStart: "",
        maintenanceEnd: "",
        reason: "",
        estimatedNextOutage: "",
        feederId: ""
    });

    const [selectedFeeders, setSelectedFeeders] = useState([]);

    useEffect(() => {
        if (selectedFeeders.length > 0) {
            setPowerForm(prev => ({ ...prev, feederId: selectedFeeders[0], feederIds: selectedFeeders }));
            if (selectedFeeders.length === 1) {
                fetchFeederStatus(selectedFeeders[0]);
            }
        } else {
            setPowerForm(prev => ({ ...prev, feederId: "", feederIds: [] }));
        }
    }, [selectedFeeders]);

    const toggleFeederSelection = (id) => {
        setSelectedFeeders(prev => {
            if (prev.includes(id)) {
                return prev.filter(fId => fId !== id);
            }
            if (prev.length >= 5) {
                setMessage({ text: "Maximum 5 feeders can be controlled at once", type: "error" });
                return prev;
            }
            return [...prev, id];
        });
    };

    const fetchFeederStatus = async (feederId) => {
        try {
            const response = await api.get(`/power/status?feeder=${feederId}`);
            const status = response.data.status || (response.data.isActive ? "on" : "off");
            
            // CRITICAL FIX: Convert ISO timestamps to datetime-local format for input binding
            const expectedOutageIso = response.data.expectedOutageTime || response.data.estimatedNextOutage || "";
            const expectedRestoreIso = response.data.expectedRestoreTime || response.data.estimatedNextOutage || "";
            const maintenanceStartIso = response.data.maintenanceStart || "";
            const maintenanceEndIso = response.data.maintenanceEnd || "";
            
            const expectedOutageDatetimeLocal = isoToDatetimeLocal(expectedOutageIso);
            const expectedRestoreDatetimeLocal = isoToDatetimeLocal(expectedRestoreIso);
            const maintenanceStartDatetimeLocal = isoToDatetimeLocal(maintenanceStartIso);
            const maintenanceEndDatetimeLocal = isoToDatetimeLocal(maintenanceEndIso);
            
            console.log(`[FEEDER STATUS LOADED] FeederId: ${feederId}`);
            console.log(`ISO expectedOutageTime: ${expectedOutageIso} → datetime-local: ${expectedOutageDatetimeLocal}`);
            console.log(`ISO expectedRestoreTime: ${expectedRestoreIso} → datetime-local: ${expectedRestoreDatetimeLocal}`);
            
            setPowerForm({
                status: status,
                isActive: status === "on",
                expectedOutageTime: expectedOutageDatetimeLocal,
                expectedRestoreTime: expectedRestoreDatetimeLocal,
                maintenanceStart: maintenanceStartDatetimeLocal,
                maintenanceEnd: maintenanceEndDatetimeLocal,
                reason: response.data.reason || response.data.maintenanceReason || "",
                estimatedNextOutage: expectedOutageIso,
                feederId: feederId
            });
        } catch (err) {
            console.error("Failed to fetch feeder status", err);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [activeTab]);

    const fetchDashboardData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const statsData = await adminService.getStats();
            setStats(statsData);

            if (activeTab === "overview") {
                try {
                    const predRes = await api.get('/predictions');
                    if (predRes.data && predRes.data.items) {
                        setPredictions(predRes.data.items);
                    }
                } catch (err) {
                    console.error("Failed to fetch predictions on overview", err);
                }
            } else if (activeTab === "users") {
                const usersData = await adminService.getUsers();
                setUsers(usersData);
            } else if (activeTab === "reports") {
                const reportsData = await getAllReports();
                setReports(reportsData);
            }
        } catch (err) {
            console.error("Failed to fetch admin data", err);
            setMessage({ text: "Error loading dashboard data", type: "error" });
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleUpdatePower = async (e) => {
        e.preventDefault();
        if (selectedFeeders.length === 0) {
            setMessage({ text: "Please select at least one feeder", type: "error" });
            return;
        }

        // CRITICAL FIX: Convert datetime-local values BACK TO ISO before sending to backend
        // datetime-local is in YYYY-MM-DDTHH:mm format → needs ISO format YYYY-MM-DDTHH:mm:ss.sssZ
        const expectedOutageIso = datetimeLocalToIso(powerForm.expectedOutageTime);
        const expectedRestoreIso = datetimeLocalToIso(powerForm.expectedRestoreTime);
        const maintenanceStartIso = datetimeLocalToIso(powerForm.maintenanceStart);
        const maintenanceEndIso = datetimeLocalToIso(powerForm.maintenanceEnd);

        console.log(`[POWER FORM UPDATE] Converting datetime-local to ISO`);
        console.log(`expectedOutageTime: ${powerForm.expectedOutageTime} → ${expectedOutageIso}`);
        console.log(`expectedRestoreTime: ${powerForm.expectedRestoreTime} → ${expectedRestoreIso}`);
        console.log(`Status: ${powerForm.status}`);

        // Validate required dates based on status
        if (powerForm.status === "off" && !expectedRestoreIso) {
            setMessage({ text: "Expected Restoration time is required for POWER OFF", type: "error" });
            return;
        }

        if (powerForm.status === "maintenance" && !expectedRestoreIso) {
            setMessage({ text: "Expected completion time is required for MAINTENANCE", type: "error" });
            return;
        }

        setActionLoading(true);
        try {
            // Send ISO formatted dates to backend
            await adminService.updatePowerStatus({
                status: powerForm.status,
                isActive: powerForm.isActive,
                expectedOutageTime: powerForm.status === "on" ? expectedOutageIso : null,
                expectedRestoreTime: powerForm.status !== "on" ? expectedRestoreIso : null,
                maintenanceStart: powerForm.status === "maintenance" ? maintenanceStartIso : null,
                maintenanceEnd: powerForm.status === "maintenance" ? maintenanceEndIso : null,
                reason: powerForm.reason || "",
                feederIds: selectedFeeders
            });
            setMessage({ text: `Power status updated for ${selectedFeeders.length} feeder${selectedFeeders.length > 1 ? 's' : ''}!`, type: "success" });
            
            // Update local state for immediate UI feedback
            const newStatuses = { ...feederStatuses };
            selectedFeeders.forEach(id => {
                newStatuses[id] = powerForm.status;
            });
            setFeederStatuses(newStatuses);
            
            fetchDashboardData(true);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to update power status", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateReportStatus = async (id, status) => {
        setActionLoading(true);
        try {
            await adminService.updateReportStatus(id, status);
            setMessage({ text: `Report marked as ${status}`, type: "success" });
            fetchDashboardData(true);
        } catch (err) {
            setMessage({ text: "Failed to update report", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        setActionLoading(true);
        try {
            await adminService.deleteUser(id);
            setMessage({ text: "User deleted successfully", type: "success" });
            fetchDashboardData(true);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to delete user", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendNotif = async (e) => {
        e.preventDefault();
        if (!selectedFeeder && currentUser.role === "admin") {
            setMessage({ text: "Please select a feeder first", type: "error" });
            return;
        }
        setActionLoading(true);
        try {
            await adminService.sendCustomNotification({
                message: notifData.message,
                feeder: selectedFeeder
            });
            setMessage({
                text: `Success! Your message has been sent to users in the selected feeder area.`,
                type: "success"
            });
            setNotifData({ title: "", message: "" });
        } catch (err) {
            setMessage({ text: "Failed to dispatch notification.", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredReports = reports.filter(r =>
        r.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.issueType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Sidebar - Desktop */}
            <aside className="w-full md:w-64 bg-white border-r border-gray-100 p-6 space-y-8 md:sticky md:top-0 md:h-screen hidden md:block">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white">
                        <Shield size={24} />
                    </div>
                    <h2 className="font-black text-xl text-blue-600 tracking-tight">AdminPanel</h2>
                </div>

                <nav className="space-y-2">
                    {[
                        { id: "overview", icon: <Activity size={18} />, label: "Overview" },
                        { id: "control", icon: <Zap size={18} />, label: "Power Control" },
                        { id: "reports", icon: <FileText size={18} />, label: "Reports" },
                        { id: "users", icon: <Users size={18} />, label: "User Management" },
                        { id: "notifs", icon: <Send size={18} />, label: "Global Alerts" },
                        { id: "internal-messages", icon: <MessageSquare size={18} />, label: "Internal Messages", badge: msgUnreadCount }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); if (item.id === "internal-messages") { getUnreadCount().then(r => setMsgUnreadCount(r?.count || 0)).catch(() => {}); } }}
                            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-blue-600 hover:bg-blue-50'}`}
                        >
                            {React.cloneElement(item.icon, { className: activeTab === item.id ? "text-white" : "text-blue-600" })}
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                                    {item.badge > 99 ? "99+" : item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Assigned Feeders Section */}
                {assignedFeeders.length > 0 && (
                    <div className="pt-8 border-t border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                            {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? "All Grid Feeders" : "Assigned Feeders"}
                        </p>
                        <div className="mb-3 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search feeders..."
                                value={feederSearchQuery}
                                onChange={(e) => setFeederSearchQuery(e.target.value)}
                                className="w-full p-2 pl-9 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {filteredFeeders.map((feeder) => (
                                <div
                                    key={typeof feeder === "string" ? feeder : feeder._id}
                                    className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${selectedFeeder === (typeof feeder === "string" ? feeder : feeder._id) ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 'bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100'}`}
                                    onClick={() => setSelectedFeeder(typeof feeder === "string" ? feeder : feeder._id)}
                                >
                                    <MapPin size={14} className={selectedFeeder === (typeof feeder === "string" ? feeder : feeder._id) ? 'text-white shrink-0' : 'text-blue-600 shrink-0'} />
                                    <span className="text-xs font-bold truncate">
                                        {cleanFeederName(typeof feeder === "string" ? feeder : feeder.name || feeder)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-8 border-t border-gray-100">
                    <div className="bg-blue-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Access Level</p>
                        <div className="flex items-center gap-2">
                            <Lock size={14} className="text-blue-600" />
                            <span className="text-xs font-bold text-gray-700 font-mono">
                                {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? "FULL ACCESS" : `${assignedFeeders.length} FEEDER${assignedFeeders.length !== 1 ? 'S' : ''}`}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Nav Top Bar */}
            <div className="md:hidden bg-white p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <Shield className="text-blue-600" size={24} />
                    <span className="font-black text-blue-600">AdminPanel</span>
                </div>
                <div className="flex gap-2">
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="text-sm font-bold bg-gray-50 border-none rounded-lg p-2 outline-none"
                    >
                        <option value="overview">Overview</option>
                        <option value="control">Power Control</option>
                        <option value="reports">Reports</option>
                        <option value="users">Users</option>
                        <option value="notifs">Messaging</option>
                    </select>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-8 md:p-12 max-w-6xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight capitalize">
                            {activeTab === 'overview' ? 'Dashboard Summary' : activeTab.replace('notifs', 'Messaging').replace('control', 'Power Control').replace('users', 'User Management').replace('reports', 'Community Reports')}
                        </h1>
                        <p className="text-gray-500 font-medium">Welcome back, {currentUser?.fullName}</p>
                        {assignedFeeders.length > 0 && (
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">
                                <Lock size={12} className="inline mr-1" /> {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? "Super Admin" : "Admin"} | {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? "Managing All Grid Feeders" : `Managing ${assignedFeeders.length} Feeder${assignedFeeders.length !== 1 ? 's' : ''}`}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 bg-black text-white p-3 px-6 rounded-2xl font-bold text-sm hover:bg-gray-900 active:scale-95 transition-all shadow-lg shadow-gray-200"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Sync Data
                    </button>
                </div>

                {/* Global Feedback Message */}
                {message.text && (
                    <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm border ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        <p className="font-bold text-sm">{message.text}</p>
                    </div>
                )}

                {/* LOADING STATE Overlay */}
                {isLoading && activeTab !== 'overview' && (
                    <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400">
                        <Loader2 size={40} className="animate-spin text-blue-600" />
                        <p className="font-bold uppercase tracking-widest text-xs">Accessing Database...</p>
                    </div>
                )}

                {/* TAB: OVERVIEW */}
                {!isLoading && activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Feeder Access Info Card */}
                        {assignedFeeders.length > 0 && (
                            <div className={`rounded-[2.5rem] p-8 border shadow-sm ${(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 bg-white rounded-2xl border flex items-center justify-center shadow-sm ${(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? 'border-indigo-200' : 'border-blue-200'}`}>
                                            {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? <Shield className="text-indigo-600" size={28} /> : <MapPin className="text-blue-600" size={28} />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 tracking-tight">
                                                {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? "Global Grid Management" : "Assigned Feeders"}
                                            </h3>
                                            <p className="text-sm text-gray-600 font-medium">
                                                {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? "You have full control over all grid feeders" : `You have access to ${assignedFeeders.length} feeder${assignedFeeders.length !== 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                    </div>
                                    <Shield className={`${(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") ? 'text-indigo-600' : 'text-blue-600'} opacity-20`} size={48} />
                                </div>
                                <div className="mb-4 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search feeders..."
                                        value={feederSearchQuery}
                                        onChange={(e) => setFeederSearchQuery(e.target.value)}
                                        className="w-full p-3 pl-11 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {filteredFeeders.map((feeder) => (
                                        <div
                                            key={typeof feeder === "string" ? feeder : feeder._id}
                                            className={`p-4 bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${selectedFeeder === (typeof feeder === "string" ? feeder : feeder._id) ? 'border-blue-600 ring-2 ring-blue-100' : 'border-blue-100'}`}
                                            onClick={() => {
                                                setSelectedFeeder(typeof feeder === "string" ? feeder : feeder._id);
                                                setActiveTab("control");
                                            }}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                <span className="text-xs font-black text-blue-600 uppercase tracking-tight">Active</span>
                                            </div>
                                            <p className="font-bold text-gray-900 text-sm truncate">
                                                {cleanFeederName(typeof feeder === "string" ? feeder : feeder.name || feeder)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-600 font-medium mt-6 pt-6 border-t border-blue-100">
                                    {(currentUser?.role === "super-admin" || currentUser?.role === "company-super-admin") 
                                        ? "💡 As a Super Admin, you can toggle power status for any feeder in the system. Click on a feeder card to manage it directly."
                                        : "💡 All data shown on this dashboard is filtered to only include reports and users from these feeders. For multi-feeder assignments, contact your Super Admin."
                                    }
                                </p>
                            </div>
                        )}

                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: "Total Users", val: stats?.totalUsers || 0, icon: <Users className="text-blue-600" />, bg: "bg-blue-50" },
                                { label: "Total Reports", val: stats?.totalReports || 0, icon: <FileText className="text-indigo-600" />, bg: "bg-indigo-50" },
                                { label: "Pending Tasks", val: stats?.pendingReports || 0, icon: <AlertTriangle className="text-amber-600" />, bg: "bg-amber-50" },
                                { 
                                    label: selectedFeeder ? `Feeder: ${cleanFeederName(assignedFeeders.find(f => (f._id || f) === selectedFeeder)?.name || 'Selected')}` : "Global Grid", 
                                    val: (feederStatuses[selectedFeeder] === "on" || (!feederStatuses[selectedFeeder] && powerForm.status === "on")) ? "ONLINE" : (feederStatuses[selectedFeeder] === "maintenance" ? "MAINTENANCE" : "OFFLINE"), 
                                    icon: <Zap className={(feederStatuses[selectedFeeder] === "on" || (!feederStatuses[selectedFeeder] && powerForm.status === "on")) ? "text-green-600" : (feederStatuses[selectedFeeder] === "maintenance" ? "text-yellow-600" : "text-red-600")} />, 
                                    bg: (feederStatuses[selectedFeeder] === "on" || (!feederStatuses[selectedFeeder] && powerForm.status === "on")) ? "bg-green-50" : (feederStatuses[selectedFeeder] === "maintenance" ? "bg-red-50" : "bg-gray-100") 
                                },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4`}>
                                        {stat.icon}
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-black text-gray-900">{stat.val}</h3>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Recent Power Activity */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                    Quick Power Control
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                                                {selectedFeeder ? `${cleanFeederName(assignedFeeders.find(f => (f._id || f) === selectedFeeder)?.name || 'Selected')} Status` : 'Grid Status'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                                {selectedFeeder ? 'Currently managing this feeder' : 'Global system override for all users'}
                                            </p>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase ${
                                            (feederStatuses[selectedFeeder] === "on" || (!feederStatuses[selectedFeeder] && powerForm.status === "on")) ? 'bg-green-100 text-green-700' : 
                                            (feederStatuses[selectedFeeder] === "maintenance" ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-900 border border-gray-200')
                                        }`}>
                                            {feederStatuses[selectedFeeder] === "on" || (!feederStatuses[selectedFeeder] && powerForm.status === "on") ? 'ACTIVE' : 
                                             (feederStatuses[selectedFeeder] === "maintenance" ? 'MAINTENANCE' : 'OUTAGE')}
                                        </div>

                                    </div>
                                    <button
                                        onClick={() => setActiveTab('control')}
                                        className="w-full p-4 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                                    >
                                        Manage Power Rules <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Pending Reports Summary */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                    Maintenance Summary
                                </h3>
                                {stats?.pendingReports > 0 ? (
                                    <div className="space-y-4">
                                        <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100/50 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                <AlertTriangle size={20} className="text-amber-600" />
                                            </div>
                                            <p className="text-sm font-bold text-amber-900">You have {stats.pendingReports} community reports waiting for review.</p>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab('reports')}
                                            className="w-full p-4 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                                        >
                                            Review All Reports <ChevronRight size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400">
                                        <CheckCircle2 size={40} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-bold text-sm">No pending reports. Great job!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Predictive Insights & Maintenance guidelines */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mt-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                    <span className="text-xl">✨</span>
                                    AI Grid Analytics & Failure Predictions
                                </h3>
                                <button
                                    onClick={async () => {
                                        try {
                                            setIsLoading(true);
                                            await api.post("/predictions/run");
                                            setMessage({ text: "AI Predictions updated successfully!", type: "success" });
                                            fetchDashboardData(true);
                                        } catch (err) {
                                            setMessage({ text: "Failed to recalculate predictions", type: "error" });
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="text-[10px] font-black text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100/50 px-3.5 py-1.5 rounded-xl transition-all"
                                >
                                    🔄 Recalculate AI Risks
                                </button>
                            </div>
                            
                            {predictions && predictions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {predictions.map((pred) => (
                                        <div key={pred._id} className="p-6 bg-gradient-to-br from-purple-50/40 to-indigo-50/10 border border-purple-100 rounded-[2rem] space-y-4 shadow-sm hover:shadow transition-all relative overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-pulse"></span>
                                                    <span className="text-xs font-black uppercase text-purple-800 tracking-tight">
                                                        {pred.feeder} Feeder
                                                    </span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                                                    pred.riskLevel === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    pred.riskLevel === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                    pred.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                    'bg-green-100 text-green-700 border-green-200'
                                                }`}>
                                                    {pred.riskLevel} Risk
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">AI Threat Analysis</span>
                                                <p className="text-xs text-gray-800 font-bold leading-relaxed">{pred.prediction}</p>
                                            </div>

                                            {pred.metadata?.recommendedActions && pred.metadata.recommendedActions.length > 0 && (
                                                <div className="space-y-2 pt-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">AI Recommended Precautions</span>
                                                    <ul className="space-y-1">
                                                        {pred.metadata.recommendedActions.map((action, idx) => (
                                                            <li key={idx} className="text-[11px] text-gray-600 font-medium flex items-center gap-2">
                                                                <span className="text-purple-500 font-black">✓</span> {action}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-4 border-t border-purple-100/50">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Model Confidence</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-gray-150 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${(pred.confidence * 100).toFixed(0)}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-purple-700 font-mono">{(pred.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-250">
                                    <span className="text-3xl block mb-2">🧠</span>
                                    <p className="font-bold text-sm text-gray-600">No predictions logged yet.</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Tap "Recalculate AI Risks" to manually synthesize failures and evaluate local incident statistics.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: POWER CONTROL */}
                {activeTab === "control" && (
                    <div className="max-w-2xl bg-white rounded-[2.5rem] p-8 sm:p-12 border border-gray-100 shadow-sm">
                        <header className="mb-10 text-center sm:text-left">
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 justify-center sm:justify-start">
                                Infrastructure Control
                            </h2>
                            <p className="text-gray-500 font-medium mt-2">Adjust live grid status and maintenance schedules</p>
                        </header>

                        <form onSubmit={handleUpdatePower} className="space-y-8">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1 flex justify-between">
                                    <span>Target Feeders (Select up to 5)</span>
                                    <span className="text-blue-600">{selectedFeeders.length}/5 Selected</span>
                                </label>
                                <div className="mb-3 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search feeders..."
                                        value={feederSearchQuery}
                                        onChange={(e) => setFeederSearchQuery(e.target.value)}
                                        className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                    {substations.map((substation) => {
                                        // Filter feeders in substation by search query
                                        const substationFeeders = substation.feeders?.filter(feeder => {
                                            const fName = typeof feeder === "string" ? feeder : feeder.name;
                                            const cleanedName = cleanFeederName(fName);
                                            return cleanedName.toLowerCase().includes(feederSearchQuery.toLowerCase());
                                        }) || [];
                                        
                                        if (substationFeeders.length === 0) return null;

                                        const isExpanded = expandedSubstations.has(substation._id);
                                        return (
                                            <div 
                                                key={substation._id}
                                                className="border border-gray-100 rounded-2xl overflow-hidden bg-white"
                                            >
                                                <button 
                                                    type="button"
                                                    onClick={() => toggleSubstationExpansion(substation._id)}
                                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 rounded-xl">
                                                            <Package size={16} className="text-blue-600" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-black text-gray-900">
                                                                {substation.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500 font-medium">
                                                                {substationFeeders.length} Feeder{''}{substationFeeders.length !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                                {isExpanded && (
                                                    <div className="p-3 space-y-2 border-t border-gray-100">
                                                        {substationFeeders.map(feeder => {
                                                            const fId = typeof feeder === "string" ? feeder : feeder._id;
                                                            const fName = typeof feeder === "string" ? feeder : feeder.name;
                                                            const cleanedName = cleanFeederName(fName);
                                                            const isSelected = selectedFeeders.includes(fId);
                                                            const isFeederActive = feederStatuses[fId] || feederStatuses[fName] || "off";

                                                            return (
                                                                <button
                                                                    key={fId}
                                                                    type="button"
                                                                    onClick={() => toggleFeederSelection(fId)}
                                                                    className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${isSelected 
                                                                        ? 'border-blue-600 bg-blue-50 shadow-sm' 
                                                                        : isFeederActive === "on"
                                                                            ? 'border-gray-50 bg-white hover:border-gray-200 hover:bg-gray-50' 
                                                                            : isFeederActive === "maintenance"
                                                                                ? 'border-red-50 bg-white hover:border-red-100 hover:bg-red-50'
                                                                                : 'border-black/10 bg-gray-50/50 hover:border-black/20'
                                                                        }`}
                                                                >
                                                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : isFeederActive === "on" ? 'bg-green-600 text-white' : isFeederActive === "maintenance" ? 'bg-red-600 text-white' : 'bg-black text-white'}`}>
                                                                        <MapPin size={14} />
                                                                    </div>
                                                                    <div className="flex flex-col flex-1">
                                                                        <span className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-blue-900' : isFeederActive === "on" ? 'text-gray-500' : 'text-black'}`}>{cleanedName}</span>
                                                                        <span className={`text-[8px] font-bold ${isFeederActive === "on" ? 'text-green-600' : isFeederActive === "maintenance" ? 'text-red-600' : 'text-black'}`}>
                                                                            {isFeederActive === "on" ? 'POWER ON' : isFeederActive === "maintenance" ? 'MAINTENANCE' : 'POWER OFF'}
                                                                        </span>
                                                                    </div>
                                                                    {isSelected && <CheckCircle2 className="text-blue-600" size={16} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Grid Operational Status</p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setPowerForm({ ...powerForm, status: "on", isActive: true })}
                                        className={`flex-1 p-5 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-3 border transition-all ${powerForm.status === "on" ? 'bg-green-600 text-white border-green-700 shadow-xl shadow-green-200' : 'bg-green-50 text-green-600 border-green-100'}`}
                                    >
                                        POWER ON
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPowerForm({ ...powerForm, status: "off", isActive: false })}
                                        className={`flex-1 p-5 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-3 border transition-all ${powerForm.status === "off" ? 'bg-black text-white border-black shadow-xl shadow-gray-400' : 'bg-gray-100 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        POWER OFF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPowerForm({ ...powerForm, status: "maintenance", isActive: false })}
                                        className={`flex-1 p-5 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-3 border transition-all ${powerForm.status === "maintenance" ? 'bg-red-600 text-white border-red-700 shadow-xl shadow-red-200' : 'bg-red-50 text-red-600 border-red-100'}`}
                                    >
                                        MAINTENANCE
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                    {powerForm.status === "on" ? "Expected Outage Time" : powerForm.status === "off" ? "Expected Restoration Time" : "Maintenance Completion Time"} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="datetime-local"
                                        required={powerForm.status !== "on"}
                                        value={powerForm.status === "on" ? powerForm.expectedOutageTime : (powerForm.status === "maintenance" ? powerForm.expectedRestoreTime : powerForm.expectedRestoreTime)}
                                        onChange={(e) => setPowerForm({
                                            ...powerForm,
                                            expectedOutageTime: powerForm.status === "on" ? e.target.value : powerForm.expectedOutageTime,
                                            expectedRestoreTime: powerForm.status !== "on" ? e.target.value : powerForm.expectedRestoreTime
                                        })}
                                        className={`w-full p-5 pl-12 bg-gray-50 border rounded-2xl focus:ring-2 outline-none transition-all font-bold placeholder:text-gray-300 ${!(powerForm.status === "on" ? powerForm.expectedOutageTime : powerForm.expectedRestoreTime) && message.type === 'error' ? 'border-red-300 focus:ring-red-500' : 'border-gray-100 focus:ring-blue-500'}`}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 ml-1">Mandatory: Visible to all users on their main dashboard.</p>
                            </div>

                            {powerForm.status === "maintenance" && (
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                        Maintenance Reason
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={powerForm.reason}
                                        onChange={(e) => setPowerForm({ ...powerForm, reason: e.target.value })}
                                        className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 outline-none transition-all font-bold placeholder:text-gray-300 border-gray-100 focus:ring-blue-500"
                                        placeholder="Enter maintenance reason"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full py-5 rounded-[2rem] font-black bg-black text-white shadow-xl shadow-gray-400 hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-75 submit-btn"
                            >
                                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : "APPLY STATUS CHANGE"}
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB: REPORTS */}
                {activeTab === "reports" && !isLoading && (
                    <div className="space-y-6">
                        {currentUser?.role === "admin" && assignedFeeders.length > 0 && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                                <p className="text-sm text-blue-800 font-medium">
                                    Showing reports from your assigned feeders only. <span className="font-black">{assignedFeeders.map(f => typeof f === "string" ? f : f.name).join(', ')}</span>
                                </p>
                            </div>
                        )}
                        <div className="relative max-w-md mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Filter reports by area or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-4 pl-12 bg-white border border-gray-200 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporter</th>
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type / Issue</th>
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredReports.map((report) => (
                                        <tr key={report._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="font-bold text-gray-900 leading-tight">{report.fullName}</div>
                                                <div className="text-xs text-gray-400 font-medium">{report.phone}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-black uppercase">
                                                        User: {report.issueType}
                                                    </span>
                                                    {report.aiClassification && (
                                                        <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
                                                            ✨ AI: {report.aiClassification}
                                                        </span>
                                                    )}
                                                    {report.severity && (
                                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                                                            report.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            report.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                            report.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-green-50 text-green-700 border-green-100'
                                                        }`}>
                                                            {report.severity}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-700 font-bold mb-1">{report.description}</div>
                                                {report.aiSummary ? (
                                                    <div className="text-[11px] bg-purple-50/50 border border-purple-100/50 text-purple-900 p-2.5 rounded-xl font-medium flex items-start gap-2 max-w-sm mt-2 shadow-sm">
                                                        <span className="shrink-0 text-purple-600 mt-0.5">🧠</span>
                                                        <div>
                                                            <span className="font-bold text-purple-800 text-[10px] uppercase block mb-0.5">AI Summary</span>
                                                            <p className="leading-tight text-gray-700">{report.aiSummary}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                setActionLoading(true);
                                                                await api.post(`/ai/analyze-report/${report._id}`);
                                                                setMessage({ text: "AI Analysis completed!", type: "success" });
                                                                fetchDashboardData(true);
                                                            } catch (err) {
                                                                setMessage({ text: "AI Analysis failed", type: "error" });
                                                            } finally {
                                                                setActionLoading(false);
                                                            }
                                                        }}
                                                        disabled={actionLoading}
                                                        className="text-[10px] font-black text-purple-600 hover:text-purple-800 flex items-center gap-1 mt-2 focus:outline-none"
                                                    >
                                                        ✨ Run AI Analysis
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="font-bold text-gray-700 text-sm">{report.area}</div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{report.feeder}</div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${report.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    report.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                                    }`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                {report.status !== 'Resolved' && (
                                                    <button
                                                        onClick={() => handleUpdateReportStatus(report._id, "Resolved")}
                                                        className="p-2 bg-black text-white rounded-xl hover:bg-gray-900 transition-all font-bold text-xs px-4 whitespace-nowrap submit-btn"
                                                    >
                                                        RESOLVE
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredReports.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-20 text-center text-gray-400 font-bold">No reports found matching your criteria.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: USERS */}
                {activeTab === "users" && !isLoading && (
                    <div className="space-y-6">
                        {currentUser?.role === "admin" && assignedFeeders.length > 0 && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                                <p className="text-sm text-blue-800 font-medium">
                                    Showing users from your assigned feeders only. <span className="font-black">{assignedFeeders.map(f => typeof f === "string" ? f : f.name).join(', ')}</span>
                                </p>
                            </div>
                        )}
                        <div className="relative max-w-md mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-4 pl-12 bg-white border border-gray-200 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joining Date</th>
                                        <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Protection</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredUsers.map((user) => (
                                        <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 uppercase">
                                                        {user.fullName[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{user.fullName}</div>
                                                        <div className="text-xs text-gray-400 font-medium">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.role.includes('admin') ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-6 text-sm text-gray-500 font-medium">
                                                {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="p-6 text-right">
                                                {user.role !== "super-admin" && currentUser?._id !== user._id && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user._id)}
                                                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm shadow-red-50"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                {user.role === "super-admin" && (
                                                    <Shield size={20} className="text-blue-600 inline-block mr-3 opacity-30" />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: NOTIFICATIONS (MESSAGING) */}
                {activeTab === "notifs" && (
                    <div className="max-w-2xl bg-white rounded-[2.5rem] p-8 sm:p-12 border border-gray-100 shadow-sm">
                        <header className="mb-10">
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                <Send className="text-blue-600" />
                                Global Messaging
                            </h2>
                            <p className="text-gray-500 font-medium mt-2">Send emergency alerts and updates to all system users</p>
                            {currentUser?.role === "admin" && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                                    <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                    <p className="text-sm text-blue-800 font-medium">
                                        Your messages will be visible to all users. However, you have management access for your assigned feeder areas only.
                                    </p>
                                </div>
                            )}
                        </header>

                        <form onSubmit={handleSendNotif} className="space-y-8">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Alert Title</label>
                                <input
                                    type="text"
                                    value={notifData.title}
                                    onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                                    placeholder="E.g., Emergency Grid Repair"
                                    className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Detailed Message</label>
                                <textarea
                                    value={notifData.message}
                                    onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                                    placeholder="Explain the situation in details..."
                                    rows="5"
                                    className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold resize-none"
                                    required
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full py-5 rounded-[2rem] font-black bg-black text-white shadow-xl shadow-gray-400 hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-75 submit-btn"
                            >
                                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} /> SEND GLOBAL ALERT NOW</>}
                            </button>

                            <div className="p-6 bg-blue-50 rounded-3xl flex items-start gap-4">
                                <Info className="text-blue-600 mt-1 shrink-0" size={18} />
                                <p className="text-xs text-blue-700 font-bold leading-relaxed">
                                    Messages will be delivered via In-App notifications, SMS, or Email based on each user's individual settings.
                                </p>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB: INTERNAL MESSAGES */}
                {activeTab === "internal-messages" && (
                    <CompanyMessagingModule currentUser={currentUser} />
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
