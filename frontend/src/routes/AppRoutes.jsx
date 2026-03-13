import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home.jsx";
import Profile from "../pages/Profile.jsx";
import NotificationSettings from "../pages/NotificationSettings.jsx";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import Status from "../pages/Status.jsx";
import ReportsHistory from "../pages/ReportsHistory.jsx";
import ReportIssue from "../pages/ReportIssue.jsx";
import Report from "../pages/Report.jsx";
import Register from "../pages/Register.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";

const AppRoutes = () => (
	<Routes>
		<Route path="/" element={<Home />} />
		<Route path="/profile" element={<Profile />} />
		<Route path="/notification-settings" element={<NotificationSettings />} />
		<Route path="/admin-dashboard" element={<AdminDashboard />} />
		<Route path="/status" element={<Status />} />
		<Route path="/reports-history" element={<ReportsHistory />} />
		<Route path="/report-issue" element={<ReportIssue />} />
		<Route path="/report" element={<Report />} />
		<Route path="/register" element={<Register />} />
		<Route path="/login" element={<Login />} />
		<Route path="/dashboard" element={<Dashboard />} />
		<Route path="*" element={<Home />} />
	</Routes>
);

export default AppRoutes;
