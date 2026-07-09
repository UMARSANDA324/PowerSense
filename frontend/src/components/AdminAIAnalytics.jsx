import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AdminAIAnalytics = ({ range = 'week' }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ai/analytics?range=${range}`, {
          headers: { Authorization: `Bearer ${user.token || user?.token}` }
        });
        if (res.data.success) setData(res.data.data);
        else setError('Failed to load analytics');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user, range]);

  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'super-admin') return <div className="p-4 bg-yellow-50 text-yellow-800 rounded">You do not have permission to view analytics.</div>;

  if (loading) return <div className="p-4">Loading analytics...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="p-4 bg-slate-800 text-slate-100 rounded-lg">
      <h3 className="text-lg font-semibold">AI Analytics ({data.range})</h3>
      <p className="text-sm text-slate-400">Period: {new Date(data.periodStart).toLocaleString()} - {new Date(data.periodEnd).toLocaleString()}</p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-slate-700 rounded">
          <div className="text-sm text-slate-300">Active Outages</div>
          <div className="text-2xl font-bold">{data.activeOutagesCount}</div>
        </div>
        <div className="p-3 bg-slate-700 rounded">
          <div className="text-sm text-slate-300">Recent Reports</div>
          <div className="text-2xl font-bold">{data.recentReportsCount}</div>
        </div>
        <div className="p-3 bg-slate-700 rounded">
          <div className="text-sm text-slate-300">Feeders Monitored</div>
          <div className="text-2xl font-bold">{data.feederHealth.length}</div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm text-slate-300 mb-2">Top Risk Feeders</h4>
        <div className="space-y-3 max-h-56 overflow-auto">
          {data.feederHealth.slice(0,10).map((f) => (
            <div key={f.feederId} className="flex items-center justify-between bg-slate-700/60 p-3 rounded">
              <div>
                <div className="font-medium">{f.feeder}</div>
                <div className="text-xs text-slate-400">Incidents: {f.incidents} • Outages: {f.activeOutages}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">{f.uptimePercent !== null ? `${f.uptimePercent}% uptime` : 'Uptime N/A'}</div>
                <div className={`text-xs ${f.status === 'Red' ? 'text-red-400' : f.status === 'Yellow' ? 'text-yellow-300' : 'text-green-300'}`}>{f.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-300">
        <strong>Insights:</strong>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          {data.insights.map((ins, i) => <li key={i}>{ins}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default AdminAIAnalytics;
