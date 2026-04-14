import { ArrowLeft, Shield, Info, Zap, MessageSquare, Bell, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 pt-12 pb-6 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-3 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-black text-gray-900">About PowerSense</h1>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-6 py-8 pb-24 space-y-12">
                {/* Introduction Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Info size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">What is PowerSense?</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed font-medium">
                        PowerSense is a cutting-edge energy management and monitoring platform designed to empower communities with real-time electricity intelligence. Our system bridges the gap between power utility providers and consumers, providing transparency and actionable data to help you navigate everyday power needs.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100/50 space-y-3">
                            <Zap className="text-blue-600" size={24} />
                            <h3 className="font-bold text-gray-900">Live Status</h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">Instantly check if your grid is currently powered or experiencing an outage.</p>
                        </div>
                        <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100/50 space-y-3">
                            <MessageSquare className="text-blue-600" size={24} />
                            <h3 className="font-bold text-gray-900">Community Reports</h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">Contribute to the network by reporting faults, transformer issues, or restorations.</p>
                        </div>
                    </div>
                </section>

                {/* Purpose and Functionality */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Shield size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Our Purpose</h2>
                    </div>
                    <div className="space-y-4">
                        <p className="text-gray-600 leading-relaxed font-medium">
                            The primary purpose of PowerSense is to reduce the uncertainty associated with electricity supply. By providing a centralized hub for status tracking and reporting, we help users:
                        </p>
                        <ul className="space-y-4">
                            {[
                                { title: "Monitor Electricity Status", text: "Get accurate, real-time feedback on current power levels in your specific area, feeder, or transformer group." },
                                { title: "Report Issues", text: "Easily submit tickets for power failures, sparking wires, or damaged equipment directly through the app." },
                                { title: "Outage Alerts", text: "Receive proactive notifications when planned maintenance is scheduled or when an unexpected fault occurs." }
                            ].map((item, idx) => (
                                <li key={idx} className="flex gap-4">
                                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black mt-1">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Terms and Conditions Section */}
                <section className="space-y-6 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gray-50 text-gray-700 rounded-2xl">
                            <ScrollText size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Terms & Conditions</h2>
                    </div>
                    
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
                        <div className="space-y-3">
                            <h4 className="font-black text-xs text-blue-600 uppercase tracking-widest">1. Proper Use of the Platform</h4>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                Users must use PowerSense solely for lawful purposes related to energy monitoring and reporting. Any attempt to disrupt the service, upload malicious content, or provide fraudulent reports is strictly prohibited.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black text-xs text-blue-600 uppercase tracking-widest">2. Accuracy of Information</h4>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                While we strive for 100% accuracy, electricity status data depends on community input and infrastructure feedback. PowerSense is not responsible for decisions made based on intermittent status delays.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black text-xs text-blue-600 uppercase tracking-widest">3. User Responsibilities</h4>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                You are responsible for maintaining the confidentiality of your account credentials. All reports submitted via your account are deemed your responsibility.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black text-xs text-blue-600 uppercase tracking-widest">4. Privacy and Data Protection</h4>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                Your location and contact data are used exclusively for localized power notifications and service improvements. We do not sell your personal data to third parties.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black text-xs text-blue-600 uppercase tracking-widest">5. Limitation of Liability</h4>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                PowerSense provides information as a service. We are not a power distribution company and are not liable for any physical damage or financial loss resulting from power outages or grid malfunctions.
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest">
                        Last Updated: March 2024 • PowerSense v1.0.4
                    </p>
                </section>
            </main>
        </div>
    );
};

export default AboutUs;
