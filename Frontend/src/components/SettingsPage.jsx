import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import {
  MdNotifications,
  MdVisibility,
  MdLock,
  MdPalette,
  MdBarChart,
  MdPublic,
  MdStorage,
  MdSecurity,
  MdToggleOn,
  MdToggleOff,
  MdDelete,
  MdDownload,
  MdUpload,
  MdVolumeUp,
  MdVolumeOff,
  MdPerson,
  MdCheck,
} from "react-icons/md";

const SettingsPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  const {
    settings: notificationSettings,
    setSettings: setNotificationSettings,
    sendTestNotification,
    requestNotificationPermission,
    showNotification,
  } = useNotifications();

  const [settings, setSettings] = useState({
    // Display Settings
    theme: isDark ? "dark" : "light",
    language: user?.language || "en",
    currency: user?.currency || "USD",
    dateFormat: user?.dateFormat || "MM/DD/YYYY",
    timeFormat: user?.timeFormat || "12h",

    // Trading Settings
    confirmTrades: user?.tradingPreferences?.confirmTrades ?? true,
    paperTradingMode: user?.tradingPreferences?.paperTradingMode ?? false,
    showPaperTradingWarning: true,
    autoRefreshInterval: user?.tradingPreferences?.autoRefreshInterval || 5, // seconds
    defaultChartInterval:
      user?.tradingPreferences?.defaultChartInterval || "1D",
    showExtendedHours: user?.tradingPreferences?.showExtendedHours ?? true,

    // Privacy Settings
    publicProfile: user?.privacy?.publicProfile ?? false,
    shareWatchlists: user?.privacy?.shareWatchlists ?? false,
    sharePortfolio: user?.privacy?.sharePortfolio ?? false,
    analyticsOptOut: user?.privacy?.analyticsOptOut ?? false,

    // Data & Storage
    cacheEnabled: true,
    offlineMode: false,
    syncAcrossDevices: user?.syncAcrossDevices ?? true,
    dataRetention: user?.dataRetention || "1year",

    // Advanced
    developerMode: user?.developerMode ?? false,
    betaFeatures: user?.betaFeatures ?? false,
    apiRateLimit: user?.apiRateLimit || 100,
  });

  const [exportData, setExportData] = useState({
    includePortfolio: true,
    includeWatchlists: true,
    includeAlerts: true,
    includeSettings: false,
    includeActivity: false,
  });

  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    loading: false,
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("stockplay_settings");
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  }, []);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("stockplay_settings", JSON.stringify(newSettings));

    // Handle special cases
    if (key === "theme") {
      if ((value === "dark" && !isDark) || (value === "light" && isDark)) {
        toggleTheme();
      }
    }
  };

  const handleNotificationSettingChange = (key, value) => {
    setNotificationSettings({ ...notificationSettings, [key]: value });
  };

  const handleExportData = () => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      user: {
        name: user?.name,
        email: user?.email,
        memberSince: user?.createdAt,
      },
      settings: exportData.includeSettings ? settings : null,
      portfolio:
        exportData.includePortfolio && user?.portfolio ? user.portfolio : null,
      watchlists:
        exportData.includeWatchlists && user?.watchlists
          ? user.watchlists
          : null,
      alerts: exportData.includeAlerts && user?.alerts ? user.alerts : null,
      activity:
        exportData.includeActivity && user?.activityLog
          ? user.activityLog
          : null,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stockplay-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData.settings) {
            setSettings({ ...settings, ...importedData.settings });
            localStorage.setItem(
              "stockplay_settings",
              JSON.stringify({ ...settings, ...importedData.settings })
            );
          }
          alert("Data imported successfully!");
        } catch (error) {
          alert("Error importing data. Please check the file format.");
        }
      };
      reader.readAsText(file);
    }
  };

  const clearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This action cannot be undone."
      )
    ) {
      localStorage.clear();
      sessionStorage.clear();
      alert("All data has been cleared. Please refresh the page.");
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    if (passwordChange.newPassword.length < 6) {
      alert("New password must be at least 6 characters long");
      return;
    }

    setPasswordChange({ ...passwordChange, loading: true });

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        "http://localhost:8000/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: passwordChange.currentPassword,
            new_password: passwordChange.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Password changed successfully!");
        setPasswordChange({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          loading: false,
        });
      } else {
        throw new Error(data.detail || "Failed to change password");
      }
    } catch (error) {
      console.error("Password change error:", error);
      alert(error.message || "Failed to change password");
    } finally {
      setPasswordChange({ ...passwordChange, loading: false });
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${checked ? "bg-blue-600" : "bg-gray-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  const SettingSection = ({ title, icon, children }) => (
    <div
      className={`p-6 rounded-lg border ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`text-xl ${isDark ? "text-blue-400" : "text-blue-600"}`}
        >
          {icon}
        </div>
        <h3
          className={`text-lg font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );

  const SettingRow = ({ label, description, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex-1">
        <div
          className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {label}
        </div>
        {description && (
          <div
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            {description}
          </div>
        )}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );

  return (
    <div
      className={`min-h-screen p-4 pt-20 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <h1
          className={`text-3xl font-bold mb-8 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Settings
        </h1>

        <div className="space-y-8">
          {/* Profile Settings */}
          <SettingSection title="Profile" icon={<MdPerson />}>
            <div className="space-y-4">
              {/* Change Password */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4
                  className={`font-medium mb-3 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Change Password
                </h4>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div>
                    <input
                      type="password"
                      placeholder="Current Password"
                      value={passwordChange.currentPassword}
                      onChange={(e) =>
                        setPasswordChange({
                          ...passwordChange,
                          currentPassword: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="New Password"
                      value={passwordChange.newPassword}
                      onChange={(e) =>
                        setPasswordChange({
                          ...passwordChange,
                          newPassword: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      value={passwordChange.confirmPassword}
                      onChange={(e) =>
                        setPasswordChange({
                          ...passwordChange,
                          confirmPassword: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordChange.loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {passwordChange.loading ? "Changing..." : "Change Password"}
                  </button>
                </form>
              </div>
            </div>
          </SettingSection>

          {/* Display Settings */}
          <SettingSection title="Display" icon={<MdPalette />}>
            <SettingRow
              label="Theme"
              description="Choose your preferred color scheme"
            >
              <select
                value={settings.theme}
                onChange={(e) => handleSettingChange("theme", e.target.value)}
                className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Language"
              description="Select your preferred language"
            >
              <select
                value={settings.language}
                onChange={(e) =>
                  handleSettingChange("language", e.target.value)
                }
                className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Currency"
              description="Default currency for displaying prices"
            >
              <select
                value={settings.currency}
                onChange={(e) =>
                  handleSettingChange("currency", e.target.value)
                }
                className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </SettingRow>
          </SettingSection>

          {/* Trading Settings */}
          <SettingSection title="Trading" icon={<MdBarChart />}>
            <SettingRow
              label="Confirm Trades"
              description="Require confirmation before executing trades"
            >
              <ToggleSwitch
                checked={settings.confirmTrades}
                onChange={(value) =>
                  handleSettingChange("confirmTrades", value)
                }
              />
            </SettingRow>
            <SettingRow
              label="Paper Trading Mode"
              description="Practice trading with virtual money"
            >
              <ToggleSwitch
                checked={settings.paperTradingMode}
                onChange={(value) =>
                  handleSettingChange("paperTradingMode", value)
                }
              />
            </SettingRow>
            <SettingRow
              label="Auto Refresh Interval"
              description="How often to refresh stock prices (seconds)"
            >
              <select
                value={settings.autoRefreshInterval}
                onChange={(e) =>
                  handleSettingChange(
                    "autoRefreshInterval",
                    parseInt(e.target.value)
                  )
                }
                className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value={1}>1 second</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Show Extended Hours"
              description="Display pre-market and after-hours trading data"
            >
              <ToggleSwitch
                checked={settings.showExtendedHours}
                onChange={(value) =>
                  handleSettingChange("showExtendedHours", value)
                }
              />
            </SettingRow>
          </SettingSection>

          {/* Data & Storage */}
          <SettingSection title="Data & Storage" icon={<MdStorage />}>
            <SettingRow
              label="Enable Caching"
              description="Cache data locally for faster loading"
            >
              <ToggleSwitch
                checked={settings.cacheEnabled}
                onChange={(value) => handleSettingChange("cacheEnabled", value)}
              />
            </SettingRow>
            <SettingRow
              label="Sync Across Devices"
              description="Synchronize settings and data across your devices"
            >
              <ToggleSwitch
                checked={settings.syncAcrossDevices}
                onChange={(value) =>
                  handleSettingChange("syncAcrossDevices", value)
                }
              />
            </SettingRow>
            <SettingRow
              label="Data Retention"
              description="How long to keep your trading data"
            >
              <select
                value={settings.dataRetention}
                onChange={(e) =>
                  handleSettingChange("dataRetention", e.target.value)
                }
                className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="3months">3 months</option>
                <option value="6months">6 months</option>
                <option value="1year">1 year</option>
                <option value="2years">2 years</option>
                <option value="forever">Forever</option>
              </select>
            </SettingRow>

            {/* Export/Import Data */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4
                className={`font-medium mb-3 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Data Management
              </h4>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportData.includePortfolio}
                      onChange={(e) =>
                        setExportData({
                          ...exportData,
                          includePortfolio: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Portfolio
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportData.includeWatchlists}
                      onChange={(e) =>
                        setExportData({
                          ...exportData,
                          includeWatchlists: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Watchlists
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportData.includeAlerts}
                      onChange={(e) =>
                        setExportData({
                          ...exportData,
                          includeAlerts: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Alerts
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportData.includeSettings}
                      onChange={(e) =>
                        setExportData({
                          ...exportData,
                          includeSettings: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Settings
                    </span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <MdDownload /> Export Data
                  </button>
                  <button
                    onClick={clearAllData}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <MdDelete /> Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </SettingSection>

          {/* Advanced Settings */}
          <SettingSection title="Advanced" icon={<MdLock />}>
            <SettingRow
              label="Developer Mode"
              description="Enable advanced debugging features"
            >
              <ToggleSwitch
                checked={settings.developerMode}
                onChange={(value) =>
                  handleSettingChange("developerMode", value)
                }
              />
            </SettingRow>
            <SettingRow
              label="Beta Features"
              description="Enable experimental features (may be unstable)"
            >
              <ToggleSwitch
                checked={settings.betaFeatures}
                onChange={(value) => handleSettingChange("betaFeatures", value)}
              />
            </SettingRow>
            <SettingRow
              label="API Rate Limit"
              description="Maximum API requests per minute"
            >
              <select
                value={settings.apiRateLimit}
                onChange={(e) =>
                  handleSettingChange("apiRateLimit", parseInt(e.target.value))
                }
                className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value={50}>50 requests/min</option>
                <option value={100}>100 requests/min</option>
                <option value={200}>200 requests/min</option>
                <option value={500}>500 requests/min</option>
              </select>
            </SettingRow>
          </SettingSection>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
