import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import nikolaLogo from "../assets/images/nikola.jpeg";
import { login as serviceLogin } from "../services/authService";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { login: contextLogin } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await serviceLogin(email, password);
      contextLogin(res.user, res.token);

      // Development logging (Task 11)
      if (res.user?.role === "platform-owner" && import.meta.env.DEV) {
        console.log("Platform Owner Login");
      }

      // Centralized redirection (Task 3)
      let targetRoute = redirect;
      if (res.user?.role === "platform-owner") {
        targetRoute = "/platform-owner";
      } else if (res.navigationTarget) {
        targetRoute = res.navigationTarget;
      } else if (res.user?.role === "super-admin" || res.user?.role === "company-super-admin") {
        targetRoute = "/super-admin-dashboard";
      } else if (res.user?.role === "admin" || res.user?.role === "regional-admin") {
        targetRoute = "/admin-dashboard";
      }

      navigate(targetRoute, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            Welcome Back <img src={nikolaLogo} alt="Nikola Logo" className="w-8 h-8 object-contain rounded-xl" />
          </h2>
          <p className="text-gray-500">Login to your Nikola account</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                id="login-email"
                required
                placeholder="name@example.com"
                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-blue-600 font-semibold hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          id="login-submit-btn"
          disabled={isLoading}
          className="w-full bg-black text-white p-4 rounded-xl font-semibold mt-8 hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-gray-400 submit-btn"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Create Account
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;