import React, { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";

const Toast = ({ message, title, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // Wait for fade-out animation
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-5 right-5 z-50 transition-all duration-500 transform ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="bg-white border-l-4 border-blue-500 shadow-xl rounded-lg p-4 flex items-start gap-3 min-w-[300px] max-w-md">
        <div className="bg-blue-100 p-2 rounded-full">
          <Bell className="text-blue-500 w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
          <p className="text-gray-600 text-sm mt-1">{message}</p>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 500);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
