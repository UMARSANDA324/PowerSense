import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Zap, Bell, MapPin, Menu, X, Home, FileText, Activity, AlertTriangle, User, LogOut, AlertCircle, Shield, Clock, CheckCircle2, Gauge } from "lucide-react";
import { logout, getCurrentUser } from "../services/authService";
import notificationService from "../services/notificationService";
import socket from "../services/socket";

const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);
  const locationRef = useRef(null);

  useEffect(() => {
    // Only fetch notifications if user is logged in
    const user = getCurrentUser();
    if (user) {
      fetchNotifications();
      
      // Listen for real-time notifications
      const handleNewNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
      };
      
      socket.on("newNotification", handleNewNotification);
      
      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationRef]);

  const fetchNotifications = async () => {
    const user = getCurrentUser();
    if (!user) return; // Skip if no user logged in

    try {
      const data = await notificationService.getUserNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationService.markAsRead(notif._id);
        fetchNotifications();
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const user = getCurrentUser();
  const isAdmin = user && (user.role === "admin" || user.role === "super-admin");

  const navLinks = [
    { path: "/", icon: <Home size={20} />, label: "Home" },
    { path: "/status", icon: <Activity size={20} />, label: "All Feeder Status" },
    { path: "/all-status", icon: <Gauge size={20} />, label: "Grid Statistics" },
    { path: "/report", icon: <AlertTriangle size={20} />, label: "Report Issue" },
    { path: "/reports-history", icon: <FileText size={20} />, label: "Incident Reports" },
    { path: "/profile", icon: <User size={20} />, label: "Me" },
  ];

  if (isAdmin) {
    navLinks.push({ path: "/admin-dashboard", icon: <Shield size={20} />, label: "Admin Panel" });
  }

  if (user && user.role === "super-admin") {
    navLinks.push({ path: "/super-admin-dashboard", icon: <Zap size={20} />, label: "Super Admin" });
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setShowLogoutConfirm(false);
    navigate("/login");
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Side: Hamburger & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMenu}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all active:scale-90"
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600 transition-transform active:scale-95">
              <Zap size={28} className="fill-blue-600" />
              <span className="tracking-tight">PowerSense</span>
            </Link>
          </div>

          {/* Right Side: Location, Notification & User */}
          <div className="flex items-center gap-2 sm:gap-4">

            {user && (
              <>
                {/* Notification Icon */}
                <button
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all active:scale-90 relative"
                  aria-label="Notifications"
                  onClick={() => setShowNotifications(true)}
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-white text-[8px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {!user && (
              <Link 
                to="/login" 
                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Login
              </Link>
            )}

            {/* Notification Drawer (OPay Style) */}
            <div
              className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${showNotifications ? "opacity-100 visible" : "opacity-0 invisible"
                }`}
              onClick={() => setShowNotifications(false)}
            />

            <div
              className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-[101] shadow-2xl transition-transform duration-500 ease-out transform ${showNotifications ? "translate-x-0" : "translate-x-full"
                }`}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
                  <div>
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Notifications</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Stay updated with PowerSense</p>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Mark All Read Bar */}
                {unreadCount > 0 && (
                  <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600">{unreadCount} unread messages</span>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-black text-blue-700 uppercase hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                  {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
                        <Bell size={40} />
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">No Notifications Yet</h4>
                      <p className="text-sm text-gray-500 mt-2 max-w-[200px]">We'll let you know when there's an update for you.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notif) => (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-6 transition-all cursor-pointer hover:bg-white group relative ${!notif.read ? 'bg-blue-50/30' : 'bg-white'}`}
                        >
                          {!notif.read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-full" />
                          )}
                          <div className="flex gap-4">
                            <div className={`p-3 rounded-2xl h-fit ${!notif.read ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                              {notif.title.includes('Resolved') ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-sm leading-tight pr-4 ${!notif.read ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                {notif.message}
                              </p>
                              <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <Clock size={10} />
                                {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all active:scale-90"
              aria-label="Location"
              onClick={() => setShowLocationModal(true)}
            >
              <MapPin size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Location Details Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowLocationModal(false)}
          />
          <div
            ref={locationRef}
            className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 border border-gray-100"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-50 p-5 rounded-3xl text-blue-600 mb-6">
                <MapPin size={40} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-1">Location Details</h3>
              <p className="text-gray-500 font-medium mb-8 uppercase text-[10px] tracking-widest font-black">Your Registered Information</p>

              <div className="w-full space-y-4 mb-8 text-left">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">State</p>
                  <p className="text-gray-900 font-bold">{user.state || "Not set"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Local Government</p>
                  <p className="text-gray-900 font-bold">{user.lga || "Not set"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Area</p>
                  <p className="text-gray-900 font-bold">{user.ward || "Not set"}</p>
                </div>
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Feeder</p>
                  <p className="text-blue-700 font-bold">{user.feeder || "Not set"}</p>
                </div>
              </div>

              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full py-4 rounded-2xl font-bold bg-gray-900 text-white shadow-xl hover:bg-black transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        onClick={toggleMenu}
      />

      {/* Slide-out Menu Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[300px] bg-white z-[70] shadow-2xl transition-transform duration-300 ease-out transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <Zap size={24} className="text-blue-600 fill-blue-600" />
              <span className="text-xl font-black text-blue-600 tracking-tight">PowerSense</span>
            </div>
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-2 flex-1">
            {navLinks.map((link, index) => (
              <NavLink
                key={`${link.path}-${index}`}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all active:scale-95"
            >
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-50 p-5 rounded-3xl text-red-500 mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-gray-500 font-medium mb-8">Are you sure you want to end your session and logout?</p>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all border border-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="py-4 rounded-2xl font-bold bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-95"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
