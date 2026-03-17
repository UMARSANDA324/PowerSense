import { useState, useEffect } from "react";
import { Map, ChevronDown, Loader2, AlertCircle, AlertTriangle, Smartphone, X, CheckCircle2 } from "lucide-react";
import { areaFeederMapping } from "../constants/areas";
import { reportIssue } from "../services/reportService";

const ReportForm = ({ onClose }) => {
    // State for Area/Feeder selection
    const [selectedArea, setSelectedArea] = useState("");
    const [feederName, setFeederName] = useState("");
    const [isFeederUpdating, setIsFeederUpdating] = useState(false);
    const [areaError, setAreaError] = useState("");

    // State for Report Form
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        issueType: "",
        description: ""
    });
    const [phoneError, setPhoneError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Update feeder name automatically when area changes
    useEffect(() => {
        if (selectedArea) {
            setIsFeederUpdating(true);
            setAreaError("");
            const timer = setTimeout(() => {
                const mappedFeeder = areaFeederMapping[selectedArea];
                if (mappedFeeder) {
                    setFeederName(mappedFeeder);
                } else {
                    setFeederName("");
                    setAreaError("No feeder mapping found for this area.");
                }
                setIsFeederUpdating(false);
            }, 600);

            return () => clearTimeout(timer);
        } else {
            setFeederName("");
            setAreaError("");
            setIsFeederUpdating(false);
        }
    }, [selectedArea]);

    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ""); // Accept numbers only
        if (value.length <= 11) {
            setFormData({ ...formData, phone: value });
            if (value.length === 11) {
                setPhoneError("");
            }
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // Validate Area/Feeder
        if (!selectedArea || !feederName) {
            setAreaError("Please select an area and feeder before submitting.");
            return;
        }

        // Validate Phone Number Length
        if (formData.phone.length !== 11) {
            setPhoneError("Phone number must be exactly 11 digits.");
            return;
        }

        setIsLoading(true);

        try {
            await reportIssue({
                ...formData,
                area: selectedArea,
                feeder: feederName
            });

            setSuccess(true);
            setFormData({
                fullName: "",
                phone: "",
                issueType: "",
                description: ""
            });
            setSelectedArea("");
            setFeederName("");

            // Auto close after 3 seconds if inside a modal
            if (onClose) {
                setTimeout(onClose, 3000);
            }
        } catch (err) {
            setError(err.message || "Failed to submit report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-lg mx-auto p-12 rounded-[2.5rem] bg-white border border-gray-100 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={48} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-800">Report Logged!</h3>
                    <p className="text-gray-500 font-medium mt-2">Our technical team has been notified and is looking into it.</p>
                </div>
                {!onClose && (
                    <button
                        onClick={() => setSuccess(false)}
                        className="px-8 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all submit-btn"
                    >
                        Submit Another Report
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Error Banner */}
            {error && (
                <div className="max-w-lg mx-auto p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
                    <AlertCircle size={20} />
                    <p className="font-bold text-sm">{error}</p>
                </div>
            )}

            {/* Area and Feeder Selection Section */}
            <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] bg-white border border-gray-100 shadow-xl shadow-blue-50 space-y-6 flex flex-col items-center">
                <div className="flex flex-col items-center gap-3 mb-2 text-center">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Map className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Select Location</h3>
                </div>

                <div className="w-full space-y-4">
                    <div className="text-center">
                        <label className="block text-[10px] sm:text-sm font-semibold text-gray-500 mb-1.5 sm:mb-2 text-center">
                            Select Ward (Unguwa)
                        </label>
                        <div className="relative">
                            <select
                                className="w-full p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer font-medium text-gray-700 text-sm sm:text-base text-center pr-10"
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                            >
                                <option value="">Select an area</option>
                                {Object.keys(areaFeederMapping).sort().map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={20} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] sm:text-sm font-semibold text-gray-500 mb-1.5 sm:mb-2 text-center">
                            Feeder Name (Auto-filled)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                readOnly
                                placeholder={isFeederUpdating ? "Syncing..." : "Auto populates"}
                                className={`w-full p-3 sm:p-4 border rounded-xl sm:rounded-2xl font-bold outline-none transition-all text-sm sm:text-base text-center ${isFeederUpdating
                                    ? "bg-gray-50 border-gray-100 text-gray-400 animate-pulse"
                                    : "bg-blue-50/50 border-blue-100 text-blue-700"
                                    }`}
                                value={feederName}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {isFeederUpdating && <Loader2 size={18} className="animate-spin text-blue-500" />}
                            </div>
                        </div>
                    </div>

                    {areaError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium border border-red-100">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{areaError}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Incident Report Form */}
            <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] bg-white border border-gray-100 shadow-2xl shadow-blue-50 relative">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 sm:right-6 top-4 sm:top-6 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                <div className="mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-blue-600 rounded-full"></span>
                        Submit Incident Report
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1 ml-3 sm:ml-4 font-medium">Fill in the details to notify technicians</p>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-600 mb-1 sm:mb-1.5 ml-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 sm:p-4 bg-gray-50 border border-gray-100 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm sm:text-base"
                                placeholder="Enter your name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-600 mb-1 sm:mb-1.5 ml-1 flex items-center gap-2">
                                <Smartphone size={14} /> Phone Number
                            </label>
                            <input
                                type="tel"
                                required
                                className={`w-full p-3 sm:p-4 bg-gray-50 border ${phoneError ? 'border-red-300' : 'border-gray-100'} rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm sm:text-base`}
                                placeholder="08012345678"
                                value={formData.phone}
                                onChange={handlePhoneChange}
                            />
                            {phoneError && (
                                <p className="text-red-500 text-[10px] sm:text-xs font-bold mt-1 ml-1 flex items-center gap-1">
                                    <AlertCircle size={10} /> {phoneError}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-600 mb-1 sm:mb-1.5 ml-1">Type of Issue</label>
                            <div className="relative">
                                <select
                                    required
                                    className="w-full p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm sm:text-base"
                                    value={formData.issueType}
                                    onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                                >
                                    <option value="">Select issue type</option>
                                    <option value="Power Outage">Power Outage</option>
                                    <option value="Low Voltage">Low Voltage</option>
                                    <option value="Transformer Fault">Transformer Fault</option>
                                    <option value="Cable Issue">Cable Issue</option>
                                    <option value="Other">Other</option>
                                </select>
                                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-600 mb-1 sm:mb-1.5 ml-1">Description</label>
                            <textarea
                                required
                                rows="3"
                                className="w-full p-3 sm:p-4 bg-gray-50 border border-gray-100 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none text-sm sm:text-base"
                                placeholder="Describe the problem in detail..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-black text-white p-4 sm:p-5 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:bg-gray-900 active:scale-[0.98] transition-all shadow-xl shadow-gray-300 mt-2 sm:mt-4 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed submit-btn"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={24} />
                                Submitting...
                            </>
                        ) : (
                            "Submit Incident Report"
                        )}
                    </button>

                    <div className="flex items-center gap-2 justify-center p-3 mt-4 text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
                        <AlertTriangle size={14} className="shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-tight">Technical teams will be alerted immediately</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportForm;
