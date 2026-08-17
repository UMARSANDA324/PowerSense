import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Search,
  MessageSquare,
  Users,
  ChevronRight,
  X,
  Plus,
  Check,
  CheckCheck,
  Loader2,
  Megaphone,
  User,
  Clock,
  RefreshCw,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Volume2
} from "lucide-react";
import {
  sendMessage,
  sendVoiceMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
  getContacts,
} from "../services/companyMessageService";
import socket from "../services/socket";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const RoleBadge = ({ role }) => {
  const map = {
    "super-admin": { label: "Super Admin", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    "company-super-admin": { label: "Super Admin", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    admin: { label: "Admin", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    "regional-admin": { label: "Regional Admin", color: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
  };
  const { label, color } = map[role] || { label: role, color: "bg-slate-500/15 text-slate-400 border-slate-500/20" };
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
};

/* ─── Voice Player Component ─────────────────────────────────────── */
const VoicePlayer = ({ audioUrl, duration = 0, isMine }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const audioRef = useRef(null);

  const getFullUrl = (url) => {
    if (!url) return "";
    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const full = url.startsWith("http") ? url : `${baseUrl}${url}`;
    return `${full}${full.includes("?") ? "&" : "?"}token=${token || ""}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error("Audio playback error:", err));
      setIsPlaying(true);
    }
  };

  const formatSec = (sec) => {
    if (isNaN(sec) || !sec) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl min-w-[220px] max-w-[300px] border ${
      isMine
        ? "bg-indigo-700/60 border-indigo-500/30 text-white"
        : "bg-slate-800/90 border-slate-700 text-slate-100"
    }`}>
      <audio
        ref={audioRef}
        src={getFullUrl(audioUrl)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setTotalDuration(audioRef.current?.duration || duration)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${
          isMine
            ? "bg-white text-indigo-600 hover:bg-slate-100"
            : "bg-indigo-600 text-white hover:bg-indigo-500"
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Voice Note</span>
          <Volume2 size={12} className="opacity-60" />
        </div>
        <input
          type="range"
          min={0}
          max={totalDuration || 100}
          value={currentTime}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setCurrentTime(val);
            if (audioRef.current) audioRef.current.currentTime = val;
          }}
          className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-400"
        />
        <div className="flex justify-between items-center text-[10px] opacity-75 font-mono">
          <span>{formatSec(currentTime)}</span>
          <span>{formatSec(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Voice Recorder Component ─────────────────────────────────────── */
const VoiceRecorder = ({ onRecorded, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "" };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setAudioDuration(recordingTime);
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setAudioDuration(0);
    setIsPlayingPreview(false);
  };

  const formatSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3">
      {!audioBlob && !isRecording && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Click to record voice message</span>
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors text-xs font-bold"
          >
            <Mic size={14} className="animate-pulse" /> Start Recording
          </button>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2.5 text-red-400 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>Recording... {formatSec(recordingTime)}</span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-xs font-bold"
          >
            <Square size={13} /> Stop
          </button>
        </div>
      )}

      {audioBlob && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-900/80 rounded-xl p-3 border border-slate-700">
            <audio
              ref={previewAudioRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isPlayingPreview) {
                    previewAudioRef.current?.pause();
                    setIsPlayingPreview(false);
                  } else {
                    previewAudioRef.current?.play();
                    setIsPlayingPreview(true);
                  }
                }}
                className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors"
              >
                {isPlayingPreview ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div className="text-xs">
                <p className="font-bold text-slate-200">Voice Recording Ready</p>
                <p className="text-[10px] text-slate-400">{formatSec(audioDuration || recordingTime)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete recording"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={() => onRecorded(audioBlob, audioDuration || recordingTime, audioBlob.type || "audio/webm")}
              className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Confirm Audio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── New Message Modal ─────────────────────────────────────────── */
const NewMessageModal = ({ contacts, onClose, onSent }) => {
  const [msgMode, setMsgMode] = useState("text"); // "text" | "voice"
  const [recipientType, setRecipientType] = useState("direct");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSendText = async () => {
    if (!body.trim()) return setError("Message body cannot be empty");
    if (recipientType === "direct" && !recipientId) return setError("Please select a recipient");
    setSending(true);
    setError("");
    try {
      await sendMessage({ recipientId: recipientId || undefined, recipientType, subject, body });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async (blob, duration, mimeType) => {
    if (recipientType === "direct" && !recipientId) return setError("Please select a recipient before sending voice recording");
    setSending(true);
    setError("");
    try {
      await sendVoiceMessage({
        recipientId: recipientId || undefined,
        recipientType,
        subject,
        body: body?.trim() || "[Voice Message]",
        audioBlob: blob,
        audioDuration: duration,
        audioMimeType: mimeType
      });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send voice message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Plus size={17} />
            </div>
            <h3 className="text-base font-black text-slate-100">New Message</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Mode Selector (Text / Voice) */}
          <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
            <button
              onClick={() => setMsgMode("text")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                msgMode === "text"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare size={13} /> Text Message
            </button>
            <button
              onClick={() => setMsgMode("voice")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                msgMode === "voice"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Mic size={13} /> Voice Message
            </button>
          </div>

          {/* Recipient Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Send To</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setRecipientType("direct"); setRecipientId(""); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                  recipientType === "direct"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                <User size={13} /> Direct Message
              </button>
              <button
                onClick={() => { setRecipientType("all_admins"); setRecipientId(""); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                  recipientType === "all_admins"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                <Megaphone size={13} /> Broadcast to All Admins
              </button>
            </div>
          </div>

          {/* Recipient Select (direct only) */}
          {recipientType === "direct" && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Recipient</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Select a person...</option>
                {contacts.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName} — {c.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Subject (optional)</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Body / Voice Mode */}
          {msgMode === "text" ? (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Message *</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Voice Recording *</label>
              <VoiceRecorder
                onRecorded={(blob, duration, mimeType) => handleSendVoice(blob, duration, mimeType)}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <X size={13} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          {msgMode === "text" && (
            <button
              onClick={handleSendText}
              disabled={sending}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? "Sending..." : "Send Message"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Reply Box ─────────────────────────────────────────────────── */
const ReplyBox = ({ message, onReplied }) => {
  const [body, setBody] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleReplyText = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const recipientId =
        message.sender?._id !== undefined
          ? message.sender._id
          : message.sender;
      await sendMessage({
        recipientId,
        recipientType: "direct",
        subject: message.subject ? `Re: ${message.subject}` : "",
        body,
        parentId: message._id,
      });
      setBody("");
      onReplied?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleReplyVoice = async (blob, duration, mimeType) => {
    setSending(true);
    setError("");
    try {
      const recipientId =
        message.sender?._id !== undefined
          ? message.sender._id
          : message.sender;
      await sendVoiceMessage({
        recipientId,
        recipientType: "direct",
        subject: message.subject ? `Re: ${message.subject}` : "",
        body: "[Voice Message]",
        audioBlob: blob,
        audioDuration: duration,
        audioMimeType: mimeType,
        parentId: message._id,
      });
      setIsVoiceMode(false);
      onReplied?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send voice reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-slate-800 p-4 bg-slate-900/60">
      {error && (
        <div className="mb-2 text-xs text-red-400">{error}</div>
      )}
      {isVoiceMode ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
            <span>Record Voice Reply</span>
            <button
              onClick={() => setIsVoiceMode(false)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Switch to text reply
            </button>
          </div>
          <VoiceRecorder
            onRecorded={(blob, duration, mimeType) => handleReplyVoice(blob, duration, mimeType)}
          />
        </div>
      ) : (
        <div className="flex gap-2 items-end">
          <button
            type="button"
            onClick={() => setIsVoiceMode(true)}
            className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            title="Record Voice Reply"
          >
            <Mic size={16} />
          </button>
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleReplyText();
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none"
          />
          <button
            onClick={handleReplyText}
            disabled={sending || !body.trim()}
            className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Main Messaging Module ─────────────────────────────────────── */
const CompanyMessagingModule = ({ currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const threadRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [msgRes, contactRes, unreadRes] = await Promise.allSettled([
        getMessages({ search }),
        getContacts(),
        getUnreadCount(),
      ]);
      if (msgRes.status === "fulfilled") setMessages(msgRes.value?.data || []);
      if (contactRes.status === "fulfilled") setContacts(contactRes.value?.data || []);
      if (unreadRes.status === "fulfilled") setUnreadCount(unreadRes.value?.count || 0);
    } catch (err) {
      console.error("[Messaging] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time socket updates
  useEffect(() => {
    const handler = () => fetchData(true);
    socket.on("company.message.created", handler);
    return () => socket.off("company.message.created", handler);
  }, [fetchData]);

  // Auto-scroll thread
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selectedMsg]);

  const handleSelect = async (msg) => {
    if (!msg) return;
    setSelectedMsg(msg);

    const recipientId = typeof msg.recipient === "object" ? msg.recipient?._id : msg.recipient;
    const isForCurrentUser = recipientId && recipientId.toString() === currentUser?._id?.toString();
    const isBroadcastUnread = msg.recipientType === "all_admins" && !msg.readBy?.some((r) => r?.userId?.toString() === currentUser?._id?.toString());

    if ((isForCurrentUser && !msg.isRead) || isBroadcastUnread) {
      try {
        await markAsRead(msg._id);
        fetchData(true);
      } catch {}
    }
  };

  const getSenderId = (msg) => {
    if (!msg || !msg.sender) return null;
    if (typeof msg.sender === "object") return msg.sender._id || null;
    return msg.sender;
  };

  const getSenderName = (msg) => {
    if (!msg?.sender) return "Deleted User";
    if (typeof msg.sender === "object") return msg.sender.fullName || msg.sender.email || "Unknown";
    return "Unknown";
  };

  const getRecipientLabel = (msg) => {
    if (msg.recipientType === "all_admins") return "All Admins (Broadcast)";
    if (msg.recipient && typeof msg.recipient === "object") return msg.recipient.fullName || "Unknown";
    return "Unknown recipient";
  };

  const isMine = (msg) => {
    if (!msg) return false;
    const senderId = getSenderId(msg);
    if (!senderId || !currentUser?._id) return false;
    return senderId.toString() === currentUser._id.toString();
  };

  const isUnread = (msg) => {
    if (!msg || isMine(msg)) return false;
    if (msg.recipientType === "all_admins") {
      return !msg.readBy?.some((r) => r?.userId?.toString() === currentUser?._id?.toString());
    }
    return !msg.isRead;
  };

  // Group: top-level messages (no parentId) or show all threads
  const topLevel = messages.filter((m) => !m.parentId);
  const replies = (parentId) => messages.filter((m) => m.parentId === parentId);

  const filteredMessages = search.trim()
    ? topLevel.filter(
        (m) =>
          m.body?.toLowerCase().includes(search.toLowerCase()) ||
          m.subject?.toLowerCase().includes(search.toLowerCase()) ||
          getSenderName(m).toLowerCase().includes(search.toLowerCase())
      )
    : topLevel;

  const selectedReplies = selectedMsg ? replies(selectedMsg._id) : [];

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* ─── Sidebar ───────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <MessageSquare size={18} className="text-indigo-400" />
              <h2 className="text-sm font-black text-slate-100">Messages</h2>
              {unreadCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchData(true)}
                className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={() => setShowNewMsg(true)}
                className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 transition-colors"
                title="New Message"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 size={22} className="animate-spin text-indigo-400" />
              <p className="text-xs text-slate-500">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 p-6 text-center">
              <MessageSquare size={28} className="text-slate-700" />
              <p className="text-xs text-slate-500">
                {search ? "No messages match your search" : "No messages yet. Start a conversation!"}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const unread = isUnread(msg);
              const mine = isMine(msg);
              const replyCount = replies(msg._id).length;
              const selected = selectedMsg?._id === msg._id;
              return (
                <button
                  key={msg._id}
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left p-4 border-b border-slate-800/60 transition-colors ${
                    selected
                      ? "bg-indigo-600/10 border-l-2 border-l-indigo-500"
                      : "hover:bg-slate-800/40 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black ${
                        msg.recipientType === "all_admins"
                          ? "bg-amber-500/15 text-amber-400"
                          : mine
                          ? "bg-indigo-500/15 text-indigo-400"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {msg.recipientType === "all_admins" ? (
                        <Megaphone size={14} />
                      ) : (
                        getSenderName(msg).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-bold truncate ${unread ? "text-slate-100" : "text-slate-400"}`}>
                          {mine ? `To: ${getRecipientLabel(msg)}` : getSenderName(msg)}
                        </p>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">{formatTime(msg.createdAt)}</span>
                      </div>
                      {msg.subject && (
                        <p className={`text-[11px] truncate mb-0.5 ${unread ? "text-slate-200 font-semibold" : "text-slate-500"}`}>
                          {msg.subject}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 truncate">{msg.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {unread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        )}
                        {msg.recipientType === "all_admins" && (
                          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Broadcast</span>
                        )}
                        {replyCount > 0 && (
                          <span className="text-[10px] text-slate-600">{replyCount} repl{replyCount > 1 ? "ies" : "y"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Thread View ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedMsg ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600">
              <MessageSquare size={30} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 mb-1">Select a message to read</p>
              <p className="text-xs text-slate-600">Or compose a new message using the + button</p>
            </div>
            <button
              onClick={() => setShowNewMsg(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors"
            >
              <Plus size={14} /> New Message
            </button>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-800 bg-slate-900">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black ${
                    selectedMsg.recipientType === "all_admins"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-indigo-500/15 text-indigo-400"
                  }`}
                >
                  {selectedMsg.recipientType === "all_admins" ? (
                    <Megaphone size={16} />
                  ) : (
                    getSenderName(selectedMsg).charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-slate-100">{getSenderName(selectedMsg)}</p>
                    {selectedMsg.sender?.role && <RoleBadge role={selectedMsg.sender.role} />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedMsg.recipientType === "all_admins"
                      ? "Broadcast to all company admins"
                      : `To: ${getRecipientLabel(selectedMsg)}`}
                  </p>
                  {selectedMsg.subject && (
                    <p className="text-xs font-semibold text-slate-300 mt-1">{selectedMsg.subject}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(selectedMsg.createdAt).toLocaleString("en-GB", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </span>
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div ref={threadRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Original message */}
              <MessageBubble
                msg={selectedMsg}
                isMine={isMine(selectedMsg)}
                currentUserId={currentUser?._id}
              />

              {/* Replies */}
              {selectedReplies.map((reply) => (
                <MessageBubble
                  key={reply._id}
                  msg={reply}
                  isMine={isMine(reply)}
                  currentUserId={currentUser?._id}
                  isReply
                />
              ))}
            </div>

            {/* Reply Box */}
            <ReplyBox
              message={selectedMsg}
              onReplied={() => {
                fetchData(true);
              }}
            />
          </>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMsg && (
        <NewMessageModal
          contacts={contacts}
          onClose={() => setShowNewMsg(false)}
          onSent={() => fetchData(true)}
        />
      )}
    </div>
  );
};

/* ─── Message Bubble ─────────────────────────────────────────────── */
const MessageBubble = ({ msg, isMine, isReply }) => {
  const senderName =
    typeof msg.sender === "object" ? msg.sender?.fullName || "Deleted User" : "Unknown";
  const senderRole = typeof msg.sender === "object" ? msg.sender?.role : "";
  const senderInitial = senderName?.charAt(0)?.toUpperCase?.() || "?";

  return (
    <div className={`flex gap-3 ${isMine ? "flex-row-reverse" : "flex-row"} ${isReply ? "pl-8" : ""}`}>
      <div
        className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black ${
          isMine ? "bg-indigo-500/15 text-indigo-400" : "bg-slate-700 text-slate-300"
        }`}
      >
        {senderInitial}
      </div>
      <div className={`max-w-[75%] space-y-1 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold text-slate-500 ${isMine ? "order-last" : ""}`}>
            {isMine ? "You" : senderName}
          </span>
          {senderRole && !isMine && <RoleBadge role={senderRole} />}
        </div>
        {msg.messageType === "voice" || msg.audioUrl ? (
          <div className="space-y-1.5">
            <VoicePlayer
              audioUrl={msg.audioUrl}
              duration={msg.audioDuration || 0}
              isMine={isMine}
            />
            {msg.body && msg.body !== "[Voice Message]" && (
              <p className="text-xs text-slate-400 px-1">{msg.body}</p>
            )}
          </div>
        ) : (
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isMine
                ? "bg-indigo-600 text-white rounded-tr-sm"
                : "bg-slate-800 text-slate-100 rounded-tl-sm"
            }`}
          >
            {msg.body}
          </div>
        )}
        <div className={`flex items-center gap-1.5 ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-slate-600">{formatTime(msg.createdAt)}</span>
          {isMine && (
            msg.isRead
              ? <CheckCheck size={11} className="text-indigo-400" />
              : <Check size={11} className="text-slate-600" />
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyMessagingModule;
