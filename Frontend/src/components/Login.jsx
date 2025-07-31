import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaGoogle, FaGithub } from "react-icons/fa";
import LoginAlert from "./LoginAlert";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Currency symbols and animation logic from landing page
  const symbolRef = useRef([]);
  const count = 20;
  const symbols = [
    "$",
    "₹",
    "¥",
    "€",
    "Ξ",
    "₮",
    "₩",
    "₽",
    "£",
    "₱",
    "₫",
    "₦",
    "₲",
    "₵",
    "₣",
    "₡",
    "₭",
    "₮",
    "₯",
  ];
  const velocities = useRef([]);

  // Generate stable particles that don't change on re-render
  const [dotParticles] = useState(() => {
    const colors = [
      "rgba(239, 68, 68, 0.7)", // Red
      "rgba(34, 197, 94, 0.7)", // Green
      "rgba(59, 130, 246, 0.7)", // Blue
      "rgba(168, 85, 247, 0.7)", // Purple
      "rgba(249, 115, 22, 0.7)", // Orange
      "rgba(236, 72, 153, 0.7)", // Pink
      "rgba(14, 165, 233, 0.7)", // Light blue
      "rgba(234, 179, 8, 0.7)", // Yellow
    ];

    return Array.from({ length: 50 }, (_, i) => ({
      id: `dot-${i}`,
      size: Math.random() * 12 + 4,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 10,
      animationDuration: Math.random() * 10 + 15,
      initialColor: colors[Math.floor(Math.random() * colors.length)],
      animationType: Math.random() > 0.3 ? "pulse" : "float",
      opacity: 0.7 + Math.random() * 0.3,
    }));
  });

  // Generate stable currency symbol particles that don't change on re-render
  const [currencyParticles] = useState(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: `sym-${i}`,
      left:
        Math.random() *
        (typeof window !== "undefined" ? window.innerWidth : 1200),
      top:
        Math.random() *
        (typeof window !== "undefined" ? window.innerHeight : 800),
      color: ["#ef4444", "#22c55e", "#a855f7", "#f97316"][i % 4],
      symbol: symbols[i % symbols.length],
    }));
  });

  const { login, signup, forgotPassword, resetPassword, oauthLogin } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/explore";

  // Currency symbols animation effect
  useEffect(() => {
    symbolRef.current = symbolRef.current.slice(0, count);
    velocities.current = Array.from({ length: count }, () => ({
      dx: (Math.random() - 0.5) * 1.5,
      dy: (Math.random() - 0.5) * 1.5,
    }));

    let animationId;
    const animate = () => {
      symbolRef.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const parent = el.parentElement.getBoundingClientRect();

        let left = parseFloat(el.style.left) || 0;
        let top = parseFloat(el.style.top) || 0;

        left += velocities.current[i].dx;
        top += velocities.current[i].dy;

        if (left <= 0 || left >= parent.width - rect.width) {
          velocities.current[i].dx = -velocities.current[i].dx;
        }
        if (top <= 0 || top >= parent.height - rect.height) {
          velocities.current[i].dy = -velocities.current[i].dy;
        }

        el.style.left = `${Math.max(
          0,
          Math.min(parent.width - rect.width, left)
        )}px`;
        el.style.top = `${Math.max(
          0,
          Math.min(parent.height - rect.height, top)
        )}px`;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (showForgotPassword) {
        if (!otpSent) {
          // Send OTP
          const result = await forgotPassword(email);
          if (result.success) {
            setOtpSent(true);
            setSuccess("OTP sent to your email");
          } else {
            setError(result.error || "Failed to send OTP");
          }
        } else {
          // Reset password
          if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
          }
          const result = await resetPassword(email, otp, newPassword);
          if (result.success) {
            setSuccess("Password reset successfully");
            setShowForgotPassword(false);
            setOtpSent(false);
            setIsLogin(true);
          } else {
            setError(result.error || "Failed to reset password");
          }
        }
      } else if (isLogin) {
        // Login
        const result = await login(email, password);
        if (result.success) {
          navigate(from, { replace: true });
        } else {
          setError(result.error);
        }
      } else {
        // Signup
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        const result = await signup(email, password, name);
        if (result.success) {
          navigate(from, { replace: true });
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setOtpSent(false);
  };

  const switchMode = () => {
    resetForm();
    setIsLogin(!isLogin);
    setShowForgotPassword(false);
  };

  const handleForgotPassword = () => {
    resetForm();
    setShowForgotPassword(true);
    setIsLogin(false);
  };

  const backToLogin = () => {
    resetForm();
    setShowForgotPassword(false);
    setIsLogin(true);
    setOtpSent(false); // Make sure to reset OTP state
  };

  // OAuth login functions
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(""); // Clear any previous errors

      // Redirect to backend OAuth endpoint
      const apiUrl = import.meta.env.VITE_API_URL;
      console.log("Redirecting to:", `${apiUrl}/auth/google`);
      window.location.href = `${apiUrl}/auth/google`;
    } catch (error) {
      console.error("Error initiating Google login:", error);
      setError(`Failed to start Google login: ${error.message}`);
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      setError(""); // Clear any previous errors

      // Redirect to backend OAuth endpoint
      const apiUrl = import.meta.env.VITE_API_URL;
      console.log("Redirecting to:", `${apiUrl}/auth/github`);
      window.location.href = `${apiUrl}/auth/github`;
    } catch (error) {
      console.error("Error initiating GitHub login:", error);
      setError(`Failed to start GitHub login: ${error.message}`);
      setLoading(false);
    }
  };

  // Handle OAuth callback (when user returns from OAuth provider)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const refreshToken = urlParams.get("refresh_token");
    const error = urlParams.get("error");

    if (token && refreshToken) {
      // OAuth login successful
      setLoading(true);

      // Use the AuthContext's OAuth login method
      oauthLogin(token, refreshToken)
        .then((result) => {
          if (result.success) {
            // Clear URL params
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            navigate(from, { replace: true });
          } else {
            setError(result.error || "OAuth login failed");
            setLoading(false);
            // Clear URL params
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        })
        .catch((err) => {
          console.error("OAuth login error:", err);
          setError("OAuth login failed");
          setLoading(false);
          // Clear URL params
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        });
    } else if (error) {
      setError(decodeURIComponent(error));
      setLoading(false);
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate, from, oauthLogin]);

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center text-center px-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <LoginAlert />

      {/* Gradient background - same as landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-300 to-blue-400 bg-[length:300%_300%] animate-[gradientMove_10s_ease-in-out_infinite] z-0" />

      {/* Dot Particles - same as landing page */}
      {dotParticles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.initialColor,
            boxShadow: "0 0 15px rgba(255, 255, 255, 0.4)",
            animation:
              particle.animationType === "float"
                ? `float ${
                    particle.animationDuration
                  }s linear infinite, colorShift ${
                    particle.animationDuration * 0.8
                  }s ease-in-out infinite`
                : `pulse ${
                    particle.animationDuration * 0.6
                  }s ease-in-out infinite, float ${
                    particle.animationDuration
                  }s linear infinite`,
            animationDelay: `0s, ${particle.animationDelay}s`,
            opacity: particle.opacity,
          }}
        />
      ))}

      {/* Currency Symbol Particles - same as landing page */}
      {currencyParticles.map((particle, i) => (
        <div
          key={particle.id}
          ref={(el) => (symbolRef.current[i] = el)}
          className="absolute font-bold text-2xl pointer-events-none select-none drop-shadow"
          style={{
            left: `${particle.left}px`,
            top: `${particle.top}px`,
            color: particle.color,
          }}
        >
          {particle.symbol}
        </div>
      ))}

      {/* Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {showForgotPassword
                ? "Reset Password"
                : isLogin
                ? "Welcome Back"
                : "Join StockPlay"}
            </h1>
            <p className="text-white/70">
              {showForgotPassword
                ? "Enter your email to reset your password"
                : isLogin
                ? "Sign in to your account"
                : "Create your account"}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-100 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-100 text-sm">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !showForgotPassword && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            {showForgotPassword && otpSent && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                  placeholder="Enter 6-digit OTP"
                  required
                />
              </div>
            )}

            {!showForgotPassword && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            )}

            {/* Forgot Password Button Only */}
            {(isLogin || !showForgotPassword) && (
              <div className="flex items-center justify-end">
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-white/70 hover:text-white text-sm transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {showForgotPassword && otpSent && (
              <>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </>
            )}

            {!isLogin && !showForgotPassword && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-300 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Processing..."
                : showForgotPassword
                ? otpSent
                  ? "Reset Password"
                  : "Send OTP"
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-3">
            {showForgotPassword ? (
              <button
                onClick={backToLogin}
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                Back to login
              </button>
            ) : (
              <p className="text-white/70 text-sm">
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={switchMode}
                  className="text-white hover:text-purple-200 font-medium transition-colors"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            )}
          </div>

          {/* OAuth Buttons */}
          {!showForgotPassword && (
            <div className="mt-6 space-y-3">
              <div className="text-center text-white/50 text-sm">
                or continue with
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  disabled={loading}
                  className="flex-1 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGoogleLogin}
                >
                  <FaGoogle className="text-lg" />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="flex-1 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGithubLogin}
                >
                  <FaGithub className="text-lg" />
                  <span>GitHub</span>
                </button>
              </div>
              <p className="text-xs text-white/40 text-center mt-2">
                Sign in with your existing Google or GitHub account for quick
                access
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 0%; }
          25% { background-position: 50% 25%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 75%; }
          100% { background-position: 0% 100%; }
        }
        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.7; }
          25% { transform: translate(30px, -20px) rotate(90deg); opacity: 1; }
          50% { transform: translate(-15px, 25px) rotate(180deg); opacity: 0.8; }
          75% { transform: translate(25px, -30px) rotate(270deg); opacity: 1; }
          100% { transform: translate(0, 0) rotate(360deg); opacity: 0.7; }
        }
        @keyframes colorShift {
          0% { background-color: rgba(239, 68, 68, 0.7); }
          25% { background-color: rgba(34, 197, 94, 0.7); }
          50% { background-color: rgba(168, 85, 247, 0.7); }
          75% { background-color: rgba(249, 115, 22, 0.7); }
          100% { background-color: rgba(239, 68, 68, 0.7); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default Login;
