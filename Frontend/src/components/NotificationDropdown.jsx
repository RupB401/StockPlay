import React, { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  FaBell,
  FaTimes,
  FaCheck,
  FaTrash,
  FaCog,
  FaExclamationTriangle,
  FaInfoCircle,
  FaChartLine,
  FaNewspaper,
  FaDollarSign,
} from "react-icons/fa";

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");

  const getNotificationIcon = (type) => {
    switch (type) {
      case "price_alert":
        return <FaDollarSign className="text-yellow-500" />;
      case "news":
        return <FaNewspaper className="text-blue-500" />;
      case "portfolio":
        return <FaChartLine className="text-green-500" />;
      case "market_event":
        return <FaInfoCircle className="text-purple-500" />;
      case "trade":
        return <FaExclamationTriangle className="text-orange-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-blue-500";
      default:
        return "border-l-gray-500";
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "unread") return !notification.read;
    if (activeTab === "alerts") return notification.type === "price_alert";
    return true;
  });

  if (!isOpen) return null;

  return (
    <div
      className={`absolute right-0 top-12 w-80 max-h-96 overflow-hidden rounded-lg shadow-lg border z-50 ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          isDark ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className={`font-semibold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Notifications
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 ${
              isDark ? "hover:bg-gray-700 text-gray-400" : "text-gray-500"
            }`}
          >
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 text-sm">
          {["all", "unread", "alerts"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full capitalize ${
                activeTab === tab
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800"
                  : isDark
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab}
              {tab === "unread" && unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={markAllAsRead}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                isDark
                  ? "text-blue-400 hover:bg-gray-700"
                  : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              <FaCheck /> Mark all read
            </button>
            <button
              onClick={clearAll}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                isDark
                  ? "text-red-400 hover:bg-gray-700"
                  : "text-red-600 hover:bg-red-50"
              }`}
            >
              <FaTrash /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div
            className={`p-8 text-center ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <FaBell className="mx-auto mb-2 text-2xl opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 border-l-4 ${getPriorityColor(
                notification.priority
              )} ${
                !notification.read
                  ? isDark
                    ? "bg-gray-700"
                    : "bg-blue-50"
                  : ""
              } ${
                isDark ? "border-b border-gray-700" : "border-b border-gray-100"
              } hover:${isDark ? "bg-gray-700" : "bg-gray-50"} cursor-pointer`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className={`font-medium text-sm ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className={`p-1 rounded hover:bg-red-100 ${
                        isDark
                          ? "text-gray-500 hover:text-red-400"
                          : "text-gray-400 hover:text-red-600"
                      }`}
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className={`p-3 border-t ${
          isDark ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <button
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 text-sm rounded ${
            isDark
              ? "text-gray-400 hover:text-white hover:bg-gray-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <FaCog /> Notification Settings
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
