import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
    Eye, EyeOff, Loader2, User, Mail, Lock, ShieldCheck, 
    CheckCircle2, AlertCircle, MapPin, Zap, Globe, Activity 
} from "lucide-react";
import { register } from "../services/authService";
import locationService from "../services/locationService";

const Register = () => {
    const navigate = useNavigate();
    const [locations, setLocations] = useState({ states: [], lgas: [], wards: [], feeders: [] });
    const [isLocLoading, setIsLocLoading] = useState(true);

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        state: "Kano",
        lga: "",
        ward: "",
        password: "",
        confirmPassword: "",
    });

    // Fetch locations
    useEffect(() => {
        const fetchLocs = async () => {
            try {
                const data = await locationService.getAll();
                setLocations(data);
                
                // Set default LGA if Kano is the default state
                const kanoState = data.states.find(s => s.name === "Kano");
                if (kanoState) {
                    const firstLGA = data.lgas.find(l => l.state?._id === kanoState._id);
                    if (firstLGA) {
                        setFormData(prev => ({ ...prev, lga: firstLGA.name }));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch locations", err);
            } finally {
                setIsLocLoading(false);
            }
        };
        fetchLocs();
    }, []);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const normalizePhoneInput = (input) => {
        let digits = (input || "").toString().replace(/\D/g, "");
        if (!digits) return "";
        
        // If it starts with 234, convert to local format (0...)
        if (digits.startsWith("234")) {
            digits = "0" + digits.slice(3);
        }
        
        // If it's 10 digits and doesn't start with 0, add 0
        if (digits.length === 10 && !digits.startsWith("0")) {
            return "0" + digits;
        }
        
        return digits;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "phone") {
            const onlyNumbers = value.replace(/\D/g, "");
            // Allow up to 11 digits to handle users typing the full number
            const trimmed = onlyNumbers.slice(0, 11);
            setFormData(prev => ({ ...prev, [name]: trimmed }));
        } else if (name === "state") {
            // Only allow Kano for now
            if (value !== "Kano") {
                setError("⚠️ System currently supports Kano State only. Please select Kano.");
                setFormData(prev => ({ ...prev, [name]: "Kano" }));
                return;
            }
            setFormData(prev => ({ ...prev, [name]: value }));
            if (error.includes("System currently supports")) setError("");
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (error && !error.includes("System currently supports")) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Client-side validation
        if (!formData.fullName.trim()) {
            setError("Full name is required.");
            return;
        }
        if (!formData.email.trim()) {
            setError("Email address is required.");
            return;
        }
        
        // Normalize phone for submission
        const phoneToSend = normalizePhoneInput(formData.phone);
        if (phoneToSend.length !== 11 || !phoneToSend.startsWith("0")) {
            setError("Please enter a valid 10 or 11-digit phone number (e.g., 08012345678 or 8012345678).");
            return;
        }

        if (formData.state !== "Kano") {
            setError("⚠️ System currently supports Kano State only.");
            return;
        }
        if (!formData.lga) {
            setError("Local Government Area is required.");
            return;
        }
        if (!formData.ward) {
            setError("Area/Ward is required.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        
        // Find feeder based on ward (Area)
        let detectedFeeder = "Unknown Feeder";
        const wardObj = locations.wards.find(w => w.name === formData.ward);
        if (wardObj) {
            const feederObj = locations.feeders.find(f => f.ward?._id === wardObj._id);
            if (feederObj) detectedFeeder = feederObj.name;
        }

        try {
            await register({
                fullName: formData.fullName,
                email: formData.email,
                phone: phoneToSend,
                state: formData.state,
                lga: formData.lga,
                ward: formData.ward,
                feeder: detectedFeeder,
                password: formData.password,
            });

            setSuccess("Account created successfully! Redirecting...");
            // Redirect to home page as the user is already logged in by the register service
            setTimeout(() => navigate("/"), 1500);
        } catch (err) {
            const msg = err.response?.data?.message || "Registration failed. Please try again.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Join PowerSense ⚡
                    </h2>
                    <p className="text-gray-500 text-sm">Create an account to start reporting issues</p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* Success Banner */}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-sm font-medium border border-green-100 flex items-center gap-2">
                        <CheckCircle2 size={16} className="shrink-0" />
                        {success}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <User size={18} />
                            </span>
                            <input
                                type="text"
                                name="fullName"
                                required
                                placeholder="John Doe"
                                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="name@example.com"
                                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🇳🇬</span>
                            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">+234</span>
                            <input
                                type="tel"
                                name="phone"
                                required
                                placeholder="8012345678"
                                maxLength="11"
                                className="w-full pl-24 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                            {formData.phone && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                                    {formData.phone.length}/11
                                </span>
                            )}
                        </div>
                    </div>

                    {/* State Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <MapPin size={18} />
                            </span>
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                disabled
                                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 cursor-not-allowed"
                            >
                                <option value="Kano">Kano (Current Support)</option>
                            </select>
                            <p className="text-xs text-gray-400 mt-1 ml-1">System currently supports Kano State</p>
                        </div>
                    </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* LGA Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Local Govt (LGA)</label>
                        <div className="relative">
                            <select
                                name="lga"
                                required
                                value={formData.lga}
                                onChange={handleChange}
                                disabled={isLocLoading}
                                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none pr-10"
                            >
                                <option value="">Select LGA</option>
                                {locations.lgas
                                    .filter(l => l.state?.name === formData.state)
                                    .map((lga) => (
                                        <option key={lga._id} value={lga.name}>
                                            {lga.name}
                                        </option>
                                    ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
                        </div>
                    </div>

                    {/* Area/Ward Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                        <div className="relative">
                            <select
                                name="ward"
                                required
                                value={formData.ward}
                                onChange={handleChange}
                                disabled={isLocLoading || !formData.lga}
                                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none pr-10"
                            >
                                <option value="">Select Area</option>
                                {locations.wards
                                    .filter(w => w.lga?.name === formData.lga)
                                    .map((area) => (
                                        <option key={area._id} value={area.name}>
                                            {area.name}
                                        </option>
                                    ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
                        </div>
                        {formData.ward && (
                            <p className="text-[10px] text-blue-600 font-bold mt-2 ml-1 flex items-center gap-1">
                                <Zap size={10} />
                                Auto-detected Feeder: {(() => {
                                    const wardObj = locations.wards.find(w => w.name === formData.ward);
                                    if (wardObj) {
                                        const feederObj = locations.feeders.find(f => f.ward?._id === wardObj._id);
                                        return feederObj ? feederObj.name : "Unknown Feeder";
                                    }
                                    return "Unknown Feeder";
                                })()}
                            </p>
                        )}
                    </div>
                </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Lock size={18} />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                placeholder="Min. 6 characters"
                                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <ShieldCheck size={18} />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="confirmPassword"
                                required
                                placeholder="Re-enter your password"
                                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-black text-white p-4 rounded-xl font-semibold mt-6 hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-gray-400 submit-btn"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Creating Account...
                        </>
                    ) : (
                        "Create Account"
                    )}
                </button>

                <p className="text-center text-gray-600 mt-6 text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                        Sign In
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default Register;
