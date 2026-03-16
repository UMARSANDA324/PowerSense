import { useState } from "react";
import { Activity, Clock, CheckCircle2, AlertCircle, ChevronRight, MapPin, ReceiptText } from "lucide-react";

const mockActiveTickets = [
    {
        id: "PS-88219",
        issue: "Low Voltage",
        area: "Tudun Maliki",
        feeder: "Tudun Maliki 11kV",
        time: "Started 2 hours ago",
        currentStep: 2, // 0: Reported, 1: Assigned, 2: In Progress, 3: Resolved
        steps: ["Reported", "Assigned", "In Progress", "Resolved"]
    }
];

const mockHistory = [
    { id: "PS-77102", issue: "Power Outage", status: "Resolved", date: "Mar 10, 2026", area: "Sheka" },
    { id: "PS-66541", issue: "Cable Issue", status: "Resolved", date: "Feb 28, 2026", area: "Kumbotso" },
];

const Status = () => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto p-6 pt-12 text-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">My Requests</h1>
                        <p className="text-gray-500 mt-2 font-medium">Track the real-time progress of your reports</p>
                    </div>
                    <div className="flex justify-center gap-4 mt-6">
                        <div className="bg-blue-50 p-4 rounded-2xl text-center min-w-[120px]">
                            <p className="text-blue-600 text-2xl font-black">1</p>
                            <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">Active</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-2xl text-center min-w-[120px]">
                            <p className="text-green-600 text-2xl font-black">12</p>
                            <p className="text-green-400 text-xs font-bold uppercase tracking-wider">Resolved</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
                {/* Active Tickets Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={20} className="text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-800">Active Requests</h2>
                    </div>

                    {mockActiveTickets.map((ticket) => (
                        <div key={ticket.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-50/50 p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Ticket {ticket.id}</span>
                                        <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                                            <Clock size={12} />
                                            <span>{ticket.time}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-800">{ticket.issue}</h3>
                                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                        <MapPin size={14} />
                                        <span>{ticket.area} • {ticket.feeder}</span>
                                    </div>
                                </div>
                                <button className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-between sm:justify-center gap-2">
                                    View Details <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Progress Stepper */}
                            <div className="relative mt-12 mb-4">
                                {/* Connector Line */}
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
                                <div
                                    className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-1000"
                                    style={{ width: `${(ticket.currentStep / (ticket.steps.length - 1)) * 100}%` }}
                                />

                                <div className="relative z-10 flex justify-between">
                                    {ticket.steps.map((step, index) => (
                                        <div key={step} className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${index <= ticket.currentStep
                                                ? "bg-blue-600 border-blue-100 text-white"
                                                : "bg-white border-gray-50 text-gray-300"
                                                }`}>
                                                {index < ticket.currentStep ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                                            </div>
                                            <span className={`text-[10px] sm:text-xs font-black mt-3 uppercase tracking-wider ${index <= ticket.currentStep ? "text-blue-600" : "text-gray-300"
                                                }`}>
                                                {step}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* History Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4 mt-12">
                        <ReceiptText size={20} className="text-gray-400" />
                        <h2 className="text-xl font-bold text-gray-800">Past Requests</h2>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        {mockHistory.map((item, index) => (
                            <div
                                key={item.id}
                                className={`p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${index !== mockHistory.length - 1 ? "border-b border-gray-50" : ""
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-800">{item.issue}</p>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{item.id} • {item.area}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">{item.date}</p>
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">Completed</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Status;

