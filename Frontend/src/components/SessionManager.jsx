import CookieManager from "../utils/cookieManager";
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import sessionManager from "../utils/sessionManager";

const SessionManager = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { logout, user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkInactivity = () => {
      const lastActivity = sessionManager.lastActivity;
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      const rememberMe = localStorage.getItem("remember_me") === "true";

      // Show warning 5 minutes before logout
      const warningThreshold = rememberMe
        ? 23.75 * 60 * 60 * 1000
        : 1.75 * 60 * 60 * 1000; // 5 minutes before timeout
      const logoutThreshold = rememberMe
        ? 24 * 60 * 60 * 1000
        : 2 * 60 * 60 * 1000;

      if (inactiveTime > warningThreshold && inactiveTime < logoutThreshold) {
        const remaining = Math.ceil((logoutThreshold - inactiveTime) / 1000);
        setTimeLeft(remaining);
        setShowWarning(true);
      } else if (inactiveTime >= logoutThreshold) {
        handleAutoLogout();
      } else {
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkInactivity, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAutoLogout = async () => {
    setShowWarning(false);
    await logout();
    window.location.href = "/login?reason=timeout";
  };

  const handleExtendSession = () => {
    sessionManager.lastActivity = Date.now();
    sessionManager.resetInactivityTimer();
    setShowWarning(false);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md mx-4">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-gray-600">
              Your session will expire in {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          You will be automatically logged out due to inactivity. Would you like
          to extend your session?
        </p>

        <div className="flex space-x-3">
          <button
            onClick={handleExtendSession}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleAutoLogout}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
