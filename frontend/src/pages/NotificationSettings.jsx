import { useState } from "react";
import { Bell, Smartphone, Mail, X } from "lucide-react";
import { getCurrentUser, updateProfile } from "../services/authService";
import { useNavigate } from "react-router-dom";

const notificationOptions = [
  { value: "email", label: "Email (Gmail)", icon: <Mail className="text-blue-600" /> },
  { value: "phone", label: "In-App / Phone notification", icon: <Bell className="text-blue-600" /> },
  { value: "off", label: "Off (disable notifications)", icon: <X className="text-red-500" /> },
];

const NotificationSettings = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [selected, setSelected] = useState(user?.notificationPreference || "phone");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSelect = (value) => {
    setSelected(value);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      await updateProfile({ notificationPreference: selected });
      setMessage("Notification preference updated!");
      setTimeout(() => {
        setMessage("");
        navigate(-1);
      }, 1500);
    } catch (error) {
      setMessage("Failed to update preference.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-blue-100 p-6">
        <h2 className="text-2xl font-black text-blue-700 mb-6 text-center">Notification Settings</h2>
        <div className="space-y-4 mb-8">
          {notificationOptions.map((option) => (
            <button
              key={option.value}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all font-bold text-lg ${selected === option.value ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-gray-100 text-gray-700"}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.icon}
              <span>{option.label}</span>
              {selected === option.value && <span className="ml-auto text-blue-600 font-black">✓</span>}
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg text-base"
        >
          {isSaving ? "Saving..." : "Save Preference"}
        </button>
        {message && <p className="mt-4 text-center text-blue-600 font-bold">{message}</p>}
      </div>
    </div>
  );
};

export default NotificationSettings;
