import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User as UserIcon, Activity, Zap, ShieldCheck, MapPin, BarChart3, Info, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
// Use the shared singleton — never call io() directly in a component.
// A second io() call creates a duplicate connection → HTTP 400 when the server restarts.
import socket from '../services/socket';

const AIChatAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [contextData, setContextData] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserContext = async () => {
      try {
        const [statusRes, reportsRes, predRes] = await Promise.all([
          api.get("/power/all-status"),
          api.get("/reports/dev-list/all"),
          api.get("/predictions")
        ]);

        const statuses = statusRes.data || [];
        const reports = (reportsRes.data && reportsRes.data.reports) || [];
        const predictions = (predRes.data && predRes.data.items) || [];

        // Compute user specific context
        const userFeederName = user.feeder || '';
        const userFeederReports = reports.filter(r => r.feeder === userFeederName);
        const activeComplaints = userFeederReports.filter(r => r.status !== "Resolved").length;
        const feederPred = predictions.find(p => p.feeder === userFeederName);
        const feederStatus = statuses.find(s => s.feeder?.name === userFeederName);

        let uptime = 95; 
        if (feederStatus) {
            if (!feederStatus.isActive || feederStatus.status === "off") uptime = 42;
            else if (feederStatus.status === "unstable") uptime = 75;
            else if (feederStatus.status === "maintenance") uptime = 85;
            else uptime = Math.min(99, 90 + (Math.random() * 9));
        }

        const uptimeScore = (uptime / 100) * 5;
        const complaintScore = Math.max(1, 5 - (activeComplaints * 0.5));
        const riskPenalty = feederPred && feederPred.confidence ? (feederPred.confidence / 100) * 2 : 0;
        let score = (uptimeScore * 0.6) + (complaintScore * 0.4) - riskPenalty;
        score = Math.max(1, Math.min(5, score));
        const rating = Math.round(score);

        const currentStatus = feederStatus ? (!feederStatus.isActive ? "OFFLINE" : feederStatus.status.toUpperCase()) : "ONLINE";
        const riskLevel = feederPred?.riskLevel ? feederPred.riskLevel.toUpperCase() : "LOW";
        
        setContextData({
          uptime: Math.round(uptime),
          activeComplaints,
          rating,
          currentStatus,
          riskLevel,
          healthScore: Math.round((uptime + (rating / 5) * 100) / 2)
        });

        // Setup personalized initial messages
        let initialGreeting = `Hello ${user.fullName.split(' ')[0]} 👋\nYour feeder (${userFeederName}) is currently ${currentStatus.toLowerCase()} and healthy.`;
        if (currentStatus === "OFFLINE") {
          initialGreeting = `Hello ${user.fullName.split(' ')[0]} 👋\nI see ${userFeederName} is currently experiencing an outage. How can I help you?`;
        } else if (currentStatus === "MAINTENANCE") {
          initialGreeting = `Hello ${user.fullName.split(' ')[0]} 👋\nYour feeder (${userFeederName}) is currently undergoing maintenance.`;
        } else if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
          initialGreeting = `Hello ${user.fullName.split(' ')[0]} 👋\nThere's a high risk of outage on ${userFeederName}. You may want to charge your devices.`;
        }

        setMessages([
          { role: 'ai', content: initialGreeting, timestamp: new Date() },
          { role: 'summary_card', timestamp: new Date() }
        ]);

      } catch (err) {
        console.error("Failed to load context", err);
        setMessages([
          { role: 'ai', content: `Hello ${user.fullName.split(' ')[0]}, I am your Grid Intelligence Assistant. How can I help?`, timestamp: new Date() }
        ]);
      } finally {
        setContextLoading(false);
      }
    };

    fetchUserContext();

    // Attach real-time grid update listeners to the shared singleton socket.
    // Named handlers are required so the cleanup return can remove exactly these
    // listeners — socket.off(event) without a handler removes ALL listeners for
    // that event and would break other components (App, DashboardProvider, etc.).
    const handleOutageUpdate = (data) => {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `LIVE UPDATE: Outage status changed for ${data.feeder || 'your area'}. Severity: ${data.severity || 'Unknown'}.`,
        timestamp: new Date()
      }]);
    };

    const handleAnnouncement = (data) => {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `OFFICIAL ANNOUNCEMENT: ${data.title}`,
        timestamp: new Date()
      }]);
    };

    socket.on('outage_update', handleOutageUpdate);
    socket.on('new_announcement', handleAnnouncement);

    return () => {
      socket.off('outage_update', handleOutageUpdate);
      socket.off('new_announcement', handleAnnouncement);
    };
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendQuery = async (queryText) => {
    if (!queryText.trim()) return;

    const userMessage = { role: 'user', content: queryText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
        const response = await api.post('/ai/assistant', {
        question: userMessage.content,
        context: {
          feeder: user?.feeder,
          ward: user?.ward,
          state: user?.state,
        }
        });

      if (response.data.success) {
        setMessages(prev => [...prev, { role: 'ai', content: response.data.result.text, timestamp: new Date() }]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection to grid intelligence failed. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    await sendQuery(input);
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date || new Date());
  };

  // Allow chat for both authenticated and guest users

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 md:bottom-24 md:right-6 p-5 md:p-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/50 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_45px_rgba(59,130,246,0.8)] transition-all duration-300 z-[60] transform hover:scale-110 active:scale-95 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open Grid Assistant"
        title="Open Grid Assistant"
      >
        {/* Outer glowing pulse ring */}
        <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping" style={{ animationDuration: '3s' }}></div>
        
        <div className="relative flex items-center justify-center">
          <Bot className="w-8 h-8 md:w-9 md:h-9 animate-pulse drop-shadow-lg" />
          <span className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-emerald-400 text-slate-900 text-[11px] md:text-xs font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 shadow-md">AI</span>
        </div>
      </button>

      <div 
        className={`fixed bottom-24 right-4 md:bottom-24 md:right-6 w-[calc(100vw-32px)] md:w-[400px] h-[600px] max-h-[calc(100vh-120px)] bg-slate-900/95 backdrop-blur-xl border border-blue-500/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-[60] transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100 pointer-events-auto translate-y-0' : 'scale-90 opacity-0 pointer-events-none translate-y-10'}`}
      >
        {/* Header */}
        <div className="bg-slate-800/80 border-b border-blue-500/20 p-4 text-white z-10 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-blue-500/20 p-2 rounded-full border border-blue-500/30">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${contextData?.currentStatus === 'OFFLINE' ? 'bg-red-500' : contextData?.currentStatus === 'MAINTENANCE' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">{user?.fullName || 'User'}</h3>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{contextData?.currentStatus === 'OFFLINE' ? 'Outage Active' : 'Grid Intelligence Active'}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Context Badges Row */}
          {!contextLoading && contextData && (
            <div className="flex flex-wrap gap-2 mt-1">
              <div className="flex items-center gap-1 text-[10px] bg-slate-700/50 px-2 py-1 rounded border border-slate-600">
                <MapPin className="w-3 h-3 text-indigo-300" />
                <span className="text-indigo-100">{user?.feeder || user?.area || 'Unknown Area'}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] bg-slate-700/50 px-2 py-1 rounded border border-slate-600">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-100">Health: {contextData.healthScore}%</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] bg-slate-700/50 px-2 py-1 rounded border border-slate-600">
                <ShieldCheck className={`w-3 h-3 ${contextData.riskLevel === 'HIGH' || contextData.riskLevel === 'CRITICAL' ? 'text-red-400' : 'text-blue-300'}`} />
                <span className={contextData.riskLevel === 'HIGH' || contextData.riskLevel === 'CRITICAL' ? 'text-red-100' : 'text-blue-100'}>Risk: {contextData.riskLevel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
          {messages.map((msg, index) => {
            if (msg.role === 'summary_card') {
              if (!contextData) return null;
              return (
                <div key={index} className="mx-auto w-full max-w-[95%] bg-gradient-to-br from-indigo-900/80 to-blue-900/80 border border-indigo-500/30 rounded-xl p-4 shadow-lg">
                  <h4 className="text-xs font-bold text-indigo-200 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <BarChart3 className="w-4 h-4" /> Weekly Personal Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] text-slate-400 mb-1">Uptime</p>
                      <p className="text-lg font-bold text-white">{contextData.uptime}%</p>
                    </div>
                    <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] text-slate-400 mb-1">Reliability</p>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-3 h-3 ${star <= contextData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-300 bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
                    <span className="flex items-center gap-1"><Info className="w-3 h-3 text-blue-400" /> Complaints: {contextData.activeComplaints}</span>
                    <span className="font-mono text-[10px] bg-slate-700/50 px-2 py-0.5 rounded text-indigo-300">Health: {contextData.healthScore}%</span>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={index} 
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : msg.role === 'system' ? 'mx-auto max-w-[95%] justify-center' : ''}`}
              >
                {msg.role !== 'system' && (
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${msg.role === 'user' ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300' : 'bg-blue-600/20 border-blue-500/30 text-blue-400'}`}>
                    {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}
                
                <div className="flex flex-col gap-1 w-full">
                  <div 
                    className={`p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-none shadow-lg' 
                        : msg.role === 'system'
                        ? 'bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-2 rounded-full text-center font-mono uppercase tracking-wide'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl rounded-tl-none shadow-lg'
                    }`}
                  >
                    {msg.content.split('\n\nSuggested Actions:').map((part, i) => {
                      if (i === 0) return <div key={i}>{part}</div>;
                    const actions = part.trim().split('|').map(s => s.trim());
            return (
              <div key={i} className="mt-3 flex flex-wrap gap-2">
                {actions.map((act, j) => (
                  <button 
                    key={j} 
                    onClick={() => sendQuery(act)} 
                    className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-[10px] px-2 py-1 rounded-full transition-colors"
                  >
                    {act}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {msg.role !== 'system' && (
          <span className={`text-[10px] text-slate-500 font-mono ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            {formatTime(msg.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
})}
          
          {isTyping && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-800/80 border-t border-blue-500/20 backdrop-blur-md">
          {/* Quick Questions Row */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x">
              {[
                "Why is there no light?",
                "Me yasa babu wuta?",
                "When will power return?",
                "What is the current voltage?",
                "Is my fridge safe?",
                "Can I use my AC?",
                "Is there voltage fluctuation?",
                "Should I disconnect my appliances?",
                "Most unstable feeders?",
                "Low voltage issues",
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendQuery(q)}
                  className="whitespace-nowrap flex-shrink-0 bg-blue-600/10 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs px-3 py-1.5 rounded-full transition-colors snap-center"
                >
                  {q}
                </button>
              ))}
            </div>
            <style>{`
              .scrollbar-none::-webkit-scrollbar { display: none; }
              .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
          </div>

          <form onSubmit={handleSend} className="p-4 pt-2">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query grid status..."
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-2 bottom-2 bg-blue-600/80 text-white p-2 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600/80 transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
};

export default AIChatAssistant;
