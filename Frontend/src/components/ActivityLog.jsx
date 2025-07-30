import React, { useState, useEffect } from "react";
import {
  FaHistory,
  FaFilter,
  FaDownload,
  FaEye,
  FaTrash,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const ActivityLog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [loading, setLoading] = useState(true);

  // Real activity data from user context
  useEffect(() => {
    // Use only real user activity data - no mock data
    const realActivities = user?.activityLog;

    // If no real data is available from backend, show empty state
    if (!realActivities || realActivities.length === 0) {
      setActivities([]);
      setFilteredActivities([]);
      setLoading(false);
      return;
    }

    // Process real activity data
    const processedActivities = realActivities.map((activity, index) => ({
      id: activity.id || index + 1,
      type: activity.type || "unknown",
      action: activity.action || "Activity",
      description: activity.description || "No description available",
      timestamp: new Date(
        activity.timestamp || activity.createdAt || Date.now()
      ),
      status: activity.status || "success",
      details: activity.details || {},
    }));

    setTimeout(() => {
      setActivities(processedActivities);
      setFilteredActivities(processedActivities);
      setLoading(false);
    }, 1000);
  }, [user]);

  // Filter activities based on type and date range
  useEffect(() => {
    let filtered = activities;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((activity) => activity.type === filterType);
    }

    // Filter by date range
    const now = new Date();
    if (dateRange !== "all") {
      const hoursBack = {
        "24h": 24,
        "7d": 24 * 7,
        "30d": 24 * 30,
      }[dateRange];

      if (hoursBack) {
        const cutoffTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
        filtered = filtered.filter(
          (activity) => activity.timestamp >= cutoffTime
        );
      }
    }

    setFilteredActivities(filtered);
  }, [activities, filterType, dateRange]);

  const getActivityIcon = (type) => {
    switch (type) {
      case "trade":
        return "💰";
      case "login":
        return "🔐";
      case "alert":
        return "🔔";
      case "security":
        return "🛡️";
      default:
        return "📋";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "pending":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  };

  const exportActivities = () => {
    const csv = [
      ["Timestamp", "Type", "Action", "Description", "Status"],
      ...filteredActivities.map((activity) => [
        activity.timestamp.toISOString(),
        activity.type,
        activity.action,
        activity.description,
        activity.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FaHistory className="text-2xl text-primary" />
            <h1 className="text-3xl font-bold">Activity Log</h1>
          </div>
          <p className="text-base-content/70">
            View your account activity, trades, and security events
          </p>
        </div>

        {/* Filters */}
        <div className="bg-base-200 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Activity Type</span>
                </label>
                <select
                  className="select select-bordered w-full max-w-xs"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Activities</option>
                  <option value="trade">Trading</option>
                  <option value="login">Login/Security</option>
                  <option value="alert">Alerts</option>
                  <option value="security">Security Changes</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Time Range</span>
                </label>
                <select
                  className="select select-bordered w-full max-w-xs"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            <button
              onClick={exportActivities}
              className="btn btn-outline gap-2"
            >
              <FaDownload />
              Export CSV
            </button>
          </div>
        </div>

        {/* Activity List */}
        <div className="bg-base-200 rounded-xl overflow-hidden">
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <FaHistory className="text-4xl text-base-content/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Activity Data</h3>
              <p className="text-base-content/70">
                {activities.length === 0
                  ? "No activity data available from your account yet."
                  : "No activities match your current filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-base-300">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-6 hover:bg-base-300/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">
                      {getActivityIcon(activity.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {activity.action}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            activity.status
                          )} bg-current bg-opacity-10`}
                        >
                          {activity.status}
                        </span>
                      </div>

                      <p className="text-base-content/80 mb-2">
                        {activity.description}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-base-content/60">
                        <span>{formatTimestamp(activity.timestamp)}</span>
                        <span className="uppercase font-mono text-xs">
                          {activity.type}
                        </span>
                      </div>

                      {/* Additional details for specific activity types */}
                      {activity.type === "trade" && activity.details.symbol && (
                        <div className="mt-3 p-3 bg-base-100 rounded-lg">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-base-content/60">
                                Symbol:
                              </span>
                              <span className="ml-2 font-semibold">
                                {activity.details.symbol}
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/60">
                                Quantity:
                              </span>
                              <span className="ml-2 font-semibold">
                                {activity.details.quantity}
                              </span>
                            </div>
                            <div>
                              <span className="text-base-content/60">
                                Price:
                              </span>
                              <span className="ml-2 font-semibold">
                                ${activity.details.price}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activity.type === "login" &&
                        activity.details.browser && (
                          <div className="mt-3 p-3 bg-base-100 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-base-content/60">
                                  Browser:
                                </span>
                                <span className="ml-2 font-semibold">
                                  {activity.details.browser} on{" "}
                                  {activity.details.os}
                                </span>
                              </div>
                              <div>
                                <span className="text-base-content/60">
                                  IP Address:
                                </span>
                                <span className="ml-2 font-semibold">
                                  {activity.details.ip}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm">
                        <FaEye />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-base-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-primary">
              {activities.filter((a) => a.type === "trade").length}
            </div>
            <div className="text-sm text-base-content/70">
              Trading Activities
            </div>
          </div>
          <div className="bg-base-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-success">
              {activities.filter((a) => a.type === "login").length}
            </div>
            <div className="text-sm text-base-content/70">Login Sessions</div>
          </div>
          <div className="bg-base-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-warning">
              {activities.filter((a) => a.type === "alert").length}
            </div>
            <div className="text-sm text-base-content/70">Alert Triggers</div>
          </div>
          <div className="bg-base-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-info">
              {activities.filter((a) => a.type === "security").length}
            </div>
            <div className="text-sm text-base-content/70">Security Events</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
