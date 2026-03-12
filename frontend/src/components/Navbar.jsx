import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600">
          <Zap size={28} className="fill-blue-600" />
          <span>PowerSense</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
            Home
          </Link>
          <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium transition-colors border-l pl-6 border-gray-200">
            Login
          </Link>
          <Link to="/register" className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-100">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
