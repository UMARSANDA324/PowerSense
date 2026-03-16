import { useState } from "react";
import { FileText, User, Wrench, Clock, CheckCircle2, AlertCircle, Calendar } from "lucide-react";

// Mock Data for demonstration
const mockReports = [
    { id: 1, user: "Abba Adamu", type: "Power Outage", area: "Sheka", status: "Pending", date: "2026-03-12", description: "Power has been out since 2AM." },
    { id: 2, user: "CurrentUser", type: "Low Voltage", area: "Tudun Maliki", status: "Resolved", date: "2026-03-11", description: "Voltage is very low, cannot power appliances." },
    { id: 3, user: "Sani Musa", type: "Transformer Fault", area: "Challawa", status: "Pending", date: "2026-03-12", description: "Sparks coming from the transformer near the mosque." },
    { id: 4, user: "CurrentUser", type: "Cable Issue", area: "Sheka", status: "Pending", date: "2026-03-10", description: "Dangling cable on the main street." },
];

const mockMaintenance = [
    { id: 1, title: "Planned Outage: Guringawa", message: "Maintenance work scheduled for Guringawa 11kV feeder on Saturday.", date: "2026-03-14", urgency: "High" },
    { id: 2, title: "Transformer Repair", message: "Technical team currently repairing the Na'ibawa substation transformer.", date: "2026-03-12", urgency: "Medium" },
];

const ReportsHistory = () => {
    const [activeTab, setActiveTab] = useState("all");

    // Filter reports based on active tab
    const filteredReports = activeTab === "user"
        ? mockReports.filter(r => r.user === "CurrentUser")
        : mockReports;

    const tabs = [
        { id: "all", label: "All Reports", icon: <FileText size={18} /> },
        { id: "user", label: "User Reports", icon: <User size={18} /> },
        { id: "maintenance", label: "Maintenance", icon: <Wrench size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20 scroll-smooth">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-6 pt-12 text-center">
                    <h1 className="text-3xl font-black text-gray-800">Incident Reports</h1>
                    <p className="text-gray-500 mt-2 font-medium">Monitor and track infrastructure updates</p>
                </div>
            </div>

            {/* Tab Switcher - Sticky below the main Navbar */}
            <div className="sticky top-[72px] z-40 bg-gray-50/95 backdrop-blur-md py-4 border-b border-gray-100/50">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-100"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <main className="max-w-2xl mx-auto px-4 mt-8 pb-12 space-y-4">
                {activeTab !== "maintenance" ? (
                    filteredReports.map((report) => (
                        <div key={report.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <AlertCircle size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${report.status === "Resolved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                    }`}>
                                    {report.status}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-1">{report.type}</h3>
                            <p className="text-gray-500 text-sm mb-4 leading-relaxed">{report.description}</p>

                            <div className="flex items-center gap-4 pt-4 border-t border-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><User size={12} /> {report.user === "CurrentUser" ? "Me" : report.user}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {report.date}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    mockMaintenance.map((msg) => (
                        <div key={msg.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-blue-600">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <Wrench size={24} />
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${msg.urgency === "High" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                                    }`}>
                                    {msg.urgency} Priority
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{msg.title}</h3>
                            <p className="text-gray-500 text-sm mb-4 leading-relaxed">{msg.message}</p>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                                <Clock size={12} />
                                {msg.date}
                            </div>
                        </div>
                    ))
                )}


                {/* Empty State */}
                {((activeTab !== "maintenance" && filteredReports.length === 0) ||
                    (activeTab === "maintenance" && mockMaintenance.length === 0)) && (
                        <div className="text-center py-20">
                            <div className="inline-flex p-6 bg-gray-100 text-gray-400 rounded-full mb-4">
                                <FileText size={48} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 underline">No records found</h3>
                            <p className="text-gray-500 mt-2">Check back later for updates</p>
                        </div>
                    )}
            </main>
        </div>
    );
};

export default ReportsHistory;
