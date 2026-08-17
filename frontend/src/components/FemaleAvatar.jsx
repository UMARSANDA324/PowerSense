import React from "react";

/**
 * Animated Female Assistant Avatar Component
 * Displays a friendly, modern female avatar with subtle CSS micro-animations
 * (eye blink, subtle head hover, and glowing status ring).
 */
const FemaleAvatar = ({ className = "" }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer subtle pulsing aura */}
      <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping opacity-30" style={{ animationDuration: "3s" }} />

      {/* Main Avatar Container */}
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-[2px] shadow-md shadow-blue-500/20">
        <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center relative">
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full transform transition-transform hover:scale-105"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Hair Gradient */}
              <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
              {/* Skin Tone Gradient */}
              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              {/* Shirt/Blazer Gradient */}
              <linearGradient id="attireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>

            {/* Background Circle */}
            <circle cx="60" cy="60" r="60" fill="#0f172a" />

            {/* Back Hair */}
            <path
              d="M30 45 Q20 70 24 105 L96 105 Q100 70 90 45 Z"
              fill="url(#hairGrad)"
            />

            {/* Shoulders / Professional Attire */}
            <path
              d="M20 110 Q60 90 100 110 L105 120 L15 120 Z"
              fill="url(#attireGrad)"
            />
            {/* White Collar */}
            <path
              d="M50 96 L60 108 L70 96 L60 92 Z"
              fill="#ffffff"
              opacity="0.9"
            />

            {/* Neck */}
            <rect x="52" y="75" width="16" height="18" rx="4" fill="#c05621" />

            {/* Face */}
            <ellipse cx="60" cy="58" rx="22" ry="26" fill="#d97706" />

            {/* Eyebrows */}
            <path d="M46 47 Q52 44 56 47" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M64 47 Q68 44 74 47" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Eyes (with blink animation) */}
            <g className="animate-[blink_4s_infinite]">
              <ellipse cx="51" cy="54" rx="3.5" ry="4" fill="#0f172a" />
              <circle cx="52.5" cy="52.5" r="1.2" fill="#ffffff" />
              <ellipse cx="69" cy="54" rx="3.5" ry="4" fill="#0f172a" />
              <circle cx="70.5" cy="52.5" r="1.2" fill="#ffffff" />
            </g>

            {/* Nose */}
            <path d="M60 55 L58 63 L62 63" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* Friendly Smile */}
            <path
              d="M50 70 Q60 78 70 70"
              stroke="#451a03"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Front Hair / Stylish Bangs */}
            <path
              d="M36 48 C34 25 86 25 84 48 C76 34 66 32 60 38 C54 32 44 34 36 48 Z"
              fill="url(#hairGrad)"
            />

            {/* Headset / Earbud (SaaS Assistant Detail) */}
            <circle cx="39" cy="58" r="3.5" fill="#38bdf8" />
            <path d="M39 60 Q42 72 52 74" stroke="#e0f2fe" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>

      {/* Online Status Indicator */}
      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />

      {/* Inline Keyframes for Eyes Blink */}
      <style>{`
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
      `}</style>
    </div>
  );
};

export default FemaleAvatar;
