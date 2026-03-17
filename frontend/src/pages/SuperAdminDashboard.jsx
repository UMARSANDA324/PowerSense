import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Shield, Users, UserPlus, Globe, Activity, TrendingUp, AlertCircle,
    Trash2, Edit, CheckCircle2, ChevronRight, Search, Loader2, RefreshCw,
    MapPin, Zap, MessageSquare, HardHat, Settings, LogOut, ArrowUpRight,
    Send, Info
} from "lucide-react";
import adminService from "../services/adminService";
import notificationService from "../services/notificationService";
import { getCurrentUser } from "../services/authService";

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const [activeTab, setActiveTab] = useState("overview");

    // Auth Check
    useEffect(() => {
        if (!currentUser || currentUser.role !== "super-admin") {
            navigate("/");
        }
    }, [currentUser, navigate]);

    // System States
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState({ states: [], lgas: [], wards: [], feeders: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [searchQuery, setSearchQuery] = useState("");

    // Messaging State
    const [notifData, setNotifData] = useState({ title: "", message: "" });

    // Admin Creation State
    const [newAdmin, setNewAdmin] = useState({
        fullName: "",
        email: "",
        password: "",
        state: "",
        lga: ""
    });

    useEffect(() => {
        fetchSuperData();
    }, []);

    const fetchSuperData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [statsData, usersData, locationsData] = await Promise.all([
                adminService.getStats(),
                adminService.getUsers(),
                adminService.getLocations()
            ]);
            setStats(statsData);
            setUsers(usersData);
            setLocations(locationsData);
        } catch (err) {
            console.error("SuperAdmin: Fetch error", err);
            setMessage({ text: "Failed to sync system data", type: "error" });
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await adminService.createAdmin(newAdmin);
            setMessage({ text: "Super privileges granted: New Admin created", type: "success" });
            fetchSuperData(true);
            setNewAdmin({ fullName: "", email: "", password: "", state: "", lga: "" });
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

    const handleSendNotif = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await notificationService.sendNotification(notifData);
            setMessage({
                text: `Success! "${notifData.title}" has been broadcasted to all active system users across Email, Phone, and In-App channels.`,
                type: "success"
            });
            setNotifData({ title: "", message: "" });
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
                        { id: "admins", icon: <Shield size={20} />, label: "Admin Fleet" },
                        { id: "messaging", icon: <Send size={20} />, label: "Global Messaging" },
                        { id: "infrastructure", icon: <Globe size={20} />, label: "Global Infra" },
                        { id: "audit", icon: <Activity size={20} />, label: "Audit Logs" }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {item.icon}
                            {item.label}
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
                                            <Zap size={200} className="text-white" />
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
                                            <input
                                                type="password"
                                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                placeholder="••••••••"
                                                value={newAdmin.password}
                                                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                                required
                                            />
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
                                        <h3 className="text-2xl font-black text-gray-900 mb-10 flex items-center gap-4">
                                            <div className="w-1.5 h-8 bg-purple-600 rounded-full"></div>
                                            Grid Distribution Assets
                                        </h3>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                            {[
                                                { label: "States", count: locations.states.length, icon: <Globe />, color: "text-purple-600", bg: "bg-purple-50" },
                                                { label: "LGAs", count: locations.lgas.length, icon: <MapPin />, color: "text-blue-600", bg: "bg-blue-50" },
                                                { label: "Wards", count: locations.wards.length, icon: <Activity />, color: "text-indigo-600", bg: "bg-indigo-50" },
                                                { label: "Feeders", count: locations.feeders.length, icon: <Zap />, color: "text-amber-600", bg: "bg-amber-50" },
                                            ].map((loc, i) => (
                                                <div key={i} className="space-y-4">
                                                    <div className={`w-16 h-16 ${loc.bg} ${loc.color} rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm`}>
                                                        {loc.icon}
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-black text-gray-900">{loc.count}</p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{loc.label}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-16 space-y-4">
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Core Infrastructure Rules</h4>
                                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:bg-white transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white rounded-2xl shadow-sm text-gray-400">
                                                        <Settings size={20} />
                                                    </div>
                                                    <p className="font-bold text-sm text-gray-600">Auto-balancing Grid Protocols</p>
                                                </div>
                                                <CheckCircle2 size={18} className="text-green-500" />
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:bg-white transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white rounded-2xl shadow-sm text-gray-400">
                                                        <Globe size={20} />
                                                    </div>
                                                    <p className="font-bold text-sm text-gray-600">Geo-fenced Service Areas</p>
                                                </div>
                                                <CheckCircle2 size={18} className="text-green-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="bg-blue-600 rounded-[3rem] p-10 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                                            <Globe className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10" />
                                            <h3 className="text-xl font-black mb-4">Territory Control</h3>
                                            <p className="text-blue-50 font-medium text-sm leading-relaxed mb-8">
                                                Expand the network by adding new states, districts, and feeders to the platform ecosystem.
                                            </p>
                                            <button className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 hover:bg-gray-900 transition-all">
                                                Deploy New Service Area
                                            </button>
                                        </div>

                                        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                                            <h3 className="text-lg font-black text-gray-900 mb-6 underline decoration-blue-600 decoration-4 underline-offset-8">Critical Alerts</h3>
                                            <div className="space-y-6">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                                        <HardHat size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-gray-800 leading-tight mb-1">Grid Expansion Blocked</p>
                                                        <p className="text-xs text-gray-400 font-medium tracking-tight">Kumbotso ward mapping incomplete</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 opacity-50">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                                        <RefreshCw size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-gray-800 leading-tight mb-1">System Synced</p>
                                                        <p className="text-xs text-gray-400 font-medium tracking-tight">14 new feeders propagated</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
        </div>
    );
};

export default SuperAdminDashboard;
