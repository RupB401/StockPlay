import React, { useState, useEffect } from "react";
import {
  FaShieldAlt,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const SecurityLogin = () => {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);

  // Password strength checker
  useEffect(() => {
    const password = passwords.newPassword;
    let strength = 0;

    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
    if (password.match(/\d/)) strength += 1;
    if (password.match(/[^a-zA-Z\d]/)) strength += 1;

    setPasswordStrength(strength);
  }, [passwords.newPassword]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { text: "Weak", color: "text-error" };
      case 2:
        return { text: "Fair", color: "text-warning" };
      case 3:
        return { text: "Good", color: "text-info" };
      case 4:
        return { text: "Strong", color: "text-success" };
      default:
        return { text: "Weak", color: "text-error" };
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert("New passwords do not match");
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      alert("Password updated successfully");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FaShieldAlt className="text-2xl text-primary" />
            <h1 className="text-3xl font-bold">Security & Login</h1>
          </div>
          <p className="text-base-content/70">
            Manage your account security, password, and active sessions
          </p>
        </div>

        {/* Password Change Form */}
        <div className="bg-base-200 rounded-xl p-6">
          <div>
            <h2 className="text-xl font-semibold mb-6">Change Password</h2>

            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              {/* Current Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Current Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    className="input input-bordered w-full pr-12"
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => togglePasswordVisibility("current")}
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    className="input input-bordered w-full pr-12"
                    placeholder="Enter your new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => togglePasswordVisibility("new")}
                  >
                    {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {passwords.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">Password Strength:</span>
                      <span
                        className={`text-sm font-semibold ${
                          getPasswordStrengthText().color
                        }`}
                      >
                        {getPasswordStrengthText().text}
                      </span>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength === 1
                            ? "bg-error w-1/4"
                            : passwordStrength === 2
                            ? "bg-warning w-2/4"
                            : passwordStrength === 3
                            ? "bg-info w-3/4"
                            : passwordStrength === 4
                            ? "bg-success w-full"
                            : "w-0"
                        }`}
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="mt-3 space-y-1">
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          passwords.newPassword.length >= 8
                            ? "text-success"
                            : "text-base-content/60"
                        }`}
                      >
                        {passwords.newPassword.length >= 8 ? (
                          <FaCheck />
                        ) : (
                          <FaTimes />
                        )}
                        At least 8 characters
                      </div>
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          passwords.newPassword.match(/[a-z]/) &&
                          passwords.newPassword.match(/[A-Z]/)
                            ? "text-success"
                            : "text-base-content/60"
                        }`}
                      >
                        {passwords.newPassword.match(/[a-z]/) &&
                        passwords.newPassword.match(/[A-Z]/) ? (
                          <FaCheck />
                        ) : (
                          <FaTimes />
                        )}
                        Mix of uppercase and lowercase
                      </div>
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          passwords.newPassword.match(/\d/)
                            ? "text-success"
                            : "text-base-content/60"
                        }`}
                      >
                        {passwords.newPassword.match(/\d/) ? (
                          <FaCheck />
                        ) : (
                          <FaTimes />
                        )}
                        At least one number
                      </div>
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          passwords.newPassword.match(/[^a-zA-Z\d]/)
                            ? "text-success"
                            : "text-base-content/60"
                        }`}
                      >
                        {passwords.newPassword.match(/[^a-zA-Z\d]/) ? (
                          <FaCheck />
                        ) : (
                          <FaTimes />
                        )}
                        At least one special character
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    className="input input-bordered w-full pr-12"
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => togglePasswordVisibility("confirm")}
                  >
                    {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {passwords.confirmPassword &&
                  passwords.newPassword !== passwords.confirmPassword && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        Passwords do not match
                      </span>
                    </label>
                  )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  loading ||
                  passwords.newPassword !== passwords.confirmPassword ||
                  passwordStrength < 2
                }
              >
                {loading ? (
                  <span className="loading loading-spinner"></span>
                ) : null}
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityLogin;
