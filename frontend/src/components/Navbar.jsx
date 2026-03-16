import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Zap, Bell, MapPin, Menu, X, Home, FileText, Activity, AlertTriangle, User, LogOut, AlertCircle } from "lucide-react";
import { logout, getCurrentUser } from "../services/authService";
import notificationService from "../services/notificationService";

const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  useEffect(() => {
    // Only fetch notifications if user is logged in
    const user = getCurrentUser();
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // 1 minute
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks = [
    { path: "/", icon: <Home size={20} />, label: "Home" },
    { path: "/status", icon: <Activity size={20} />, label: "My Status" },
    { path: "/report", icon: <AlertTriangle size={20} />, label: "Report Issue" },
    { path: "/reports-history", icon: <FileText size={20} />, label: "Incident Reports" },
    { path: "/profile", icon: <User size={20} />, label: "Me" },
  ];

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

          {/* Right Side: Notification & Location */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="relative" ref={notificationRef}>
              <button 
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all active:scale-90 relative" 
                aria-label="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                          <Bell className="text-gray-300" size={24} />
                        </div>
                        <p className="text-gray-500 font-medium">No new notifications</p>
                        <p className="text-sm text-gray-400 mt-1">Check back later for updates</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notifications.map((notif) => (
                          <div 
                            key={notif._id} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 hover:bg-blue-50/50 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-50/20' : ''}`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <h4 className={`text-sm mb-1 ${!notif.read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                                  {notif.title}
                                </h4>
                                <p className="text-sm text-gray-500 leading-snug">
                                  {notif.message}
                                </p>
                                <span className="text-xs text-blue-500/70 font-medium mt-2 block">
                                  {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {!notif.read && (
                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all active:scale-90" aria-label="Location">
              <MapPin size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-out Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={toggleMenu}
      />

      {/* Slide-out Menu Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-[300px] bg-white z-[70] shadow-2xl transition-transform duration-300 ease-out transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <span className="text-xl font-black text-gray-800 uppercase tracking-widest">Navigation</span>
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
                  `flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                    isActive 
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
