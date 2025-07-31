import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import {
  FaUser,
  FaEdit,
  FaSave,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaCheck,
} from "react-icons/fa";

const ProfilePage = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    timezone: "",
    bio: "",
    joinDate: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [tradingPreferences, setTradingPreferences] = useState({
    defaultOrderType: "market",
    riskTolerance: "moderate",
    investmentStyle: "growth",
    preferredSectors: ["Technology", "Healthcare", "Finance"],
    defaultPositionSize: "1000",
    stopLossDefault: "5",
    takeProfitDefault: "10",
  });

  const handleProfileChange = (e) => {
    setProfileData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordChange = (e) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleTradingPrefChange = (e) => {
    setTradingPreferences((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveProfile = () => {
    // Save to user-specific localStorage keys
    const userKey = `stockplay_profile_${user?.id || user?.email}`;
    const prefsKey = `stockplay_trading_prefs_${user?.id || user?.email}`;

    localStorage.setItem(userKey, JSON.stringify(profileData));
    localStorage.setItem(prefsKey, JSON.stringify(tradingPreferences));
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert("Password must be at least 8 characters long!");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: passwordData.currentPassword,
            new_password: passwordData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Password updated successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswordChange(false);
      } else {
        alert(data.detail || "Failed to change password");
      }
    } catch (error) {
      console.error("Password change error:", error);
      alert("Failed to change password. Please try again.");
    }
  };

  // Load saved data on mount and when user changes
  useEffect(() => {
    if (!user) return;

    // Use user-specific localStorage keys
    const userKey = `stockplay_profile_${user.id || user.email}`;
    const prefsKey = `stockplay_trading_prefs_${user.id || user.email}`;

    const savedProfile = localStorage.getItem(userKey);
    const savedPrefs = localStorage.getItem(prefsKey);

    // Set profile data from authenticated user
    setProfileData({
      firstName: user.first_name || user.name?.split(" ")[0] || "",
      lastName: user.last_name || user.name?.split(" ")[1] || "",
      email: user.email || "",
      phone: user.phone || "",
      country: user.country || "",
      timezone: user.timezone || "",
      bio: user.bio || "",
      joinDate: user.created_at
        ? new Date(user.created_at).toISOString().split("T")[0]
        : "",
      ...(savedProfile ? JSON.parse(savedProfile) : {}),
    });

    if (savedPrefs) {
      setTradingPreferences({
        ...tradingPreferences,
        ...JSON.parse(savedPrefs),
      });
    }
  }, [user]);

  return (
    <div
      className={`min-h-screen p-4 pt-20 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1
            className={`text-3xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Profile
          </h1>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaSave /> Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaEdit /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Personal Information */}
            <div
              className={`p-6 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Country
                  </label>
                  <select
                    name="country"
                    value={profileData.country}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Japan">Japan</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={profileData.timezone}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="Eastern Time (ET)">Eastern Time (ET)</option>
                    <option value="Central Time (CT)">Central Time (CT)</option>
                    <option value="Mountain Time (MT)">
                      Mountain Time (MT)
                    </option>
                    <option value="Pacific Time (PT)">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md ${
                    isEditing
                      ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      : "cursor-not-allowed opacity-60"
                  } ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            {/* Trading Preferences */}
            <div
              className={`p-6 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Trading Preferences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Default Order Type
                  </label>
                  <select
                    name="defaultOrderType"
                    value={tradingPreferences.defaultOrderType}
                    onChange={handleTradingPrefChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="market">Market Order</option>
                    <option value="limit">Limit Order</option>
                    <option value="stop">Stop Order</option>
                    <option value="stop-limit">Stop-Limit Order</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Risk Tolerance
                  </label>
                  <select
                    name="riskTolerance"
                    value={tradingPreferences.riskTolerance}
                    onChange={handleTradingPrefChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Investment Style
                  </label>
                  <select
                    name="investmentStyle"
                    value={tradingPreferences.investmentStyle}
                    onChange={handleTradingPrefChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="value">Value Investing</option>
                    <option value="growth">Growth Investing</option>
                    <option value="dividend">Dividend Investing</option>
                    <option value="momentum">Momentum Trading</option>
                    <option value="swing">Swing Trading</option>
                    <option value="day">Day Trading</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Default Position Size ($)
                  </label>
                  <input
                    type="number"
                    name="defaultPositionSize"
                    value={tradingPreferences.defaultPositionSize}
                    onChange={handleTradingPrefChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Default Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    name="stopLossDefault"
                    value={tradingPreferences.stopLossDefault}
                    onChange={handleTradingPrefChange}
                    disabled={!isEditing}
                    step="0.1"
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Default Take Profit (%)
                  </label>
                  <input
                    type="number"
                    name="takeProfitDefault"
                    value={tradingPreferences.takeProfitDefault}
                    onChange={handleTradingPrefChange}
                    disabled={!isEditing}
                    step="0.1"
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div
              className={`p-6 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Security
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p
                      className={`font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Password
                    </p>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Last changed 30 days ago
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
                </div>

                {showPasswordChange && (
                  <form
                    onSubmit={handlePasswordSubmit}
                    className="space-y-4 mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isDark
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className={`absolute right-3 top-2.5 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isDark
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute right-3 top-2.5 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDark
                            ? "bg-gray-600 border-gray-500 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Update Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPasswordChange(false)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          isDark
                            ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
