import { useState, useEffect } from "react";
import { AlertCircle, MapPin, Zap, Clock, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { reportIssue } from "../services/reportService";
import { getCurrentUser } from "../services/authService";
import { areaFeederMapping } from "../constants/areas";

const ReportIssue = () => {
  const navigate = useNavigate();
  const [currUser, setCurrUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
      setMessage({ text: "Your report has been received successfully. We will review it shortly. Thank you.", type: "success" });
      
      // Reset form (keeping user details)
      setFormData(prev => ({
        ...prev,
        issueType: "outage",
        description: ""
      }));

      // Redirect after 2 seconds
      setTimeout(() => navigate("/status"), 2000);
    } catch (error) {
      setMessage({ text: error.message || "Failed to report issue. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const readOnlyInputStyle = "w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium outline-none";
  const editableInputStyle = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium";

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
                <Zap size={16} className="text-gray-500" />
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

