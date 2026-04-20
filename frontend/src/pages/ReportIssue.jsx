import { useState, useEffect } from "react";
import { AlertCircle, MapPin, Clock, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { reportIssue } from "../services/reportService";
import { getCurrentUser } from "../services/authService";
import { areaFeederMapping } from "../constants/areas";

const ReportIssue = () => {
  const navigate = useNavigate();
  const [currUser, setCurrUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    issueType: "outage",
    fullName: "",
    area: "",
    feeder: "",
    description: "",
    contactNumber: ""
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrUser(user);
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || "",
        area: user.ward || "",
        feeder: areaFeederMapping[user.ward] || user.feeder || "",
        contactNumber: user.phone || ""
      }));
    } else {
      // If no user, redirect to login
      navigate("/login?redirect=/report");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      // Map frontend issue types to backend enum values
      const ISSUE_MAP = {
        outage: "Power Outage",
        lowVoltage: "Low Voltage",
        flickering: "Transformer Fault",
        other: "Other",
      };

      const payload = {
        fullName: formData.fullName,
        phone: formData.contactNumber,
        area: formData.area,
        feeder: formData.feeder,
        issueType: ISSUE_MAP[formData.issueType] || "Other",
        description: formData.description,
      };

      await reportIssue(payload);
      
      // Trigger success state
      setSuccess(true);
      
      // Reset form (keeping user details)
      setFormData(prev => ({
        ...prev,
        issueType: "outage",
        description: ""
      }));

      // Redirect after 2 seconds
      setTimeout(() => navigate("/status"), 2000);
    } catch (error) {
      setMessage({ text: error.message || "Failed to submit report. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const readOnlyInputStyle = "w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium outline-none";
  const editableInputStyle = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium";

  // Success State UI
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center shadow-lg shadow-green-100 animate-bounce">
            <CheckCircle2 size={56} />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Report Logged!</h3>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Reference: #{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
          </div>
          <div className="p-6 bg-green-50/50 rounded-3xl border border-green-100 w-full">
            <p className="text-green-800 font-bold">Report submitted successfully</p>
            <p className="text-green-600 text-sm mt-1 font-medium">Redirecting you to status page...</p>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full animate-[progress_2s_linear]" style={{ width: '100%' }}></div>
          </div>
          <style>{`
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto p-6 pt-12">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-semibold">Back</span>
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Report a Power Issue</h1>
          <p className="text-gray-500 font-medium italic">Help us resolve power problems in your area quickly</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 mt-8">
        {/* Alert Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-6 mb-8 flex gap-4 items-start shadow-sm">
          <div className="bg-blue-600 p-2 rounded-lg">
            <AlertCircle className="text-white" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 mb-1 text-lg">In case of emergency</h3>
            <p className="text-blue-700 text-sm leading-relaxed">For urgent safety issues like fallen poles, sparking wires, or fires, please contact our emergency hotline immediately.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 sm:p-10 space-y-8">
          {/* Message Alert */}
          {message.text && (
            <div className={`p-5 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${message.type === "success" ? "bg-green-500" : "bg-red-500"}`} />
                <p className="font-bold">{message.text}</p>
              </div>
            </div>
          )}

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-4 tracking-tight uppercase">What's the issue?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["outage", "lowVoltage", "flickering", "other"].map((type) => (
                <label key={type} className={`relative flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  formData.issueType === type 
                  ? "border-blue-600 bg-blue-50 shadow-sm" 
                  : "border-gray-100 hover:border-blue-200 bg-white"
                }`}>
                  <input
                    type="radio"
                    name="issueType"
                    value={type}
                    checked={formData.issueType === type}
                    onChange={handleChange}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                  <span className={`ml-3 font-bold ${formData.issueType === type ? "text-blue-900" : "text-gray-600"}`}>
                    {type === "outage" && "Power Outage"}
                    {type === "lowVoltage" && "Low Voltage"}
                    {type === "flickering" && "Transformer Fault"}
                    {type === "other" && "Other Issue"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                value={formData.fullName}
                readOnly
                className={readOnlyInputStyle}
              />
            </div>

            {/* Contact Number */}
            <div>
              <label htmlFor="contactNumber" className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <input
                id="contactNumber"
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                readOnly
                className={readOnlyInputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Area */}
            <div>
              <label htmlFor="area" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-gray-500" />
                Your Ward/Area
              </label>
              <input
                id="area"
                type="text"
                name="area"
                value={formData.area}
                readOnly
                className={readOnlyInputStyle}
              />
            </div>

            {/* Feeder */}
            <div>
              <label htmlFor="feeder" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain opacity-80" />
                Assigned Feeder
              </label>
              <input
                id="feeder"
                type="text"
                name="feeder"
                value={formData.feeder}
                readOnly
                className={readOnlyInputStyle}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2 tracking-tight uppercase">
              <Clock size={16} className="text-gray-500" />
              Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Tell us more about the situation..."
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              className={editableInputStyle}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 submit-btn group"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                <span className="animate-pulse">Submitting Report...</span>
              </>
            ) : (
              <>
                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Submit Report Now
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default ReportIssue;

