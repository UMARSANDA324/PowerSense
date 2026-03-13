import { useState } from "react";
import { AlertCircle, MapPin, Zap, Clock, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { reportIssue } from "../services/reportService";
import { getCurrentUser } from "../services/authService";

const ReportIssue = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    issueType: "outage",
    fullName: getCurrentUser()?.fullName || "",
    area: "",
    feeder: "",
    description: "",
    contactNumber: ""
  });

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
        fullName: formData.fullName || getCurrentUser()?.fullName || "",
        phone: formData.contactNumber,
        area: formData.area,
        feeder: formData.feeder,
        issueType: ISSUE_MAP[formData.issueType] || "Other",
        description: formData.description,
      };

      await reportIssue(payload);
      setMessage({ text: "Your report has been received successfully. We will review it shortly. Thank you.", type: "success" });
      
      // Reset form
      setFormData({
        issueType: "outage",
        fullName: "",
        area: "",
        feeder: "",
        description: "",
        contactNumber: ""
      });

      // Redirect after 2 seconds
      setTimeout(() => navigate("/status"), 2000);
    } catch (error) {
      setMessage({ text: error.message || "Failed to report issue. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto p-6 pt-12">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft size={20} />
            <span className="font-semibold">Back</span>
          </button>
          <h1 className="text-3xl font-black text-gray-800 mb-2">Report a Power Issue</h1>
          <p className="text-gray-500 font-medium">Help us resolve power problems in your area quickly</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 mt-8">
        {/* Alert Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-8 flex gap-4">
          <AlertCircle className="text-blue-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-blue-900 mb-1">In case of emergency</h3>
            <p className="text-blue-700 text-sm">For urgent safety issues, contact the emergency hotline immediately.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          {/* Message Alert */}
          {message.text && (
            <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {message.text}
            </div>
          )}

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">What's the issue?</label>
            <div className="space-y-3">
              {["outage", "lowVoltage", "flickering", "other"].map((type) => (
                <label key={type} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="issueType"
                    value={type}
                    checked={formData.issueType === type}
                    onChange={handleChange}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-gray-700 capitalize font-medium">
                    {type === "outage" && "Power Outage"}
                    {type === "lowVoltage" && "Low Voltage"}
                    {type === "flickering" && "Flickering Lights"}
                    {type === "other" && "Other Issue"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              placeholder="Your full name"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Area */}
          <div>
            <label htmlFor="area" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin size={16} className="text-gray-500" />
              Affected Area
            </label>
            <input
              id="area"
              type="text"
              name="area"
              placeholder="e.g., Tudun Maliki, Kano"
              value={formData.area}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Feeder */}
          <div>
            <label htmlFor="feeder" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Zap size={16} className="text-gray-500" />
              Feeder/Line (if known)
            </label>
            <input
              id="feeder"
              type="text"
              name="feeder"
              placeholder="e.g., Tudun Maliki 11kV"
              value={formData.feeder}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the issue you're experiencing..."
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label htmlFor="contactNumber" className="block text-sm font-bold text-gray-700 mb-2">Contact Number</label>
            <input
              id="contactNumber"
              type="tel"
              name="contactNumber"
              placeholder="08012345678"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send size={20} />
                Report Issue
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default ReportIssue;
