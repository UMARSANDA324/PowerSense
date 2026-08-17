import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Shield, Users, UserPlus, Globe, Activity, TrendingUp, AlertCircle,
    Trash2, Edit, CheckCircle2, ChevronRight, Search, Loader2, RefreshCw,
    MapPin, MessageSquare, HardHat, Settings, LogOut, ArrowUpRight,
    Send, Info, X, Plus, Eye, EyeOff, Building2, Upload
} from "lucide-react";
import adminService from "../services/adminService";
import notificationService from "../services/notificationService";
import { getCurrentUser } from "../services/authService";
import CompanyMessagingModule from "../components/CompanyMessagingModule";
import { getUnreadCount } from "../services/companyMessageService";
import GrowthAnalyticsView from "../components/GrowthAnalyticsView";
import { updateCompanyLogo, fetchCompanyById } from "../services/companyService";
import api from "../services/api";

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const [activeTab, setActiveTab] = useState("overview");

    // Auth Check
    useEffect(() => {
        if (!currentUser || (currentUser.role !== "super-admin" && currentUser.role !== "company-super-admin")) {
            navigate("/");
        }
    }, [currentUser?._id, navigate]);

    // System States
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [allFeeders, setAllFeeders] = useState([]);
    const [locations, setLocations] = useState({ states: [], lgas: [], wards: [], feeders: [] });
    const [injectionSubstations, setInjectionSubstations] = useState([]);
    const [editingSubstation, setEditingSubstation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [searchQuery, setSearchQuery] = useState("");
    const [infraSearchQuery, setInfraSearchQuery] = useState("");
    const [explorerSearchQuery, setExplorerSearchQuery] = useState("");
    const [selectedWardIds, setSelectedWardIds] = useState([]);
    const [selectedFeederId, setSelectedFeederId] = useState("");

    // Independent search queries for Global Infrastructure cards
    const [stateSearchQuery, setStateSearchQuery] = useState("");
    const [msgUnreadCount, setMsgUnreadCount] = useState(0);
    const [lgaSearchQuery, setLgaSearchQuery] = useState("");
    const [wardSearchQuery, setWardSearchQuery] = useState("");
    const [substationSearchQuery, setSubstationSearchQuery] = useState("");
    const [feederSearchQuery, setFeederSearchQuery] = useState("");
    
    // Dedicated search query for Ward Assignment inside Manage Feeder
    const [editFeederWardSearch, setEditFeederWardSearch] = useState("");

    // Helper function for case-insensitive, space-ignoring filtering
    const filterList = (list, query) => {
        const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
        if (!normalized) return list;
        return list.filter(item => {
            const itemName = (item.name || "").toLowerCase().replace(/\s+/g, " ");
            return itemName.includes(normalized);
        });
    };

    // Feeder Assignment State
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [selectedFeeders, setSelectedFeeders] = useState([]);
    const [feederSearch, setFeederSearch] = useState("");
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

    // Messaging State
    const [notifData, setNotifData] = useState({ title: "", message: "" });

    // Location Management State
    const [showLocModal, setShowLocModal] = useState(false);
    const [showAssetExplorer, setShowAssetExplorer] = useState(false);
    const [explorerType, setExplorerType] = useState("state");
    const [locModalType, setLocModalType] = useState("state"); // state, lga, ward, feeder
    const [locFormData, setLocFormData] = useState({ name: "", stateId: "", lgaId: "", wardId: "", wardIds: [], code: "", description: "", status: "active", latitude: "", longitude: "" });

    // Admin Creation State
    const [newAdmin, setNewAdmin] = useState({
        fullName: "",
        email: "",
        password: "",
        state: "",
        lga: "",
        ward: "",
        assignedFeederId: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [adminFeederSearch, setAdminFeederSearch] = useState("");

    // Promote User to Admin State
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [selectedUserForPromotion, setSelectedUserForPromotion] = useState(null);
    const [promotionData, setPromotionData] = useState({
        injectionSubstationId: "",
        feederId: ""
    });
    const [userSearchQuery, setUserSearchQuery] = useState("");

    // Feeder Editing State
    const [editingFeeder, setEditingFeeder] = useState(null);
    const [showEditFeederModal, setShowEditFeederModal] = useState(false);

    useEffect(() => {
        fetchSuperData();
        // Fetch unread message count
        getUnreadCount().then(res => setMsgUnreadCount(res?.count || 0)).catch(() => {});
    }, []);

    const fetchSuperData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const results = await Promise.allSettled([
                adminService.getStats(),
                adminService.getUsers(),
                adminService.getLocations(),
                adminService.getAllAdmins(),
                adminService.getAllFeeders(),
                adminService.getInjectionSubstations()
            ]);
            const [statsRes, usersRes, locationsRes, adminsRes, feedersRes, substationsRes] = results;
            if (statsRes.status === "fulfilled") setStats(statsRes.value);
            if (usersRes.status === "fulfilled") setUsers(usersRes.value);
            if (locationsRes.status === "fulfilled") setLocations(locationsRes.value);
            if (adminsRes.status === "fulfilled") setAdmins(adminsRes.value);
            if (feedersRes.status === "fulfilled") setAllFeeders(feedersRes.value);
            if (substationsRes.status === "fulfilled") setInjectionSubstations(substationsRes.value);

            const failed = results.filter(r => r.status === "rejected");
            if (failed.length > 0) {
                console.warn("SuperAdmin: Some fetches failed:", failed.map(f => f.reason?.message));
                if (failed.length === results.length) {
                    setMessage({ text: "Failed to sync system data", type: "error" });
                }
            }
        } catch (err) {
            console.error("SuperAdmin: Fetch error", err);
            setMessage({ text: "Failed to sync system data", type: "error" });
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        if (!newAdmin.assignedFeederId) {
            setMessage({ text: "Please select an assigned feeder for the admin", type: "error" });
            return;
        }
        setActionLoading(true);
        try {
            await adminService.createAdmin(newAdmin);
            setMessage({ text: "Super privileges granted: New Admin created", type: "success" });
            fetchSuperData(true);
            setNewAdmin({ fullName: "", email: "", password: "", state: "", lga: "", ward: "", assignedFeederId: "" });
            setAdminFeederSearch("");
            setShowPassword(false);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to create administrator", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (id, name) => {
        if (!window.confirm(`SECURITY ALERT: Are you sure you want to PERMANENTLY delete user: ${name}? This action cannot be undone.`)) return;
        setActionLoading(true);
        try {
            await adminService.deleteUser(id);
            setMessage({ text: `Unauthorized access blocked: ${name} removed from system`, type: "success" });
            fetchSuperData(true);
        } catch (err) {
            setMessage({ text: "Failed to remove user", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        setActionLoading(true);
        try {
            await adminService.updateUser(id, { role: newRole });
            setMessage({ text: `System override: User permissions updated to ${newRole}`, type: "success" });
            fetchSuperData(true);
        } catch (err) {
            setMessage({ text: "Failed to update user role", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handlePromoteUserToAdmin = async () => {
        if (!selectedUserForPromotion || !promotionData.injectionSubstationId || !promotionData.feederId) {
            setMessage({ text: "Please select injection substation and feeder", type: "error" });
            return;
        }
        setActionLoading(true);
        try {
            await adminService.promoteUserToAdmin(selectedUserForPromotion._id, promotionData);
            setMessage({ text: `${selectedUserForPromotion.fullName} promoted to admin successfully`, type: "success" });
            fetchSuperData(true);
            setShowPromoteModal(false);
            setSelectedUserForPromotion(null);
            setPromotionData({ injectionSubstationId: "", feederId: "" });
            setUserSearchQuery("");
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to promote user to admin", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignFeeders = async () => {
        if (!selectedAdmin) return;
        setActionLoading(true);
        try {
            await adminService.assignFeedersToAdmin(selectedAdmin._id, selectedFeeders);
            setMessage({ text: `Feeder permissions propagated for ${selectedAdmin.fullName}`, type: "success" });
            fetchSuperData(true);
            setSelectedAdmin(null);
            setSelectedFeeders([]);
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Failed to assign feeders";
            const conflicts = err.response?.data?.conflicts;
            
            if (conflicts) {
                const conflictDetails = conflicts.map(c => `${c.admin}`).join(", ");
                setMessage({ 
                    text: `${errorMsg}: Some feeders are already assigned to ${conflictDetails}`, 
                    type: "error" 
                });
            } else {
                setMessage({ text: errorMsg, type: "error" });
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateLocation = async (e) => {
        e.preventDefault();
        
        // States can only be managed by Platform Owner
        if (locModalType === 'state') {
            setMessage({ text: 'State management is restricted to Platform Owner', type: 'error' });
            return;
        }

        // Basic validation
        if (locModalType === "lga" && !locFormData.stateId) return setMessage({ text: "Please select a parent state", type: "error" });
        if (locModalType === "ward" && !locFormData.lgaId) return setMessage({ text: "Please select a parent LGA", type: "error" });
        if (locModalType === "feeder" && (!locFormData.wardIds || locFormData.wardIds.length === 0)) return setMessage({ text: "Please select at least one parent ward", type: "error" });

        setActionLoading(true);
        try {
            let res;
            if (locModalType === "state") res = await adminService.createState(locFormData.name);
            else if (locModalType === "lga") res = await adminService.createLGA({ name: locFormData.name, stateId: locFormData.stateId });
            else if (locModalType === "ward") res = await adminService.createWard({ name: locFormData.name, lgaId: locFormData.lgaId });
            else if (locModalType === "feeder") res = await adminService.createFeeder({ name: locFormData.name, wardIds: locFormData.wardIds });

            setMessage({ text: `${locModalType.toUpperCase()} "${locFormData.name}" created successfully`, type: "success" });
            setShowLocModal(false);
            setLocFormData({ name: "", stateId: "", lgaId: "", wardId: "", wardIds: [] });
            fetchSuperData(true);
        } catch (err) {
            console.error(`Creation error [${locModalType}]:`, err);
            setMessage({ text: err.response?.data?.message || `System failure: Could not deploy ${locModalType}`, type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteLocation = async (type, id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${type}: ${name}?`)) return;
        setActionLoading(true);
        try {
            if (type === "state") await adminService.deleteState(id);
            else if (type === "lga") await adminService.deleteLGA(id);
            else if (type === "ward") await adminService.deleteWard(id);
            else if (type === "feeder") await adminService.deleteFeeder(id);

            setMessage({ text: `${type.toUpperCase()} removed successfully`, type: "success" });
            fetchSuperData(true);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || `Failed to remove ${type}`, type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateSubstation = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await adminService.createInjectionSubstation({
                name: locFormData.name,
                code: locFormData.code || undefined,
                description: locFormData.description || undefined,
                status: locFormData.status,
                latitude: locFormData.latitude ? parseFloat(locFormData.latitude) : undefined,
                longitude: locFormData.longitude ? parseFloat(locFormData.longitude) : undefined,
            });
            setMessage({ text: `Injection Substation "${locFormData.name}" created successfully`, type: "success" });
            setShowLocModal(false);
            setLocFormData({ name: "", stateId: "", lgaId: "", wardId: "", wardIds: [], code: "", description: "", status: "active", latitude: "", longitude: "" });
            fetchSuperData(true);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to create injection substation", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateSubstation = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await adminService.updateInjectionSubstation(editingSubstation._id, {
                name: locFormData.name,
                code: locFormData.code || undefined,
                description: locFormData.description || undefined,
                status: locFormData.status,
                latitude: locFormData.latitude ? parseFloat(locFormData.latitude) : undefined,
                longitude: locFormData.longitude ? parseFloat(locFormData.longitude) : undefined,
            });
            setMessage({ text: `Injection Substation "${locFormData.name}" updated successfully`, type: "success" });
            setShowLocModal(false);
            setEditingSubstation(null);
            setLocFormData({ name: "", stateId: "", lgaId: "", wardId: "", wardIds: [], code: "", description: "", status: "active", latitude: "", longitude: "" });
            fetchSuperData(true);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to update injection substation", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSubstation = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete Injection Substation: ${name}?`)) return;
        setActionLoading(true);
        try {
            await adminService.deleteInjectionSubstation(id);
            setMessage({ text: "Injection Substation removed successfully", type: "success" });
            fetchSuperData(true);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to remove injection substation", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateFeeder = async (e) => {
        e.preventDefault();
        if (!editingFeeder) return;
        
        // Only require ward selection if there are NO existing wards AND NO new wards being added
        if ((!editingFeeder.wards || editingFeeder.wards.length === 0) && (!locFormData.wardIds || locFormData.wardIds.length === 0)) {
            return setMessage({ text: "At least one ward must be associated with the feeder", type: "error" });
        }

        setActionLoading(true);
        try {
            await adminService.updateFeeder(editingFeeder._id, {
                name: locFormData.name,
                wardIds: locFormData.wardIds
            });
            setMessage({ text: `Feeder "${locFormData.name}" updated successfully`, type: "success" });
            setShowEditFeederModal(false);
            setEditingFeeder(null);
            setLocFormData({ name: "", stateId: "", lgaId: "", wardId: "", wardIds: [] });
            setEditFeederWardSearch("");
            fetchSuperData(true);
        } catch (err) {
            console.error("Update error [feeder]:", err);
            setMessage({ text: err.response?.data?.message || "Failed to update feeder", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveWardFromFeeder = async (feederId, wardId) => {
        setActionLoading(true);
        try {
            const res = await adminService.updateFeeder(feederId, { removeWardId: wardId });
            setMessage({ text: "Ward removed from feeder successfully", type: "success" });
            
            // Update local state
            setEditingFeeder(res.feeder);
            fetchSuperData(true);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Failed to remove ward", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const toggleFeederSelection = (feederId) => {
        setSelectedFeeders(prev => 
            prev.includes(feederId) 
                ? prev.filter(id => id !== feederId) 
                : [...prev, feederId]
        );
    };

    const [selectedFeederForNotif, setSelectedFeederForNotif] = useState("");

    const handleSendNotif = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await adminService.sendCustomNotification({
                message: notifData.message,
                feeder: selectedFeederForNotif || undefined
            });
            setMessage({
                text: `Success! Your message has been broadcasted ${selectedFeederForNotif ? "to the selected feeder area" : "to all active system users"}.`,
                type: "success"
            });
            setNotifData({ title: "", message: "" });
            setSelectedFeederForNotif("");
        } catch (err) {
            setMessage({ text: "Critical: Failed to dispatch global alert. Check system logs.", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const filterAdmins = users.filter(u => u.role === "admin" || u.role === "super-admin");

    return (
        <div className="min-h-screen bg-[#FDFDFF] flex flex-col lg:flex-row">
            {/* Super Sidebar */}
            <aside className="w-full lg:w-72 bg-gray-900 text-white lg:h-screen lg:sticky lg:top-0 p-8 flex flex-col z-20">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                        <Shield size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-black text-xl tracking-tight leading-none uppercase">SuperCore</h2>
                        <span className="text-[10px] font-black text-blue-400 tracking-[0.2em] mt-1 block">PLATFORM OVERLORD</span>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: "overview", icon: <Activity size={20} />, label: "Grid Overview" },
                        { id: "company-profile", icon: <Building2 size={20} />, label: "Company Profile" },
                        { id: "analytics", icon: <TrendingUp size={20} />, label: "Product Analytics" },
                        { id: "admins", icon: <Shield size={20} />, label: "Admin Fleet" },
                        { id: "assignments", icon: <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />, label: "Feeder Assignments" },
                        { id: "messaging", icon: <Send size={20} />, label: "Global Messaging" },
                        { id: "internal-messages", icon: <MessageSquare size={20} />, label: "Internal Messages", badge: msgUnreadCount },
                        { id: "infrastructure", icon: <Globe size={20} />, label: "Global Infra" },
                        { id: "audit", icon: <Activity size={20} />, label: "Audit Logs" }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); if (item.id === "internal-messages") { getUnreadCount().then(r => setMsgUnreadCount(r?.count || 0)).catch(() => {}); } }}
                            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {item.icon}
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                                    {item.badge > 99 ? "99+" : item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-8 border-t border-white/10">
                    <div className="flex items-center gap-4 p-4 mb-4 bg-white/5 rounded-2xl">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Global Users</p>
                            <p className="text-lg font-black">{stats?.totalUsers || "..."}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate("/")}
                        className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-sm font-bold text-gray-400 hover:text-white transition-all uppercase tracking-widest"
                    >
                        Main Site <ChevronRight size={16} />
                    </button>
                </div>
            </aside>

            {/* Content Core */}
            <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full">
                {/* Global Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter capitalize leading-none mb-2">
                            {activeTab.replace('admins', 'Administrative Fleet').replace('messaging', 'Global Core Messaging').replace('infrastructure', 'Grid Infrastructure').replace('audit', 'System Audit Trail')}
                        </h1>
                        <p className="text-gray-500 font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            AUTHENTICATED: {currentUser?.fullName} (LEVEL 1 ACCESS)
                        </p>
                    </div>

                    <button
                        onClick={() => fetchSuperData()}
                        disabled={isLoading}
                        className="bg-black text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-gray-900 active:scale-95 transition-all shadow-lg shadow-gray-200"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin text-blue-600" : ""} />
                        Synchronize Core
                    </button>
                </div>

                {message.text && (
                    <div className={`mb-10 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-6 duration-500 border-2 ${message.type === 'success' ? 'bg-green-50/50 border-green-100 text-green-800' : 'bg-red-50/50 border-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        <p className="font-black text-sm">{message.text}</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="h-[50vh] flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <Loader2 size={64} className="animate-spin text-blue-600 opacity-20" />
                            <Shield size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" />
                        </div>
                        <p className="font-black uppercase tracking-[0.3em] text-xs text-gray-400">Communicating with Core Database...</p>
                    </div>
                ) : (
                    <>
                        {/* TAB: OVERVIEW */}
                        {activeTab === "overview" && (
                            <div className="space-y-10">
                                {/* Dashboard Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { label: "Active Admins", value: filterAdmins.length, icon: <Shield />, color: "bg-blue-600" },
                                        { label: "Platform Growth", value: "+12%", icon: <TrendingUp />, color: "bg-indigo-600" },
                                        { label: "Live Locations", value: locations.feeders.length, icon: <Globe />, color: "bg-purple-600" },
                                        { label: "Incidents", value: stats?.pendingReports || 0, icon: <AlertCircle />, color: "bg-orange-600" }
                                    ].map((card, i) => (
                                        <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group">
                                            <div className={`w-14 h-14 ${card.color} text-white rounded-[1.2rem] flex items-center justify-center mb-6 shadow-lg shadow-gray-100 group-hover:scale-110 transition-transform`}>
                                                {card.icon}
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                                            <h3 className="text-3xl font-black text-gray-900">{card.value}</h3>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                                        <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-4">
                                            <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                                            Fleet Status
                                        </h3>
                                        <div className="space-y-6">
                                            {filterAdmins.slice(0, 5).map(adm => (
                                                <div key={adm._id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400">
                                                            {adm.fullName[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 leading-none mb-1">{adm.fullName}</p>
                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{adm.email}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${adm.role === 'super-admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        {adm.role}
                                                    </span>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setActiveTab('admins')}
                                                className="w-full py-4 mt-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                                            >
                                                Expand Fleet Management <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-gray-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <img src="/logo.png" alt="Logo" className="w-48 h-48 object-contain" />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-black text-white mb-2">Grid Operational Health</h3>
                                            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-10">CORE SYSTEM METRICS</p>

                                            <div className="space-y-10">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                                                        <span>System uptime</span>
                                                        <span className="text-green-500">99.9%</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 w-[99.9%] rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                                                        <span>Complaint resolution</span>
                                                        <span className="text-blue-500">84%</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 w-[84%] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                                    </div>
                                                </div>
                                                <button className="w-full py-5 bg-black text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-black hover:bg-gray-900 transition-all flex items-center justify-center gap-3">
                                                    Generate Platform Audit <ArrowUpRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: COMPANY PROFILE */}
                        {activeTab === "company-profile" && (
                            <CompanyLogoManager currentUser={currentUser} />
                        )}

                        {/* TAB: PRODUCT ANALYTICS */}
                        {activeTab === "analytics" && (
                            <div className="space-y-8">
                                <GrowthAnalyticsView isPlatformOwner={false} userCompanyId={currentUser?.companyId} />
                            </div>
                        )}

                        {/* TAB: ADMINS */}
                        {activeTab === "admins" && (
                            <div className="space-y-12">
                                {/* Registration Desk */}
                                <div className="bg-white rounded-[3rem] p-8 lg:p-12 border border-gray-100 shadow-sm max-w-4xl">
                                    <div className="flex items-center gap-5 mb-10">
                                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center">
                                            <UserPlus size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Recruit New Administrator</h3>
                                            <p className="text-gray-500 font-medium">Grant system management privileges to a new user</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Appellation</label>
                                            <input
                                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                placeholder="Full Name"
                                                value={newAdmin.fullName}
                                                onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">System Login</label>
                                            <input
                                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                placeholder="Email Address"
                                                value={newAdmin.email}
                                                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Access Key</label>
                                            <div className="relative group">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold pr-14"
                                                    placeholder="••••••••"
                                                    value={newAdmin.password}
                                                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Assigned State</label>
                                            <select
                                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                value={newAdmin.state}
                                                onChange={(e) => setNewAdmin({ ...newAdmin, state: e.target.value, lga: "", ward: "" })}
                                                required
                                            >
                                                <option value="">Select State</option>
                                                {locations.states.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Assigned LGA</label>
                                            <select
                                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                value={newAdmin.lga}
                                                onChange={(e) => setNewAdmin({ ...newAdmin, lga: e.target.value, ward: "" })}
                                                required
                                                disabled={!newAdmin.state}
                                            >
                                                <option value="">Select LGA</option>
                                                {locations.lgas.filter(l => l.state?.name === newAdmin.state).map(l => (
                                                    <option key={l._id} value={l.name}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Assigned Ward</label>
                                            <select
                                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                value={newAdmin.ward}
                                                onChange={(e) => setNewAdmin({ ...newAdmin, ward: e.target.value })}
                                                required
                                                disabled={!newAdmin.lga}
                                            >
                                                <option value="">Select Ward</option>
                                                {locations.wards.filter(w => w.lga?.name === newAdmin.lga).map(w => (
                                                    <option key={w._id} value={w.name}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Assigned Feeder *</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input
                                                    className="w-full p-5 pl-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                    placeholder="Search feeders..."
                                                    value={adminFeederSearch}
                                                    onChange={(e) => setAdminFeederSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="mt-3 max-h-48 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-100">
                                                {allFeeders
                                                    .filter(f => f.name.toLowerCase().includes(adminFeederSearch.toLowerCase()))
                                                    .map((feeder) => (
                                                        <div
                                                            key={feeder._id}
                                                            onClick={() => setNewAdmin({ ...newAdmin, assignedFeederId: feeder._id })}
                                                            className={`p-4 cursor-pointer transition-all hover:bg-blue-50 ${newAdmin.assignedFeederId === feeder._id ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}
                                                        >
                                                            <div className="font-bold text-gray-900">{feeder.name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {feeder.isAssigned ? 'Assigned to another admin' : 'Available'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                {allFeeders.filter(f => f.name.toLowerCase().includes(adminFeederSearch.toLowerCase())).length === 0 && (
                                                    <div className="p-4 text-sm text-gray-500 text-center">No feeders found</div>
                                                )}
                                            </div>
                                            {!newAdmin.assignedFeederId && (
                                                <div className="mt-2 text-xs text-red-500 font-bold">Please select a feeder</div>
                                            )}
                                        </div>

                                        <div className="md:col-span-2 flex items-center gap-4 pt-4">
                                            <button
                                                type="submit"
                                                disabled={actionLoading}
                                                className="flex-1 py-5 bg-black text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-gray-400 hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-75 submit-btn"
                                            >
                                                {actionLoading ? <Loader2 className="animate-spin" /> : <><Shield size={18} /> INITIALIZE ADMINISTRATOR</>}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Registry Table */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-4">
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                                            Active Administrative Fleet
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setShowPromoteModal(true)}
                                                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                                            >
                                                <UserPlus size={16} /> Promote User to Admin
                                            </button>
                                            <div className="relative w-72 hidden sm:block">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    placeholder="Filter fleet..."
                                                    className="w-full p-3 pl-12 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Rank & Name</th>
                                                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Deployment</th>
                                                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Permission Level</th>
                                                    <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Protection</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filterAdmins.filter(a => a.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map((adm) => (
                                                    <tr key={adm._id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-8">
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 text-lg">
                                                                    {adm.fullName[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-gray-900 text-lg leading-tight mb-1">{adm.fullName}</p>
                                                                    <p className="text-xs font-bold text-gray-400">{adm.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-tighter">
                                                                <MapPin size={14} className="text-blue-500" />
                                                                {adm.state || 'GLOBAL CORE'}
                                                            </div>
                                                            {adm.assignedFeeders && adm.assignedFeeders.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-1">
                                                                    {adm.assignedFeeders.map((f, idx) => (
                                                                        <span key={`${f._id || idx}-${idx}`} className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-tighter">
                                                                            {f.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-8">
                                                            <select
                                                                value={adm.role}
                                                                onChange={(e) => handleUpdateRole(adm._id, e.target.value)}
                                                                disabled={adm._id === currentUser?._id || actionLoading}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-none outline-none cursor-pointer transition-all ${adm.role === 'super-admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-blue-100 text-blue-700'}`}
                                                            >
                                                                <option value="user">USER</option>
                                                                <option value="admin">LEVEL-1 ADMIN</option>
                                                                <option value="super-admin">LEVEL-0 CORE</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-8 text-right">
                                                            {adm.role !== "super-admin" && adm._id !== currentUser?._id && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(adm._id, adm.fullName)}
                                                                    className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm shadow-red-50"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            )}
                                                            {adm.role === 'super-admin' && (
                                                                <div className="p-4 inline-block bg-blue-50 text-blue-400 rounded-2xl opacity-40">
                                                                    <Shield size={20} />
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Promote User to Admin Modal */}
                        {showPromoteModal && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-[3rem] p-8 lg:p-12 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                                    <UserPlus size={24} />
                                                </div>
                                                Promote User to Admin
                                            </h2>
                                            <p className="text-gray-500 font-medium mt-2">Select a user and assign their injection substation and feeder</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowPromoteModal(false);
                                                setSelectedUserForPromotion(null);
                                                setPromotionData({ injectionSubstationId: "", feederId: "" });
                                                setUserSearchQuery("");
                                            }}
                                            className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-gray-200 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {/* User Search */}
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Search Users</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    placeholder="Search by name or email..."
                                                    className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                                    value={userSearchQuery}
                                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="mt-3 max-h-48 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-100">
                                                {users
                                                    .filter(u => u.role === "user")
                                                    .filter(u => 
                                                        u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                                    )
                                                    .map((user) => (
                                                        <div
                                                            key={user._id}
                                                            onClick={() => {
                                                                setSelectedUserForPromotion(user);
                                                                setUserSearchQuery(user.fullName);
                                                            }}
                                                            className={`p-4 cursor-pointer transition-all hover:bg-indigo-50 ${selectedUserForPromotion?._id === user._id ? 'bg-indigo-100 border-l-4 border-indigo-600' : ''}`}
                                                        >
                                                            <div className="font-bold text-gray-900">{user.fullName}</div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                        </div>
                                                    ))}
                                                {users.filter(u => u.role === "user").filter(u => 
                                                    u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                                ).length === 0 && (
                                                    <div className="p-4 text-sm text-gray-500 text-center">No users found</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Injection Substation Selection */}
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Injection Substation</label>
                                            <select
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                                value={promotionData.injectionSubstationId}
                                                onChange={(e) => {
                                                    setPromotionData({ ...promotionData, injectionSubstationId: e.target.value, feederId: "" });
                                                }}
                                                disabled={!selectedUserForPromotion}
                                            >
                                                <option value="">Select Injection Substation</option>
                                                {injectionSubstations.map((sub) => (
                                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Feeder Selection (filtered by injection substation) */}
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Feeder</label>
                                            <select
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                                value={promotionData.feederId}
                                                onChange={(e) => setPromotionData({ ...promotionData, feederId: e.target.value })}
                                                disabled={!promotionData.injectionSubstationId}
                                            >
                                                <option value="">Select Feeder</option>
                                                {allFeeders
                                                    .filter(f => f.injectionSubstationId?.toString() === promotionData.injectionSubstationId)
                                                    .map((feeder) => (
                                                        <option key={feeder._id} value={feeder._id}>{feeder.name}</option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* Selected User Summary */}
                                        {selectedUserForPromotion && (
                                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black">
                                                        {selectedUserForPromotion.fullName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{selectedUserForPromotion.fullName}</p>
                                                        <p className="text-xs text-gray-500">{selectedUserForPromotion.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handlePromoteUserToAdmin}
                                            disabled={actionLoading || !selectedUserForPromotion || !promotionData.injectionSubstationId || !promotionData.feederId}
                                            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-75"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin" /> : <><Shield size={18} /> Promote to Admin</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: ASSIGNMENTS */}
                        {activeTab === "assignments" && (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {/* Admin Selection List */}
                                    <div className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm h-fit">
                                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                            Select Administrator
                                        </h3>
                                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                            {admins.map(adm => (
                                                <button
                                                    key={adm._id}
                                                    onClick={() => {
                                                        setSelectedAdmin(adm);
                                                        setSelectedFeeders(adm.assignedFeeders?.map(f => typeof f === 'string' ? f : f._id) || []);
                                                    }}
                                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedAdmin?._id === adm._id ? 'border-blue-600 bg-blue-50/50' : 'border-transparent hover:bg-gray-50'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${selectedAdmin?._id === adm._id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                        {adm.fullName[0]}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{adm.fullName}</p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                                            {adm.assignedFeeders?.length || 0} Feeders Managed
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Feeder Assignment Matrix */}
                                    <div className="lg:col-span-2 space-y-8">
                                        {!selectedAdmin ? (
                                            <div className="bg-gray-50 rounded-[3rem] p-20 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-gray-300">
                                                    <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain opacity-30" />
                                                </div>
                                                <h3 className="text-xl font-black text-gray-400">Select an administrator to configure grid permissions</h3>
                                                <p className="text-gray-400 text-sm mt-2 font-medium">Assigned feeders determine which area's data the admin can manage</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-100">
                                                    <div>
                                                        <h3 className="text-2xl font-black text-gray-900 leading-tight">Configuring {selectedAdmin.fullName}</h3>
                                                        <p className="text-gray-500 font-medium text-sm mt-1">
                                                            {selectedFeeders.length} feeders selected
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => setSelectedFeeders([])}
                                                            className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                                        >
                                                            Reset
                                                        </button>
                                                        <button
                                                            onClick={handleAssignFeeders}
                                                            disabled={actionLoading}
                                                            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                                        >
                                                            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                                            Propagate Permissions
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Filter Controls */}
                                                <div className="flex flex-col md:flex-row gap-4 mb-8">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                        <input 
                                                            placeholder="Search location wards..."
                                                            className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                                            value={feederSearch}
                                                            onChange={(e) => setFeederSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                                                        className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${showUnassignedOnly ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-400 border-gray-100'}`}
                                                    >
                                                        {showUnassignedOnly ? 'Show All Locations' : 'Show Unassigned Only'}
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {allFeeders
                                                        .filter(f => 
                                                            f.name.toLowerCase().includes(feederSearch.toLowerCase()) ||
                                                            (f.wards && f.wards.some(w => w.name.toLowerCase().includes(feederSearch.toLowerCase())))
                                                        )
                                                        .filter(f => {
                                                            if (!showUnassignedOnly) return true;
                                                            const isAssignedToOthers = admins.some(a => 
                                                                a._id !== selectedAdmin._id && 
                                                                a.assignedFeeders?.some(af => (typeof af === 'string' ? af : af._id) === f._id)
                                                            );
                                                            return !isAssignedToOthers;
                                                        })
                                                        .map(feeder => {
                                                            const isSelected = selectedFeeders.includes(feeder._id);
                                                            const assignedTo = admins.find(a => 
                                                                a._id !== selectedAdmin._id && 
                                                                a.assignedFeeders?.some(af => (typeof af === 'string' ? af : af._id) === feeder._id)
                                                            );
                                                            const isAssignedElsewhere = !!assignedTo;

                                                            return (
                                                                <button
                                                                    key={feeder._id}
                                                                    disabled={isAssignedElsewhere}
                                                                    onClick={() => !isAssignedElsewhere && toggleFeederSelection(feeder._id)}
                                                                    className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group relative ${isSelected ? 'border-blue-600 bg-blue-50/30' : 'border-gray-50 hover:border-gray-200'} ${isAssignedElsewhere ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                                                                >
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-400 group-hover:bg-white'}`}>
                                                                        <img src="/logo.png" alt="Logo" className={`w-7 h-7 object-contain ${isSelected ? '' : 'opacity-40 grayscale'}`} />
                                                                    </div>
                                                                    <div className="flex-1 overflow-hidden">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <p className="font-black text-gray-900 text-sm truncate">{feeder.name}</p>
                                                                            {isAssignedElsewhere ? (
                                                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full uppercase tracking-widest whitespace-nowrap">
                                                                                    ALREADY ASSIGNED: {assignedTo.fullName.split(' ')[0]}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-full uppercase tracking-widest whitespace-nowrap">
                                                                                    Available
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <MapPin size={10} className="text-gray-400" />
                                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                                                                                {feeder.wards?.map(w => w.name).join(', ') || 'Global Distribution'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200'}`}>
                                                                        {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                                                        {isAssignedElsewhere && <Shield size={14} className="text-amber-600" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: MESSAGING */}
                        {activeTab === "messaging" && (
                            <div className="max-w-3xl bg-white rounded-[3rem] p-8 lg:p-12 border border-gray-100 shadow-sm">
                                <header className="mb-10">
                                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                            <Send size={24} />
                                        </div>
                                        Broadcast System Alert
                                    </h2>
                                    <p className="text-gray-500 font-medium mt-2">Emergency notifications will be dispatched across all system channels</p>
                                </header>

                                <form onSubmit={handleSendNotif} className="space-y-8">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Target Area (Optional)</label>
                                        <select
                                            value={selectedFeederForNotif}
                                            onChange={(e) => setSelectedFeederForNotif(e.target.value)}
                                            className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                        >
                                            <option value="">Broadcast to All Users</option>
                                            {allFeeders.map(feeder => (
                                                <option key={feeder._id} value={feeder._id}>
                                                    Feeder: {feeder.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Transmission Subject</label>
                                        <input
                                            type="text"
                                            value={notifData.title}
                                            onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                                            placeholder="E.g., Critical Grid Maintenance"
                                            className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Payload Content</label>
                                        <textarea
                                            value={notifData.message}
                                            onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                                            placeholder="Provide detailed instructions for the dispatch..."
                                            rows="5"
                                            className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold resize-none"
                                            required
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="w-full py-5 rounded-[2.5rem] font-black bg-black text-white shadow-2xl shadow-gray-400 hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-75 submit-btn"
                                    >
                                        {actionLoading ? <Loader2 className="animate-spin" size={24} /> : <><Send size={20} /> INITIATE SYSTEM BROADCAST</>}
                                    </button>

                                    <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex items-start gap-5">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Info size={20} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-blue-900 font-black uppercase tracking-widest">Protocol Information</p>
                                            <p className="text-sm text-blue-700 font-medium leading-relaxed">
                                                This alert will be propagated to all active system entities. Delivery channels include internal notification push, validated SMS pathways, and registered email addresses.
                                            </p>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* TAB: INFRASTRUCTURE */}
                        {activeTab === "infrastructure" && (
                            <div className="space-y-12 animate-in fade-in duration-700">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm col-span-2">
                                        <div className="flex items-center justify-between mb-10">
                                            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                                                <div className="w-1.5 h-8 bg-purple-600 rounded-full"></div>
                                                Grid Distribution Assets
                                            </h3>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
                                            {[
                                                { type: "state", label: "States", count: locations.states.length, icon: <Globe />, color: "text-purple-600", bg: "bg-purple-50" },
                                                { type: "lga", label: "LGAs", count: locations.lgas.length, icon: <MapPin />, color: "text-blue-600", bg: "bg-blue-50" },
                                                { type: "ward", label: "Wards", count: locations.wards.length, icon: <Activity />, color: "text-indigo-600", bg: "bg-indigo-50" },
                                                { type: "injection-substation", label: "Injection Substations", count: injectionSubstations.length, icon: <HardHat />, color: "text-emerald-600", bg: "bg-emerald-50" },
                                                { type: "feeder", label: "Feeders", count: locations.feeders.length, icon: <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />, color: "text-amber-600", bg: "bg-amber-50" },
                                            ].map((loc, i) => (
                                                <div key={i} className="space-y-4 group">
                                                    <div 
                                                        onClick={() => {
                                                            setExplorerType(loc.type);
                                                            setSelectedWardIds([]);
                                                            setSelectedFeederId("");
                                                            setShowAssetExplorer(true);
                                                        }}
                                                        className={`w-16 h-16 ${loc.bg} ${loc.color} rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-all cursor-pointer relative`}
                                                    >
                                                        {loc.icon}
                                                        {loc.type !== 'state' && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLocModalType(loc.type);
                                                                    setShowLocModal(true);
                                                                }}
                                                                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-sm"
                                                            >
                                                                +
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="cursor-pointer" onClick={() => {
                                                        setExplorerType(loc.type);
                                                        setSelectedWardIds([]);
                                                        setSelectedFeederId("");
                                                        setShowAssetExplorer(true);
                                                    }}>
                                                        <p className="text-2xl font-black text-gray-900">{loc.count}</p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{loc.label}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-16 space-y-6">
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Core Infrastructure Explorer</h4>
                                            
                                            {/* Search Bar */}
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    placeholder="Search States, LGAs, Wards, Injection Substations or Feeders..."
                                                    className="w-full pl-12 pr-12 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                                    value={infraSearchQuery}
                                                    onChange={(e) => setInfraSearchQuery(e.target.value)}
                                                />
                                                {infraSearchQuery && (
                                                    <button
                                                        onClick={() => setInfraSearchQuery("")}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* No results message */}
                                            {infraSearchQuery && (
                                                (() => {
                                                    const normalizedQuery = infraSearchQuery.trim().toLowerCase();
                                                    const filteredStates = locations.states.filter(s => s.name.toLowerCase().includes(normalizedQuery));
                                                    const filteredLGAs = locations.lgas.filter(l => l.name.toLowerCase().includes(normalizedQuery));
                                                    const filteredWards = locations.wards.filter(w => w.name.toLowerCase().includes(normalizedQuery));
                                                    const filteredSubstations = injectionSubstations.filter(s => s.name.toLowerCase().includes(normalizedQuery));
                                                    const filteredFeeders = locations.feeders.filter(f => f.name.toLowerCase().includes(normalizedQuery));
                                                    
                                                    if (filteredStates.length === 0 && filteredLGAs.length === 0 && filteredWards.length === 0 && filteredSubstations.length === 0 && filteredFeeders.length === 0) {
                                                        return (
                                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                                                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching results</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()
                                            )}
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* States List */}
                                                {locations.states.length > 0 && (
                                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Global States</p>
                                                            <Globe size={14} className="text-purple-400" />
                                                        </div>

                                                        {/* Independent Search Bar for States */}
                                                        <div className="relative mb-4">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                            <input
                                                                placeholder="Search states..."
                                                                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                value={stateSearchQuery}
                                                                onChange={(e) => setStateSearchQuery(e.target.value)}
                                                            />
                                                            {stateSearchQuery && (
                                                                <button
                                                                    onClick={() => setStateSearchQuery("")}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                            {(() => {
                                                                const globalFiltered = infraSearchQuery ? locations.states.filter(s => s.name.toLowerCase().includes(infraSearchQuery.trim().toLowerCase())) : locations.states;
                                                                const filtered = filterList(globalFiltered, stateSearchQuery);
                                                                if (filtered.length === 0) {
                                                                    return <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4">No matching results</p>;
                                                                }
                                                                return filtered.map(s => (
                                                                    <div key={s._id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-50 group">
                                                                        <span className="text-sm font-bold text-gray-700">{s.name}</span>
                                                                        {/* State deletion restricted to Platform Owner */}
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* LGAs List */}
                                                {locations.lgas.length > 0 && (
                                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Local Governments</p>
                                                            <MapPin size={14} className="text-blue-400" />
                                                        </div>

                                                        {/* Independent Search Bar for LGAs */}
                                                        <div className="relative mb-4">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                            <input
                                                                placeholder="Search LGAs..."
                                                                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                value={lgaSearchQuery}
                                                                onChange={(e) => setLgaSearchQuery(e.target.value)}
                                                            />
                                                            {lgaSearchQuery && (
                                                                <button
                                                                    onClick={() => setLgaSearchQuery("")}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                            {(() => {
                                                                const globalFiltered = infraSearchQuery ? locations.lgas.filter(l => l.name.toLowerCase().includes(infraSearchQuery.trim().toLowerCase())) : locations.lgas;
                                                                const filtered = filterList(globalFiltered, lgaSearchQuery);
                                                                if (filtered.length === 0) {
                                                                    return <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4">No matching results</p>;
                                                                }
                                                                return filtered.map(l => (
                                                                    <div key={l._id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-50 group">
                                                                        <div className="overflow-hidden">
                                                                            <p className="text-sm font-bold text-gray-700 truncate">{l.name}</p>
                                                                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">{l.state?.name || 'Unknown'}</p>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => handleDeleteLocation("lga", l._id, l.name)}
                                                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Wards List */}
                                                {locations.wards.length > 0 && (
                                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Wards & Districts</p>
                                                            <Activity size={14} className="text-indigo-400" />
                                                        </div>

                                                        {/* Independent Search Bar for Wards */}
                                                        <div className="relative mb-4">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                            <input
                                                                placeholder="Search wards..."
                                                                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                value={wardSearchQuery}
                                                                onChange={(e) => setWardSearchQuery(e.target.value)}
                                                            />
                                                            {wardSearchQuery && (
                                                                <button
                                                                    onClick={() => setWardSearchQuery("")}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                            {(() => {
                                                                const globalFiltered = infraSearchQuery ? locations.wards.filter(w => w.name.toLowerCase().includes(infraSearchQuery.trim().toLowerCase())) : locations.wards;
                                                                const filtered = filterList(globalFiltered, wardSearchQuery);
                                                                if (filtered.length === 0) {
                                                                    return <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4">No matching results</p>;
                                                                }
                                                                return filtered.map(w => (
                                                                    <div key={w._id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-50 group">
                                                                        <div className="overflow-hidden">
                                                                            <p className="text-sm font-bold text-gray-700 truncate">{w.name}</p>
                                                                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">{w.lga?.name || 'Unknown'}</p>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => handleDeleteLocation("ward", w._id, w.name)}
                                                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Injection Substations List */}
                                                {injectionSubstations.length > 0 && (
                                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 md:col-span-2">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Injection Substations</p>
                                                            <HardHat size={14} className="text-emerald-400" />
                                                        </div>

                                                        {/* Independent Search Bar for Injection Substations */}
                                                        <div className="relative mb-4">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                            <input
                                                                placeholder="Search injection substations..."
                                                                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                value={substationSearchQuery}
                                                                onChange={(e) => setSubstationSearchQuery(e.target.value)}
                                                            />
                                                            {substationSearchQuery && (
                                                                <button
                                                                    onClick={() => setSubstationSearchQuery("")}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                            {(() => {
                                                                const globalFiltered = infraSearchQuery ? injectionSubstations.filter(s => s.name.toLowerCase().includes(infraSearchQuery.trim().toLowerCase())) : injectionSubstations;
                                                                const filtered = filterList(globalFiltered, substationSearchQuery);
                                                                if (filtered.length === 0) {
                                                                    return (
                                                                        <div className="col-span-full">
                                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4">No matching results</p>
                                                                        </div>
                                                                    );
                                                                }
                                                                return filtered.map(s => (
                                                                    <div key={s._id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-50 group">
                                                                        <div className="overflow-hidden">
                                                                            <p className="text-sm font-bold text-gray-700 truncate">{s.name}</p>
                                                                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">
                                                                                {s.code ? s.code : 'No Code'} • {s.status}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setEditingSubstation(s);
                                                                                    setLocFormData({
                                                                                        name: s.name,
                                                                                        code: s.code || "",
                                                                                        description: s.description || "",
                                                                                        status: s.status,
                                                                                        latitude: s.latitude?.toString() || "",
                                                                                        longitude: s.longitude?.toString() || "",
                                                                                    });
                                                                                    setShowLocModal(true);
                                                                                }}
                                                                                className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"
                                                                                title="Edit Substation"
                                                                            >
                                                                                <Edit size={14} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDeleteSubstation(s._id, s.name)}
                                                                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                                                                                title="Delete Substation"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Feeders List */}
                                                {locations.feeders.length > 0 && (
                                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 md:col-span-2">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Power Distribution Feeders</p>
                                                            <img src="/logo.png" alt="Logo" className="w-3.5 h-3.5 object-contain opacity-50" />
                                                        </div>

                                                        {/* Independent Search Bar for Feeders */}
                                                        <div className="relative mb-4">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                            <input
                                                                placeholder="Search feeders..."
                                                                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                value={feederSearchQuery}
                                                                onChange={(e) => setFeederSearchQuery(e.target.value)}
                                                            />
                                                            {feederSearchQuery && (
                                                                <button
                                                                    onClick={() => setFeederSearchQuery("")}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                            {(() => {
                                                                const globalFiltered = infraSearchQuery ? locations.feeders.filter(f => f.name.toLowerCase().includes(infraSearchQuery.trim().toLowerCase())) : locations.feeders;
                                                                const filtered = filterList(globalFiltered, feederSearchQuery);
                                                                if (filtered.length === 0) {
                                                                    return (
                                                                        <div className="col-span-full">
                                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4">No matching results</p>
                                                                        </div>
                                                                    );
                                                                }
                                                                return filtered.map(f => (
                                                                    <div key={f._id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-50 group">
                                                                        <div className="overflow-hidden">
                                                                            <p className="text-sm font-bold text-gray-700 truncate">{f.name}</p>
                                                                            <p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">
                                                                                {f.wards && f.wards.length > 0 
                                                                                    ? (f.wards.length > 2 
                                                                                        ? `${f.wards.slice(0, 2).map(w => w.name).join(', ')} +${f.wards.length - 2}` 
                                                                                        : f.wards.map(w => w.name).join(', ')) 
                                                                                    : 'Main Grid'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setEditingFeeder(f);
                                                                                    setLocFormData({
                                                                                        name: f.name,
                                                                                        wardIds: f.wards?.map(w => w._id) || []
                                                                                    });
                                                                                    setShowEditFeederModal(true);
                                                                                }}
                                                                                className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"
                                                                                title="Edit Feeder"
                                                                            >
                                                                                <Edit size={14} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDeleteLocation("feeder", f._id, f.name)}
                                                                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                                                                                title="Delete Feeder"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="bg-black rounded-[3rem] p-10 text-white shadow-2xl shadow-gray-400 relative overflow-hidden">
                                            <Globe className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10" />
                                            <h3 className="text-xl font-black mb-4">Territory Control</h3>
                                            <p className="text-gray-400 font-medium text-sm leading-relaxed mb-8">
                                                Expand the network by adding new states, districts, and feeders to the platform ecosystem.
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                <button 
                                                    onClick={() => { setLocModalType("lga"); setShowLocModal(true); }}
                                                    className="py-4 primary-btn text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-gray-800 w-full"
                                                >
                                                    Add LGA
                                                </button>
                                                <button 
                                                    onClick={() => { setLocModalType("ward"); setShowLocModal(true); }}
                                                    className="py-4 primary-btn text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-gray-800 w-full"
                                                >
                                                    Add Ward
                                                </button>
                                                <button 
                                                    onClick={() => { setLocModalType("injection-substation"); setShowLocModal(true); }}
                                                    className="py-4 primary-btn text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-gray-800 w-full"
                                                >
                                                    Add Injection Substation
                                                </button>
                                                <button 
                                                    onClick={() => { setLocModalType("feeder"); setShowLocModal(true); }}
                                                    className="py-4 primary-btn text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-gray-800 md:col-span-1 w-full"
                                                >
                                                    Add Feeder
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                                            <h3 className="text-lg font-black text-gray-900 mb-6 underline decoration-blue-600 decoration-4 underline-offset-8">Administrative Guidance</h3>
                                            <div className="space-y-6">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                                        <Globe size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-gray-800 leading-tight mb-1">Hierarchy Rule</p>
                                                        <p className="text-xs text-gray-400 font-medium tracking-tight">States contain LGAs, which contain Wards. Feeders cover one or more Wards.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                                        <AlertCircle size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-gray-800 leading-tight mb-1">Deletion Logic</p>
                                                        <p className="text-xs text-gray-400 font-medium tracking-tight">Parent nodes cannot be removed if children are active.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: INTERNAL MESSAGES */}
                        {activeTab === "internal-messages" && (
                            <CompanyMessagingModule currentUser={currentUser} />
                        )}

                        {/* TAB: AUDIT */}
                        {activeTab === "audit" && (
                            <div className="bg-white rounded-[3rem] p-10 lg:p-16 border border-gray-100 shadow-sm text-center">
                                <Activity size={64} className="mx-auto mb-8 text-blue-100 animate-pulse" />
                                <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter capitalize">System Audit Log</h3>
                                <p className="text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
                                    The platform's high-fidelity logging system is currently collecting data. Detailed audit trails for every administrator action will be available in the next core update.
                                </p>
                                <div className="mt-12 flex justify-center gap-4">
                                    <div className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">Logging Active</div>
                                    <div className="px-6 py-2 bg-gray-50 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100">End-to-end Encrypted</div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Asset Explorer Modal */}
            {showAssetExplorer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl relative max-h-[80vh] flex flex-col">
                        <button 
                            onClick={() => {
                                setShowAssetExplorer(false);
                                setExplorerSearchQuery(""); // Reset search when modal closes
                                setSelectedWardIds([]); // Reset selected wards
                                setSelectedFeederId(""); // Reset selected feeder
                            }}
                            className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                {explorerType === "state" && <Globe size={24} />}
                                {explorerType === "lga" && <MapPin size={24} />}
                                {explorerType === "ward" && <Activity size={24} />}
                                {explorerType === "injection-substation" && <HardHat size={24} />}
                                {explorerType === "feeder" && <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">System {explorerType.replace("-", " ")}s</h3>
                                <p className="text-sm text-gray-500 font-medium">Browse all registered grid nodes</p>
                            </div>
                        </div>

                        {/* Search Bar for Asset Explorer */}
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                placeholder={`Search ${explorerType.replace("-", " ")}s...`}
                                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                value={explorerSearchQuery}
                                onChange={(e) => setExplorerSearchQuery(e.target.value)}
                            />
                            {explorerSearchQuery && (
                                <button
                                    onClick={() => setExplorerSearchQuery("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Bulk Action Toolbar (only for wards when selected) */}
                        {explorerType === "ward" && selectedWardIds.length > 0 && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <p className="font-black text-sm text-blue-700">
                                        Selected: {selectedWardIds.length} {selectedWardIds.length === 1 ? "Ward" : "Wards"}
                                    </p>
                                    <div className="flex flex-1 items-center gap-3">
                                        <select
                                            value={selectedFeederId}
                                            onChange={(e) => setSelectedFeederId(e.target.value)}
                                            className="flex-1 py-2 px-4 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        >
                                            <option value="">Choose Feeder</option>
                                            {locations.feeders.map((feeder) => (
                                                <option key={feeder._id} value={feeder._id}>
                                                    {feeder.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                if (!selectedFeederId) {
                                                    alert("Please choose a feeder first");
                                                    return;
                                                }
                                                try {
                                                    setActionLoading(true);
                                                    await adminService.updateFeeder(selectedFeederId, {
                                                        wardIds: selectedWardIds
                                                    });
                                                    setMessage({ 
                                                        text: `Successfully assigned ${selectedWardIds.length} ward${selectedWardIds.length === 1 ? "" : "s"} to feeder`, 
                                                        type: "success" 
                                                    });
                                                    setSelectedWardIds([]);
                                                    setSelectedFeederId("");
                                                    fetchSuperData(true);
                                                } catch (err) {
                                                    console.error("Bulk assign error:", err);
                                                    setMessage({ 
                                                        text: err.response?.data?.message || "Failed to assign wards to feeder", 
                                                        type: "error" 
                                                    });
                                                } finally {
                                                    setActionLoading(false);
                                                }
                                            }}
                                            disabled={!selectedFeederId || actionLoading}
                                            className="px-6 py-2 bg-black text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                                        >
                                            {actionLoading ? "Assigning..." : "Assign"}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setSelectedWardIds([])}
                                        className="text-gray-500 hover:text-gray-700 text-sm font-bold underline"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(() => {
                                    // Filter items based on search query
                                    const normalizedQuery = explorerSearchQuery.trim().toLowerCase();
                                    let items = [];
                                    
                                    if (explorerType === "state") items = locations.states.filter(s => s.name.toLowerCase().includes(normalizedQuery));
                                    else if (explorerType === "lga") items = locations.lgas.filter(l => l.name.toLowerCase().includes(normalizedQuery));
                                    else if (explorerType === "ward") items = locations.wards.filter(w => w.name.toLowerCase().includes(normalizedQuery));
                                    else if (explorerType === "injection-substation") items = injectionSubstations.filter(s => s.name.toLowerCase().includes(normalizedQuery));
                                    else if (explorerType === "feeder") items = locations.feeders.filter(f => f.name.toLowerCase().includes(normalizedQuery));
                                    
                                    // Helper function to get ward's current feeder
                                    const getWardFeeder = (wardId) => {
                                        const feeder = locations.feeders.find(f => 
                                            f.wards?.some(w => w._id === wardId || w === wardId)
                                        );
                                        return feeder ? feeder.name : "Not Assigned";
                                    };
                                    
                                    // Render filtered items
                                    if (explorerType === "state") {
                                        return items.map(s => (
                                            <div key={s._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group">
                                                <span className="font-black text-gray-700">{s.name}</span>
                                                {/* State deletion restricted to Platform Owner */}
                                            </div>
                                        ));
                                    } else if (explorerType === "lga") {
                                        return items.map(l => (
                                            <div key={l._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col group relative">
                                                <span className="font-black text-gray-700">{l.name}</span>
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{l.state?.name || 'Global'}</span>
                                                <button onClick={() => { setShowAssetExplorer(false); setExplorerSearchQuery(""); setSelectedWardIds([]); setSelectedFeederId(""); handleDeleteLocation("lga", l._id, l.name); }} className="absolute top-5 right-5 text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        ));
                                    } else if (explorerType === "ward") {
                                        return items.map(w => {
                                            const wardCurrentFeederId = locations.feeders.find(f => f.wards?.some(fw => fw._id === w._id || fw === w._id))?._id || "";
                                            const wardCurrentFeederName = wardCurrentFeederId ? (locations.feeders.find(f => f._id === wardCurrentFeederId)?.name || "Not Assigned") : "Not Assigned";
                                            const isSelected = selectedWardIds.includes(w._id);
                                            return (
                                                <div key={w._id} className={`p-5 rounded-2xl border flex flex-col group relative transition-all ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedWardIds([...selectedWardIds, w._id]);
                                                                    else setSelectedWardIds(selectedWardIds.filter(id => id !== w._id));
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div>
                                                                <span className="block font-black text-gray-800">{w.name}</span>
                                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{w.lga?.name || 'Unknown LGA'}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); setShowAssetExplorer(false); setExplorerSearchQuery(""); setSelectedWardIds([]); setSelectedFeederId(""); handleDeleteLocation("ward", w._id, w.name); }} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-2">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    {/* Inline Feeder Assignment */}
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <select
                                                            defaultValue={wardCurrentFeederId}
                                                            key={wardCurrentFeederId}
                                                            onChange={async (e) => {
                                                                const newFeederId = e.target.value;
                                                                if (!newFeederId) {
                                                                    // Remove from current feeder
                                                                    if (!wardCurrentFeederId) return;
                                                                    try {
                                                                        setActionLoading(true);
                                                                        const currentFeeder = locations.feeders.find(f => f._id === wardCurrentFeederId);
                                                                        const remainingWardIds = currentFeeder.wards?.filter(fw => (fw._id || fw) !== w._id).map(fw => fw._id || fw) || [];
                                                                        await adminService.updateFeeder(wardCurrentFeederId, { wardIds: remainingWardIds });
                                                                        setMessage({ text: `Removed ${w.name} from ${currentFeeder.name}`, type: "success" });
                                                                        fetchSuperData(true);
                                                                    } catch (err) {
                                                                        setMessage({ text: err.response?.data?.message || "Failed to remove ward from feeder", type: "error" });
                                                                    } finally { setActionLoading(false); }
                                                                    return;
                                                                }
                                                                // Assign/move to selected feeder
                                                                try {
                                                                    setActionLoading(true);
                                                                    await adminService.updateFeeder(newFeederId, { wardIds: [w._id] });
                                                                    const targetFeeder = locations.feeders.find(f => f._id === newFeederId);
                                                                    setMessage({ text: `Assigned ${w.name} to ${targetFeeder?.name}`, type: "success" });
                                                                    fetchSuperData(true);
                                                                } catch (err) {
                                                                    setMessage({ text: err.response?.data?.message || "Failed to assign ward", type: "error" });
                                                                } finally { setActionLoading(false); }
                                                            }}
                                                            className="flex-1 text-xs font-bold py-1.5 px-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                                        >
                                                            <option value="">— Remove from Feeder —</option>
                                                            {locations.feeders.map(f => (
                                                                <option key={f._id} value={f._id}>
                                                                    {f.name}{f._id === wardCurrentFeederId ? " ✓" : ""}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {wardCurrentFeederId && (
                                                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1.5">
                                                            Currently: {wardCurrentFeederName}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        });
                                    } else if (explorerType === "injection-substation") {
                                        return items.map(s => {
                                            const linkedFeeders = locations.feeders.filter(f => f.injectionSubstationId === s._id || f.injectionSubstationId?._id === s._id);
                                            return (
                                                <div key={s._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col group relative">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <span className="font-black text-gray-700">{s.name}</span>
                                                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                                                                {s.code ? s.code : 'No Code'} • {s.status}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button 
                                                                onClick={() => {
                                                                    setShowAssetExplorer(false);
                                                                    setExplorerSearchQuery("");
                                                                    setSelectedWardIds([]);
                                                                    setSelectedFeederId("");
                                                                    setEditingSubstation(s);
                                                                    setLocFormData({
                                                                        name: s.name,
                                                                        code: s.code || "",
                                                                        description: s.description || "",
                                                                        status: s.status,
                                                                        latitude: s.latitude?.toString() || "",
                                                                        longitude: s.longitude?.toString() || "",
                                                                    });
                                                                    setShowLocModal(true);
                                                                }}
                                                                className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { setShowAssetExplorer(false); setExplorerSearchQuery(""); setSelectedWardIds([]); setSelectedFeederId(""); handleDeleteSubstation(s._id, s.name); }} 
                                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Linked Feeder badges */}
                                                    {linkedFeeders.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                                            {linkedFeeders.map(f => (
                                                                <span key={f._id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                    {f.name}
                                                                    <button
                                                                        title={`Unlink ${f.name}`}
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                setActionLoading(true);
                                                                                await adminService.updateFeeder(f._id, { injectionSubstationId: "" });
                                                                                setMessage({ text: `Unlinked ${f.name} from ${s.name}`, type: "success" });
                                                                                fetchSuperData(true);
                                                                            } catch (err) {
                                                                                setMessage({ text: err.response?.data?.message || "Failed to unlink feeder", type: "error" });
                                                                            } finally { setActionLoading(false); }
                                                                        }}
                                                                        className="text-emerald-500 hover:text-red-500 transition-colors ml-0.5"
                                                                    >
                                                                        <X size={8} />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Link / Move Feeder to this substation */}
                                                    <select
                                                        defaultValue=""
                                                        key={`is-${s._id}-${linkedFeeders.map(f=>f._id).join()}`}
                                                        onChange={async (e) => {
                                                            const fId = e.target.value;
                                                            if (!fId) return;
                                                            try {
                                                                setActionLoading(true);
                                                                await adminService.updateFeeder(fId, { injectionSubstationId: s._id });
                                                                const fName = locations.feeders.find(f => f._id === fId)?.name;
                                                                setMessage({ text: `Linked ${fName} to ${s.name}`, type: "success" });
                                                                fetchSuperData(true);
                                                            } catch (err) {
                                                                setMessage({ text: err.response?.data?.message || "Failed to link feeder", type: "error" });
                                                            } finally { setActionLoading(false); }
                                                        }}
                                                        className="w-full text-xs font-bold py-1.5 px-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                                                    >
                                                        <option value="">+ Link / Move Feeder…</option>
                                                        {locations.feeders
                                                            .filter(f => !(f.injectionSubstationId === s._id || f.injectionSubstationId?._id === s._id))
                                                            .map(f => (
                                                                <option key={f._id} value={f._id}>{f.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            );
                                        });
                                    } else if (explorerType === "feeder") {
                                        return items.map(f => {
                                            const currentSubId = f.injectionSubstationId?._id || f.injectionSubstationId || "";
                                            const currentSubName = currentSubId ? (injectionSubstations.find(s => s._id === currentSubId)?.name || "") : "";
                                            return (
                                                <div key={f._id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col group relative">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <span className="font-black text-gray-700">{f.name}</span>
                                                            <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">
                                                                {f.wards && f.wards.length > 0 
                                                                    ? (f.wards.length > 2 
                                                                        ? `${f.wards.slice(0, 2).map(w => w.name).join(', ')} +${f.wards.length - 2}` 
                                                                        : f.wards.map(w => w.name).join(', ')) 
                                                                    : 'Main Grid'}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button 
                                                                onClick={() => {
                                                                    setShowAssetExplorer(false);
                                                                    setExplorerSearchQuery("");
                                                                    setSelectedWardIds([]);
                                                                    setSelectedFeederId("");
                                                                    setEditingFeeder(f);
                                                                    setLocFormData({
                                                                        name: f.name,
                                                                        wardIds: f.wards?.map(w => w._id) || []
                                                                    });
                                                                    setShowEditFeederModal(true);
                                                                }}
                                                                className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { setShowAssetExplorer(false); setExplorerSearchQuery(""); setSelectedWardIds([]); setSelectedFeederId(""); handleDeleteLocation("feeder", f._id, f.name); }} 
                                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Injection Substation assignment */}
                                                    <select
                                                        defaultValue={currentSubId}
                                                        key={`f-${f._id}-${currentSubId}`}
                                                        onChange={async (e) => {
                                                            try {
                                                                setActionLoading(true);
                                                                await adminService.updateFeeder(f._id, { injectionSubstationId: e.target.value || "" });
                                                                const newSub = injectionSubstations.find(s => s._id === e.target.value);
                                                                setMessage({ text: e.target.value ? `Linked to ${newSub?.name}` : `Unlinked from substation`, type: "success" });
                                                                fetchSuperData(true);
                                                            } catch (err) {
                                                                setMessage({ text: err.response?.data?.message || "Failed to update substation link", type: "error" });
                                                            } finally { setActionLoading(false); }
                                                        }}
                                                        className="w-full text-xs font-bold py-1.5 px-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                                                    >
                                                        <option value="">— No Substation —</option>
                                                        {injectionSubstations.map(s => (
                                                            <option key={s._id} value={s._id}>
                                                                {s.name}{s._id === currentSubId ? " ✓" : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {currentSubName && (
                                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1.5">
                                                            Substation: {currentSubName}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        });
                                    }
                                    return null;
                                })()}
                            </div>
                            {(() => {
                                // Check if there are no filtered items
                                const normalizedQuery = explorerSearchQuery.trim().toLowerCase();
                                let items = [];
                                if (explorerType === "state") items = locations.states.filter(s => s.name.toLowerCase().includes(normalizedQuery));
                                else if (explorerType === "lga") items = locations.lgas.filter(l => l.name.toLowerCase().includes(normalizedQuery));
                                else if (explorerType === "ward") items = locations.wards.filter(w => w.name.toLowerCase().includes(normalizedQuery));
                                else if (explorerType === "injection-substation") items = injectionSubstations.filter(s => s.name.toLowerCase().includes(normalizedQuery));
                                else if (explorerType === "feeder") items = locations.feeders.filter(f => f.name.toLowerCase().includes(normalizedQuery));
                                
                                if (items.length === 0) {
                                    return (
                                        <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                                            <p className="font-black text-gray-400 uppercase tracking-widest">
                                                {explorerSearchQuery ? "No matching results" : `No ${explorerType.replace("-", " ")}s Found`}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {explorerType !== 'state' && (
                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <button 
                                    onClick={() => {
                                        setShowAssetExplorer(false);
                                        setExplorerSearchQuery(""); // Reset search
                                        setLocModalType(explorerType);
                                        setShowLocModal(true);
                                    }}
                                    className="w-full py-4 primary-btn text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3"
                                >
                                    <Plus size={18} /> Add New {explorerType}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Location Management Modal */}
            {showLocModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={() => {
                                setShowLocModal(false);
                                setLocFormData({ name: "", stateId: "", lgaId: "", wardId: "", wardIds: [], code: "", description: "", status: "active", latitude: "", longitude: "" });
                                setEditingSubstation(null);
                            }}
                            className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                {locModalType === "state" && <Globe size={24} />}
                                {locModalType === "lga" && <MapPin size={24} />}
                                {locModalType === "ward" && <Activity size={24} />}
                                {locModalType === "injection-substation" && <HardHat size={24} />}
                                {locModalType === "feeder" && <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">{editingSubstation ? "Manage" : "Deploy"} {locModalType.replace("-", " ")}</h3>
                                <p className="text-xs text-gray-500 font-medium">Add new node to system infrastructure</p>
                            </div>
                        </div>

                        <form onSubmit={locModalType === "injection-substation" ? (editingSubstation ? handleUpdateSubstation : handleCreateSubstation) : handleCreateLocation} className="space-y-6">
                            {/* Parent Selectors */}
                            {locModalType === "lga" && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Parent State</label>
                                    <select 
                                        required
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                        value={locFormData.stateId}
                                        onChange={(e) => setLocFormData({ ...locFormData, stateId: e.target.value })}
                                    >
                                        <option value="">Select State</option>
                                        {locations.states.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {locModalType === "ward" && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Parent LGA</label>
                                    <select 
                                        required
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                        value={locFormData.lgaId}
                                        onChange={(e) => setLocFormData({ ...locFormData, lgaId: e.target.value })}
                                    >
                                        <option value="">Select LGA</option>
                                        {locations.lgas.map(l => <option key={l._id} value={l._id}>{l.name} ({l.state?.name})</option>)}
                                    </select>
                                </div>
                            )}

                            {locModalType === "feeder" && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Parent Wards (Select multiple)</label>
                                    <select 
                                        required
                                        multiple
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm min-h-[120px]"
                                        value={locFormData.wardIds || []}
                                        onChange={(e) => {
                                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                            setLocFormData({ ...locFormData, wardIds: selectedOptions });
                                        }}
                                    >
                                        {locations.wards.map(w => {
                                            const isAssigned = locations.feeders.some(f => f.wards?.some(fw => fw._id === w._id));
                                            return (
                                                <option key={w._id} value={w._id} disabled={isAssigned} className={isAssigned ? "text-gray-400 bg-gray-50" : ""}>
                                                    {w.name} ({w.lga?.name}) {isAssigned ? '- Already Assigned' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-2 ml-2">Hold Ctrl (Windows) or Cmd (Mac) to select multiple wards.</p>
                                </div>
                            )}

                            {/* Injection Substation Fields */}
                            {locModalType === "injection-substation" && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Name</label>
                                        <input 
                                            required
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                            placeholder="Enter injection substation name"
                                            value={locFormData.name}
                                            onChange={(e) => setLocFormData({ ...locFormData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Code (Optional)</label>
                                        <input 
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                            placeholder="Enter code"
                                            value={locFormData.code}
                                            onChange={(e) => setLocFormData({ ...locFormData, code: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Description (Optional)</label>
                                        <textarea 
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm resize-none"
                                            placeholder="Enter description"
                                            rows={3}
                                            value={locFormData.description}
                                            onChange={(e) => setLocFormData({ ...locFormData, description: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Status</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                            value={locFormData.status}
                                            onChange={(e) => setLocFormData({ ...locFormData, status: e.target.value })}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Latitude (Optional)</label>
                                            <input 
                                                type="number"
                                                step="any"
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                                placeholder="Latitude"
                                                value={locFormData.latitude}
                                                onChange={(e) => setLocFormData({ ...locFormData, latitude: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Longitude (Optional)</label>
                                            <input 
                                                type="number"
                                                step="any"
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                                placeholder="Longitude"
                                                value={locFormData.longitude}
                                                onChange={(e) => setLocFormData({ ...locFormData, longitude: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Other Types Name Field */}
                            {locModalType !== "injection-substation" && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">{locModalType} Name</label>
                                    <input 
                                        required
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                        placeholder={`Enter ${locModalType} name`}
                                        value={locFormData.name}
                                        onChange={(e) => setLocFormData({ ...locFormData, name: e.target.value })}
                                    />
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={actionLoading}
                                className="w-full py-5 bg-black text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-gray-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                {editingSubstation ? "Update" : "Initialize"} {locModalType.replace("-", " ")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Feeder Modal */}
            {showEditFeederModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl relative max-h-[90vh] flex flex-col">
                        <button 
                            onClick={() => {
                                setShowEditFeederModal(false);
                                setEditingFeeder(null);
                                setLocFormData({ name: "", stateId: "", lgaId: "", wardId: "", wardIds: [] });
                                setEditFeederWardSearch("");
                            }}
                            className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Manage Feeder</h3>
                                <p className="text-xs text-gray-500 font-medium">Update name or ward distribution</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Feeder Name</label>
                                <input 
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                                    placeholder="Feeder Name"
                                    value={locFormData.name}
                                    onChange={(e) => setLocFormData({ ...locFormData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Currently Assigned Wards</label>
                                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 min-h-[60px]">
                                    {editingFeeder?.wards && editingFeeder.wards.length > 0 ? (
                                        editingFeeder.wards.map(w => (
                                            <div key={w._id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm group">
                                                <span className="text-xs font-bold text-gray-700">{w.name}</span>
                                                <button 
                                                    type="button"
                                                    disabled={actionLoading}
                                                    onClick={() => handleRemoveWardFromFeeder(editingFeeder._id, w._id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center w-full">No Wards Linked</p>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleUpdateFeeder} className="space-y-6 pt-4 border-t border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 ml-2">Add New Wards</label>

                                    {/* Search bar for ward list */}
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search wards..."
                                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={editFeederWardSearch}
                                            onChange={(e) => setEditFeederWardSearch(e.target.value)}
                                        />
                                        {editFeederWardSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setEditFeederWardSearch("")}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Blue badges for currently selected (to-add) wards */}
                                    {locFormData.wardIds?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {locFormData.wardIds.map(wId => {
                                                const ward = locations.wards.find(w => w._id === wId);
                                                return ward ? (
                                                    <span key={wId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 border border-blue-200 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                        {ward.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setLocFormData({ ...locFormData, wardIds: locFormData.wardIds.filter(id => id !== wId) })}
                                                            className="text-blue-500 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={8} />
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}

                                    <div className="relative group">
                                        <select 
                                            multiple
                                            className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm min-h-[140px] appearance-none"
                                            value={locFormData.wardIds || []}
                                            onChange={(e) => {
                                                // Merge visible selections with hidden (filtered-out) selections to preserve them
                                                const visibleSelected = Array.from(e.target.selectedOptions, opt => opt.value);
                                                const filteredWardQuery = editFeederWardSearch.replace(/\s+/g, " ").trim().toLowerCase();
                                                const visibleIds = new Set(
                                                    locations.wards
                                                        .filter(w => !editingFeeder?.wards?.some(ew => ew._id === w._id))
                                                        .filter(w => !filteredWardQuery || w.name.toLowerCase().includes(filteredWardQuery))
                                                        .map(w => w._id)
                                                );
                                                const hiddenSelected = (locFormData.wardIds || []).filter(id => !visibleIds.has(id));
                                                setLocFormData({ ...locFormData, wardIds: [...new Set([...hiddenSelected, ...visibleSelected])] });
                                            }}
                                        >
                                            {(() => {
                                                const query = editFeederWardSearch.replace(/\s+/g, " ").trim().toLowerCase();
                                                const filtered = locations.wards
                                                    .filter(w => !editingFeeder?.wards?.some(ew => ew._id === w._id))
                                                    .filter(w => !query || w.name.toLowerCase().includes(query));
                                                if (filtered.length === 0) {
                                                    return <option disabled value="">No matching wards</option>;
                                                }
                                                return filtered.map(w => {
                                                    const assignedFeeder = locations.feeders.find(f => f._id !== editingFeeder?._id && f.wards?.some(fw => fw._id === w._id));
                                                    const isAssigned = !!assignedFeeder;
                                                    return (
                                                        <option key={w._id} value={w._id} disabled={isAssigned} className={`p-2 rounded-lg ${isAssigned ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "cursor-pointer hover:bg-white"}`}>
                                                            {w.name} ({w.lga?.name}) {isAssigned ? `- Assigned to ${assignedFeeder.name}` : ''}
                                                        </option>
                                                    );
                                                });
                                            })()}
                                        </select>
                                        <div className="absolute right-4 top-4 pointer-events-none text-blue-400 opacity-20">
                                            <Plus size={32} />
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-gray-400 mt-3 ml-2 uppercase tracking-tight">Select one or more wards to add to the current distribution fleet.</p>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={actionLoading || (!locFormData.wardIds?.length && locFormData.name === editingFeeder?.name)}
                                    className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                    Deploy Grid Updates
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CompanyLogoManager = ({ currentUser, onLogoUpdated }) => {
    const [company, setCompany] = useState(currentUser?.company || null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (currentUser?.companyId) {
            api.get(`/companies/${currentUser.companyId}`)
                .then(res => setCompany(res.data?.data || res.data))
                .catch(() => {});
        }
    }, [currentUser]);

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("Company logo file must be under 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
            const logoDataUrl = reader.result;
            setSaving(true);
            setMessage("");
            try {
                const res = await updateCompanyLogo(company._id || currentUser.companyId, logoDataUrl);
                setCompany(res);
                if (onLogoUpdated) onLogoUpdated(res);
                setMessage("Company logo updated successfully!");
            } catch (err) {
                alert("Failed to update logo: " + (err.message || err));
            } finally {
                setSaving(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = async () => {
        if (!window.confirm("Are you sure you want to remove your company logo?")) return;
        setSaving(true);
        try {
            const res = await updateCompanyLogo(company._id || currentUser.companyId, null);
            setCompany(res);
            if (onLogoUpdated) onLogoUpdated(res);
            setMessage("Company logo removed.");
        } catch (err) {
            alert("Failed to remove logo: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-[3rem] p-8 lg:p-12 border border-gray-100 shadow-sm max-w-4xl space-y-6 font-sans">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center">
                    <Building2 size={28} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Company Identity & Branding</h3>
                    <p className="text-gray-500 font-medium text-xs">Manage official logo and public profile for {company?.name || currentUser?.company?.name || "your utility provider"}</p>
                </div>
            </div>

            {message && (
                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} /> {message}
                </div>
            )}

            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-inner flex items-center justify-center overflow-hidden p-2">
                        {company?.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                <Building2 size={28} />
                                <span className="text-[9px] font-black uppercase mt-1">No Logo</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-gray-900">{company?.name || "Company Provider"}</h4>
                        <p className="text-xs text-gray-500 font-mono">Code: {company?.code || "N/A"} · Status: {company?.status || "active"}</p>
                        <p className="text-xs text-gray-400 mt-1">Coverage States: {Array.isArray(company?.coverageStates) ? company.coverageStates.join(", ") : "Default"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <label className={`px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-2 ${saving ? "opacity-50 pointer-events-none" : ""}`}>
                        <Upload size={14} /> {company?.logo ? "Replace Logo" : "Upload Logo"}
                        <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {company?.logo && (
                        <button onClick={handleRemoveLogo} disabled={saving} className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-700 text-xs font-black uppercase tracking-wider transition-all">
                            Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
