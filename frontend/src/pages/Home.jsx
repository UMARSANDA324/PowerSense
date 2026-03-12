import { Link } from "react-router-dom";
import { Zap, ShieldCheck, BarChart3, Clock } from "lucide-react";

const Home = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-linear-to-b from-blue-50 to-white py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold mb-8 animate-bounce">
            <Zap size={18} />
            <span>Real-time Monitoring</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Smart Power Monitoring for <br />
            <span className="text-blue-600">Every Household</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Keep track of power availability, receive real-time alerts, and understand electricity trends in your neighborhood with PowerSense.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95">
              Monitor Now
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-100 text-lg font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Clock size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Live Updates</h3>
              <p className="text-gray-600">Instant notifications when power status changes in your area. Always stay informed.</p>
            </div>
            
            <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Power Analytics</h3>
              <p className="text-gray-600">View weekly and monthly trends of electricity availability with beautiful charts.</p>
            </div>

            <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all">
              <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Community Data</h3>
              <p className="text-gray-600">Crowdsourced data from neighbors to provide the most accurate area coverage.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;