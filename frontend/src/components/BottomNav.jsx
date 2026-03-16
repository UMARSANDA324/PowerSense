import { NavLink } from "react-router-dom";
import { MdHome, MdReportProblem, MdQueryStats, MdPerson } from "react-icons/md";

const BottomNav = () => {
  const navItems = [
    { path: "/", icon: <MdHome size={28} />, label: "Home" },
    { path: "/report", icon: <MdReportProblem size={28} />, label: "Report" },
    { path: "/status", icon: <MdQueryStats size={28} />, label: "Status" },
    { path: "/profile", icon: <MdPerson size={28} />, label: "Me" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around w-full max-w-7xl mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? "text-blue-600 scale-110" : "text-gray-400 hover:text-gray-600"
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {item.label}
            </span>
            {/* Active Indicator Dot */}
            <div className={`w-1 h-1 rounded-full bg-blue-600 transition-all duration-300 opacity-0 active-dot`} />
          </NavLink>
        ))}
      </div>
      <style>{`
        .active .active-dot {
          opacity: 1 !important;
          margin-top: 2px;
        }
      `}</style>
    </nav>
  );
};


export default BottomNav;
