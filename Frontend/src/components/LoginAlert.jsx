import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LoginAlert = () => {
  const [alert, setAlert] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get("reason");

    if (reason) {
      switch (reason) {
        case "timeout":
          setAlert({
            type: "warning",
            title: "Session Expired",
            message:
              "Your session has expired due to inactivity. Please log in again.",
            icon: "🕒",
          });
          break;
        case "security":
          setAlert({
            type: "error",
            title: "Security Alert",
            message:
              "Your session was terminated for security reasons. Please log in again.",
            icon: "🔒",
          });
          break;
        case "device":
          setAlert({
            type: "warning",
            title: "Device Change Detected",
            message:
              "Login from a different device detected. Please verify your identity.",
            icon: "📱",
          });
          break;
        case "expired":
          setAlert({
            type: "info",
            title: "Session Expired",
            message:
              "Your login session has expired. Please log in again to continue.",
            icon: "ℹ️",
          });
          break;
        default:
          break;
      }

      // Clear the reason parameter from URL
      const newParams = new URLSearchParams(location.search);
      newParams.delete("reason");
      const newUrl = `${location.pathname}${
        newParams.toString() ? "?" + newParams.toString() : ""
      }`;
      navigate(newUrl, { replace: true });
    }
  }, [location, navigate]);

  const handleClose = () => {
    setAlert(null);
  };

  if (!alert) return null;

  const alertStyles = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div
        className={`rounded-lg border p-4 shadow-lg ${alertStyles[alert.type]}`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 text-xl mr-3">{alert.icon}</div>
          <div className="flex-1">
            <h3 className="text-sm font-medium mb-1">{alert.title}</h3>
            <p className="text-sm">{alert.message}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginAlert;
