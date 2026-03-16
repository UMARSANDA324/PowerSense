import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, AlertCircle, Zap } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalReports: 0,
    resolvedIssues: 0,
    activeOutages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats from API
    const fetchStats = async () => {
      try {
        setLoading(false);
        // Placeholder data - replace with actual API call
        setStats({
          activeUsers: 1250,
          totalReports: 342,
          resolvedIssues: 298,
          activeOutages: 8
        });
      } catch (error) {
        console.error("Dashboard: Failed to fetch stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto p-6 pt-12">
          <div>
            <h1 className="text-3xl font-black text-gray-800">Dashboard</h1>
            <p className="text-gray-500 mt-2 font-medium">Overview of system performance and metrics</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Active Users Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users size={24} className="text-blue-600" />
                </div>
                <span className="text-green-600 text-sm font-bold">+12%</span>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold">Active Users</h3>
              <p className="text-2xl font-black text-gray-800 mt-1">{stats.activeUsers}</p>
            </div>

            {/* Total Reports Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 size={24} className="text-purple-600" />
                </div>
                <span className="text-green-600 text-sm font-bold">+8%</span>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold">Total Reports</h3>
              <p className="text-2xl font-black text-gray-800 mt-1">{stats.totalReports}</p>
            </div>

            {/* Resolved Issues Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp size={24} className="text-green-600" />
                </div>
                <span className="text-green-600 text-sm font-bold">+5%</span>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold">Resolved</h3>
              <p className="text-2xl font-black text-gray-800 mt-1">{stats.resolvedIssues}</p>
            </div>

            {/* Active Outages Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertCircle size={24} className="text-red-600" />
                </div>
                <span className="text-red-600 text-sm font-bold">-2%</span>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold">Active Outages</h3>
              <p className="text-2xl font-black text-gray-800 mt-1">{stats.activeOutages}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
