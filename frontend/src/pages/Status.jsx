import { useState, useEffect } from "react";
import { Activity, Clock, CheckCircle2, AlertCircle, ChevronRight, MapPin, ReceiptText, Bell, Zap, TrendingDown, TrendingUp, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";
import notificationService from "../services/notificationService.js";
import { getReports } from "../services/reportService.js";
import api from "../services/api";
import socket from "../services/socket";

const Status = () => {
    const { user } = useAuth();
    const [activeRequests, setActiveRequests] = useState([]);
    const [monthlyHistory, setMonthlyHistory] = useState([]);
    const [reportHistory, setReportHistory] = useState([]);
    const [allReports, setAllReports] = useState([]);
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Fetch user reports
                const reportsData = await getReports();
                
                // Active = everything not Resolved
                const active = reportsData.filter(r => r.status !== "Resolved");
                setActiveRequests(active.slice(0, 1)); // Show most recent active for tracking

                // Filter reports from current month
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const currentMonthReports = reportsData.filter(r => {
                    const reportDate = new Date(r.createdAt);
                    return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
                });
                setReportHistory(currentMonthReports);

                // For the cards at the top
                setAllReports(reportsData); 

                // Fetch notifications
                const notificationsData = await notificationService.getUserNotifications();
                const currentMonthNotifications = notificationsData.filter(n => {
                    const notifDate = new Date(n.createdAt);
                    return notifDate.getMonth() === currentMonth && notifDate.getFullYear() === currentYear;
                }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setNotificationHistory(currentMonthNotifications);

                // Fetch real power history
                const historyResponse = await api.get("/power/history");
                const formattedHistory = historyResponse.data.map(log => ({
                    date: new Date(log.timestamp),
                    event: log.status ? "Restored" : "Disconnected",
                    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    feeder: log.feederName
                }));
                setMonthlyHistory(formattedHistory);
                
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setLoading(false);
            }
        };

        fetchData();

        // Listen for power status updates to refresh history
        const handlePowerUpdate = () => {
            fetchData();
        };
        socket.on("powerStatusUpdated", handlePowerUpdate);

        return () => {
            socket.off("powerStatusUpdated", handlePowerUpdate);
        };
    }, [user]);


    const activeCount = allReports.filter(r => r.status !== "Resolved").length;
    const resolvedCount = allReports.filter(r => r.status === "Resolved").length;
    const pendingCount = allReports.filter(r => r.status === "Pending").length;

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-6 pt-12">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">All Feeder Status</h1>
                        <p className="text-gray-500 mt-2 font-medium">Track your requests, reports, and notifications</p>
                    </div>

                    {/* Quick Stats */}
                    {user ? (
                        <div className="grid grid-cols-3 gap-3 mt-6">
                            <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                                <p className="text-blue-600 text-2xl font-black">{activeCount}</p>
                                <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">Active</p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-2xl text-center border border-yellow-100">
                                <p className="text-yellow-600 text-2xl font-black">{pendingCount}</p>
                                <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Pending</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-2xl text-center border border-green-100">
                                <p className="text-green-600 text-2xl font-black">{resolvedCount}</p>
                                <p className="text-green-400 text-xs font-bold uppercase tracking-wider">Resolved</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                            <Lock size={18} className="text-blue-600" />
                            <p className="text-sm text-blue-800 font-bold">Please <Link to="/login" className="underline">login</Link> to view your report statistics.</p>
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
                {!user ? (
                    <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-2xl text-center space-y-6 max-w-lg mx-auto mt-12">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <Lock size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800">Access Restricted</h2>
                            <p className="text-gray-500 font-medium mt-2">
                                You must be logged in to track your reports, view history, and receive notifications.
                            </p>
                        </div>
                        <Link 
                            to="/login" 
                            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                        >
                            Login to Continue
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Active Requests Section */}
                {activeRequests.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={20} className="text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-800">Active Requests</h2>
                        </div>

                        {activeRequests.map((ticket) => (
                            <div key={ticket._id} className="bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-blue-50/50 p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                                Ticket {ticket._id?.slice(-6) || "N/A"}
                                            </span>
                                            <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                                                <Clock size={12} />
                                                <span>{ticket.issueType}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-800">{ticket.issueType}</h3>
                                        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                            <MapPin size={14} />
                                            <span>{ticket.area} • {ticket.feeder}</span>
                                        </div>
                                    </div>
                                    <button className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-gray-200 hover:bg-gray-900 active:scale-95 submit-btn">
                                        TRACK PROGRESS <ChevronRight size={18} />
                                    </button>
                                </div>

                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${ticket.status === "Resolved" ? "bg-green-100 text-green-700" :
                                            ticket.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                                                "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        {ticket.status === "Resolved" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Monthly Electricity History Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap size={20} className="text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-800">Monthly Electricity History</h2>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-blue-50/50 p-6 sm:p-8">
                        {monthlyHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="flex justify-center mb-4">
                                    <div className="bg-green-100 p-4 rounded-full">
                                        <CheckCircle2 size={32} className="text-green-600" />
                                    </div>
                                </div>
                                <p className="text-gray-600 font-medium">
                                    No power outages recorded this month
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Great! Your area has had stable electricity supply.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {monthlyHistory.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-lg ${item.event === "Restored"
                                                    ? "bg-green-100 text-green-600"
                                                    : "bg-red-100 text-red-600"
                                                }`}>
                                                {item.event === "Restored" ?
                                                    <TrendingUp size={18} /> :
                                                    <TrendingDown size={18} />
                                                }
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">
                                                    {item.event === "Restored" ? "Power Restored" : "Power Disconnected"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {item.time} {item.feeder ? `• ${item.feeder}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${item.event === "Restored"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                            }`}>
                                            {item.event}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Report History Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <ReceiptText size={20} className="text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-800">This Month's Reports</h2>
                    </div>

                    {reportHistory.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-blue-50/50 p-12 text-center">
                            <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-600 font-medium">No reports submitted this month</p>
                            <p className="text-gray-400 text-sm mt-1">
                                Help us improve power infrastructure by reporting any issues you notice.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reportHistory.map((report) => (
                                <div key={report._id} className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-blue-50/50 p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-black text-gray-800">{report.issueType}</h3>
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${report.status === "Resolved" ? "bg-green-100 text-green-700" :
                                                        report.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                                                            "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                    {report.status}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-2">{report.description}</p>
                                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {formatDate(report.createdAt)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {report.area}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Notification History Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Bell size={20} className="text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-800">Admin Notifications</h2>
                    </div>

                    {notificationHistory.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-blue-50/50 p-12 text-center">
                            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-600 font-medium">No notifications this month</p>
                            <p className="text-gray-400 text-sm mt-1">
                                You'll receive notifications about power updates and important announcements.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notificationHistory.map((notification) => (
                                <div key={notification._id} className={`rounded-2xl border shadow-lg shadow-blue-50/50 p-6 transition ${notification.read
                                        ? "bg-white border-gray-100"
                                        : "bg-blue-50 border-blue-200"
                                    }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-lg flex-shrink-0 ${notification.read
                                                ? "bg-gray-100 text-gray-600"
                                                : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                            }`}>
                                            <Bell size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className={`font-bold text-gray-800 ${!notification.read ? "text-lg" : ""}`}>
                                                        {notification.title}
                                                    </h3>
                                                    <p className="text-gray-600 text-sm mt-1 whitespace-normal break-words">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        {formatDate(notification.createdAt)}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </>
        )}
            </main>
        </div>
    );
};

export default Status;

