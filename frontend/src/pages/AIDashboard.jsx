import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FeederHealthCard from '../components/FeederHealthCard';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, Activity, Zap, ShieldAlert, BarChart3, Loader2 } from 'lucide-react';
import socket from '../services/socket';

const AIDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/ai/analytics`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load AI analytics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchAnalytics();
    }
    
    socket.on("powerStatusUpdated", () => {
      if (user?.token) fetchAnalytics();
    });
    
    return () => {
      socket.off("powerStatusUpdated");
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-800 p-6 rounded-2xl shadow-xl text-white">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-blue-300" />
            AI Intelligence Dashboard
          </h1>
          <p className="mt-2 text-blue-100 opacity-90">Real-time predictive analytics and grid health monitoring</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-center px-4 border-r border-blue-500/30">
            <p className="text-sm text-blue-200">Active Outages</p>
            <p className="text-2xl font-bold">{analytics?.activeOutagesCount || 0}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-sm text-blue-200">Recent Reports</p>
            <p className="text-2xl font-bold">{analytics?.recentReportsCount || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: AI Insights */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
              <Activity className="w-5 h-5 text-indigo-500" />
              Live AI Insights
            </h2>
            <div className="space-y-4">
              {analytics?.insights?.map((insight, index) => (
                <div key={index} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-3 items-start">
                  {insight.includes('High probability') || insight.includes('Red') ? (
                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                </div>
              ))}
              {(!analytics?.insights || analytics.insights.length === 0) && (
                <p className="text-gray-500 text-sm">No new AI insights available.</p>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Network Stability
              </h3>
              <p className="text-sm text-indigo-100 mb-4">
                Based on AI aggregation of feeder metrics over the past 24 hours.
              </p>
              <div className="text-4xl font-bold">
                {analytics?.feederHealth?.filter(f => f.status === 'Green').length || 0}
                <span className="text-lg font-normal text-indigo-200 ml-2">/ {analytics?.feederHealth?.length || 0} Stable</span>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
              <BrainCircuit className="w-48 h-48" />
            </div>
          </div>
        </div>

        {/* Right Column: Feeder Health */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-800">
              <Zap className="w-5 h-5 text-yellow-500" />
              Feeder Health & Prediction
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics?.feederHealth?.map((feeder, index) => (
                <FeederHealthCard key={index} feeder={feeder} />
              ))}
              {(!analytics?.feederHealth || analytics.feederHealth.length === 0) && (
                <div className="col-span-full py-12 text-center text-gray-500">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No active feeder data available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDashboard;
