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
import AboutUs from "../pages/AboutUs.jsx";
import SuperAdminDashboard from "../pages/SuperAdminDashboard.jsx";

const AppRoutes = () => (
	<Routes>
		<Route path="/" element={<Home />} />
		<Route path="/profile" element={<Profile />} />
		<Route path="/notification-settings" element={<NotificationSettings />} />
		<Route path="/admin-dashboard" element={<AdminDashboard />} />
		<Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
		<Route path="/status" element={<Status />} />
		<Route path="/all-status" element={<AllStatus />} />
		<Route path="/report-issue" element={<ReportIssue />} />
		<Route path="/register" element={<Register />} />

		<Route path="/login" element={<Login />} />
		<Route path="/forgot-password" element={<ForgotPassword />} />
		<Route path="/dashboard" element={<Dashboard />} />
		<Route path="/about-us" element={<AboutUs />} />
		<Route path="*" element={<Home />} />
	</Routes>
);

export default AppRoutes;
