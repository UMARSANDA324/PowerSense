import { useState } from "react";
import { User, Settings, Shield, Bell, HelpCircle, LogOut, ChevronRight, MapPin, Smartphone, Mail, Edit3, X, Loader2, CheckCircle2 } from "lucide-react";
import { getCurrentUser, logout, updateProfile } from "../services/authService";
import { useNavigate } from "react-router-dom";

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(getCurrentUser());
    const [isEditing, setIsEditing] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    
    const normalizePhoneInput = (input) => {
        const digits = (input || "").toString().replace(/\D/g, "");
        if (!digits) return "";
        // Convert international +234... or 234... to local 0xxxxxxxxxx
        if (digits.startsWith("234") && digits.length >= 12) {
            return "0" + digits.slice(3);
        }
        if (digits.length === 10) {
            // e.g., 8012345678 -> 08012345678
            return "0" + digits;
        }
        if (digits.length === 11) return digits;
        return digits; // fallback (partial input)
    };

    const [formData, setFormData] = useState({
        fullName: user?.fullName || "",
        email: user?.email || "",
        phone: normalizePhoneInput(user?.phone || ""),
        password: "",
        notificationPreference: user?.notificationPreference || "phone"
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [phoneError, setPhoneError] = useState("");

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        navigate("/login");
    };

    // Helper to get initials (e.g., "Abba Adamu" -> "AA")
    const getInitials = (name) => {
        if (!name) return "U";
        return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Phone number validation
        if (name === "phone") {
            // Only allow numbers and max 11
            const onlyNumbers = value.replace(/\D/g, "");
            const trimmed = onlyNumbers.slice(0, 11);
            if (trimmed.length > 11) {
                setPhoneError("Phone number must be exactly 11 digits");
                return;
            }

            if (trimmed.length > 0 && trimmed.length < 11) {
                setPhoneError(`${trimmed.length}/11 digits`);
            } else if (trimmed.length === 11) {
                setPhoneError("");
            } else {
                setPhoneError("");
            }

            setFormData({ ...formData, [name]: trimmed });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();

        // Normalize phone before validation/submission
        const normalizePhoneForSubmit = (input) => {
            const digits = (input || "").toString().replace(/\D/g, "");
            if (!digits) return "";
            if (digits.startsWith("234") && digits.length >= 12) return "0" + digits.slice(3);
            if (digits.length === 10) return "0" + digits;
            return digits;
        };

        const normalizedPhone = normalizePhoneForSubmit(formData.phone);

        // Validate phone number if provided
        if (formData.phone && normalizedPhone.length !== 11) {
            setMessage({
                text: "Phone number must be exactly 11 digits",
                type: "error"
            });
            return;
        }

        setIsLoading(true);
        setMessage({ text: "", type: "" });
        try {
            // Remove password if it is empty so we don't accidentally update it to empty
            const dataToUpdate = { ...formData };
            if (!dataToUpdate.password) {
                delete dataToUpdate.password;
            }

            // Ensure phone saved in normalized local format (0xxxxxxxxxx)
            if (dataToUpdate.phone) dataToUpdate.phone = normalizedPhone;

            const updatedData = await updateProfile(dataToUpdate);
            setUser(getCurrentUser()); // Refresh user object from localStorage
            setMessage({ text: "Profile updated successfully!", type: "success" });

            // Auto close after 2 seconds
            setTimeout(() => {
                setIsEditing(false);
                setMessage({ text: "", type: "" });
                setFormData({ ...formData, password: "" }); // Reset password field
            }, 2000);
        } catch (error) {
            setMessage({
                text: error.response?.data?.message || "Failed to update profile",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const menuItems = [
        {
            category: "ACCOUNT",
            items: [
                { icon: <Bell size={20} className="text-blue-600" />, label: "Notifications", desc: "Outage alerts, report updates" },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-white pb-24 relative">
            {/* Profile Header Card */}
            <div className="bg-white border-b border-gray-100 px-6 pt-16 pb-10">
                <div className="max-w-2xl mx-auto flex flex-col items-center gap-5 text-center relative">
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="absolute right-0 top-0 p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                        aria-label="Edit Profile"
                    >
                        <Edit3 size={20} />
                    </button>
                    <div className="relative">
                        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-100">
                            {getInitials(user?.fullName)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 border-4 border-white rounded-full"></div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">{user?.fullName || "Guest User"}</h1>
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mt-0.5">{user ? "Verified User" : "Not Logged In"}</p>
                        <div className="flex items-center justify-center gap-3 mt-3">
                            <span className="flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter">
                                ROLE: {user?.role || "USER"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 mt-8 space-y-8">
                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center gap-4 text-center">
                        <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                            <Mail size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                            <p className="text-sm font-bold text-gray-700">{user?.email || "No email provided"}</p>
                        </div>
                    </div>
                    {user?.phone && (
                       <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center gap-4 text-center">
                            <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                                <Smartphone size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                                <p className="text-sm font-bold text-gray-700">{user?.phone}</p>
                            </div>
                        </div> 
                    )}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center gap-4 text-center">
                        <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Area</p>
                            <p className="text-sm font-bold text-gray-700">Sheka, Kumbotso LGA</p>
                        </div>
                    </div>
                </div>

                {/* Settings Menu Sections */}
                {menuItems.map((section) => (
                    <div key={section.category} className="text-center">
                        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                            {section.category}
                        </h2>
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden px-2">
                            {section.items.map((item, index) => (
                                <button
                                    key={item.label}
                                    className={`w-full p-5 flex flex-col items-center gap-3 group active:bg-gray-50 transition-colors ${index !== section.items.length - 1 ? "border-b border-gray-50" : ""}`}
                                    onClick={
                                        item.label === "Notifications"
                                            ? () => navigate("/notification-settings")
                                            : undefined
                                    }
                                >
                                    <div className="p-3 bg-gray-50 rounded-2xl group-active:scale-95 transition-transform">
                                        {item.icon}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-base font-bold text-gray-800">{item.label}</p>
                                        <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600 transition-colors rotate-90" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Logout Button */}
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 p-5 rounded-[2rem] bg-red-50 text-red-600 font-black text-sm uppercase tracking-widest hover:bg-red-100 active:scale-[0.98] transition-all"
                >
                    <LogOut size={20} />
                    Sign Out Account
                </button>

                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">PowerSense v1.0.4 (Beta)</p>
                </div>
            </main>

            {/* Edit Profile Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={() => setIsEditing(false)}
                    />
                    <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="absolute right-6 top-6 p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                            Edit Profile
                        </h2>

                        {message.text && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' ? <CheckCircle2 size={24} /> : <HelpCircle size={24} />}
                                <p className="font-bold text-sm">{message.text}</p>
                            </div>
                        )}

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Full Name</label>
                                <input 
                                    type="text" 
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Email Address</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Phone Number</label>
                                <input 
                                    type="tel" 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="e.g., 08012345678"
                                    maxLength="11"
                                    className={`w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 outline-none transition-all font-medium ${phoneError && formData.phone ? "border-red-300 focus:ring-red-500" : "border-gray-100 focus:ring-blue-500"}`}
                                />
                                {phoneError && formData.phone && (
                                    <p className="text-xs text-red-500 font-bold mt-1 ml-1">{phoneError}</p>
                                )}
                                {formData.phone && formData.phone.length === 11 && !phoneError && (
                                    <p className="text-xs text-green-500 font-bold mt-1 ml-1">✓ Valid phone number</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">New Password (optional)</label>
                                <input 
                                    type="password" 
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Leave blank to keep unchanged"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Notification Preference</label>
                                <select 
                                    name="notificationPreference"
                                    value={formData.notificationPreference}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                >
                                    <option value="phone">Phone Notification (In-App)</option>
                                    <option value="sms">SMS</option>
                                    <option value="email">Email</option>
                                    <option value="off">Off (Disable Notifications)</option>
                                </select>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading || (formData.phone && normalizePhoneInput(formData.phone).length !== 11)}
                                className="w-full py-4 mt-6 rounded-2xl font-black bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <><Loader2 size={20} className="animate-spin" /> Saving...</> : "Save Changes"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={() => setShowLogoutConfirm(false)}
                    />
                    <div className="bg-white w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={32} className="text-red-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Sign Out?</h2>
                            <p className="text-gray-600 font-medium">Are you sure you want to sign out? You'll need to log back in to access your account.</p>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={confirmLogout}
                                className="w-full py-4 rounded-2xl font-black bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] transition-all shadow-lg shadow-red-200"
                            >
                                Yes, Sign Me Out
                            </button>
                            <button 
                                onClick={() => setShowLogoutConfirm(false)}
                                className="w-full py-4 rounded-2xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-[0.98] transition-all"
                            >
                                No, Stay Logged In
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;

