import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home.jsx";
import Profile from "../pages/Profile.jsx";
import NotificationSettings from "../pages/NotificationSettings.jsx";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import Status from "../pages/Status.jsx";
import AllStatus from "../pages/AllStatus.jsx";
import ReportIssue from "../pages/ReportIssue.jsx";
import Report from "../pages/Report.jsx";
import Register from "../pages/Register.jsx";
import Login from "../pages/Login.jsx";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import AIDashboard from "../pages/AIDashboard.jsx";
import AboutUs from "../pages/AboutUs.jsx";
import SuperAdminDashboard from "../pages/SuperAdminDashboard.jsx";
import PlatformOwnerPortal from "../pages/PlatformOwnerPortal.jsx";
import { ProtectedRoute } from "../components/ProtectedRoute.jsx";
import MapPage from "../pages/MapPage.jsx";
import ReferralRedirect from "../pages/ReferralRedirect.jsx";

const AppRoutes = () => (
	<Routes>
		{/* Public routes */}
		<Route path="/" element={<Home />} />
		<Route path="/about-us" element={<AboutUs />} />
		<Route path="/login" element={<Login />} />
		<Route path="/register" element={<Register />} />
		<Route path="/forgot-password" element={<ForgotPassword />} />
		<Route path="/all-status" element={<AllStatus />} />
		<Route path="/status" element={<Status />} />

		{/* User protected routes */}
		<Route path="/profile" element={
			<ProtectedRoute>
				<Profile />
			</ProtectedRoute>
		} />
		<Route path="/notification-settings" element={
			<ProtectedRoute>
				<NotificationSettings />
			</ProtectedRoute>
		} />
		<Route path="/report-issue" element={
			<ProtectedRoute>
				<ReportIssue />
			</ProtectedRoute>
		} />
		<Route path="/dashboard" element={
			<ProtectedRoute allowedRoles={["user", "admin", "super-admin", "company-super-admin", "regional-admin"]}>
				<Dashboard />
			</ProtectedRoute>
		} />

		{/* Admin protected routes */}
		<Route path="/admin-dashboard" element={
			<ProtectedRoute allowedRoles={["admin", "super-admin", "company-super-admin", "regional-admin"]}>
				<AdminDashboard />
			</ProtectedRoute>
		} />
		<Route path="/ai-dashboard" element={
			<ProtectedRoute allowedRoles={["admin", "super-admin", "company-super-admin", "regional-admin"]}>
				<AIDashboard />
			</ProtectedRoute>
		} />

		{/* Super Admin protected routes */}
		<Route path="/super-admin-dashboard" element={
			<ProtectedRoute allowedRoles={["super-admin", "company-super-admin"]}>
				<SuperAdminDashboard />
			</ProtectedRoute>
		} />

		{/* Platform Owner protected routes */}
		<Route path="/platform-owner" element={
			<ProtectedRoute allowedRoles={["platform-owner"]}>
				<PlatformOwnerPortal />
			</ProtectedRoute>
		} />

		{/* <Route path="/map" element={<MapPage />} /> Temporarily hidden for MVP */}
		<Route path="/r/:referralCode" element={<ReferralRedirect />} />
		<Route path="*" element={<Home />} />
	</Routes>
);

export default AppRoutes;
