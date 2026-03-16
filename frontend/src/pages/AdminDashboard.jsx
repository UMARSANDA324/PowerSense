import { useState } from "react";
import { Send, AlertTriangle, Info, ZapOff, Zap, CheckCircle2, Loader2 } from "lucide-react";
import notificationService from "../services/notificationService";

const AdminDashboard = () => {
  const [formData, setFormData] = useState({
    title: "",
    message: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ text: "", type: "" });

  const predefinedTemplates = [
    { title: "Power Outage Alert", desc: "Notify users of an active outage", icon: <ZapOff size={18} className="text-red-500" /> },
    { title: "Maintenance Update", desc: "Scheduled maintenance work", icon: <AlertTriangle size={18} className="text-yellow-500" /> },
    { title: "Power Restoration", desc: "Power has been restored", icon: <Zap size={18} className="text-green-500" /> },
    { title: "General Announcement", desc: "Important information", icon: <Info size={18} className="text-blue-500" /> }
  ];

  const handleTemplateSelect = (template) => {
    setFormData({
      ...formData,
      title: template.title
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ text: "", type: "" });

    try {
      await notificationService.sendNotification(formData);
      setStatus({ text: "Notification sent to users successfully!", type: "success" });
      setFormData({ title: "", message: "" });
      
      setTimeout(() => setStatus({ text: "", type: "" }), 3000);
    } catch (error) {
      setStatus({ 
        text: error.response?.data?.message || "Failed to send notification", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 font-medium mt-2">Manage system announcements and alerts</p>
        </header>

        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
              <Send size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Send Notification</h2>
              <p className="text-sm text-gray-500">Dispatch an alert to all registered users based on their preference</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
             {predefinedTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${formData.title === template.title ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-300 bg-white'}`}
                >
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-50 shrink-0">
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{template.title}</h3>
                    <p className="text-xs text-gray-500">{template.desc}</p>
                  </div>
                </button>
             ))}
          </div>

          {status.text && (
             <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                <p className="font-bold text-sm">{status.text}</p>
             </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Notification Title</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="E.g., Emergency Outage Alert"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Message Content</label>
              <textarea 
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Enter the details of the announcement here..."
                rows="4"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none"
                required
              ></textarea>
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 rounded-2xl font-black bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed"
            >
                {isLoading ? <><Loader2 size={20} className="animate-spin" /> Sending...</> : <><Send size={20} /> Dispatch Notification</>}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
