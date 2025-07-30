import React, { createContext, useContext, useState, useEffect } from "react";
import sessionManager from "../utils/sessionManager";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Initialize auth state from session manager
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const sessionData = sessionManager.initializeFromStorage();
        if (sessionData) {
          setToken(sessionData.token);
          setUser(sessionData.user);

          // If remember me is enabled, verify the session is still valid
          if (sessionData.rememberMe) {
            // Trigger a background check to ensure token is still valid
            setTimeout(checkAuth, 100);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Subscribe to session changes (cross-tab sync)
    const unsubscribe = sessionManager.subscribe((event) => {
      if (event.key === "access_token") {
        if (event.newValue) {
          setToken(event.newValue);
          const userData = localStorage.getItem("user_data");
          if (userData) {
            setUser(JSON.parse(userData));
          }
        } else {
          setToken(null);
          setUser(null);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Check auth when token changes or on initialization
  useEffect(() => {
    if (isInitialized && token) {
      checkAuth();
    } else if (isInitialized) {
      setLoading(false);
    }
  }, [token, isInitialized]);

  const checkAuth = async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Store user data for persistence
        localStorage.setItem("user_data", JSON.stringify(userData));
      } else if (response.status === 401) {
        // Token expired, try to refresh
        const refreshResult = await tryRefreshToken();
        if (!refreshResult.success) {
          clearAuth();
        }
      } else {
        // Other error, clear auth
        clearAuth();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const tryRefreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        console.log("No refresh token available");
        return { success: false };
      }

      console.log("Attempting to refresh token...");
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Token refresh successful");

        // Update token in localStorage and state
        localStorage.setItem("access_token", data.access_token);
        setToken(data.access_token);

        // Notify session manager about the token update
        sessionManager.notifyListeners({
          key: "access_token",
          newValue: data.access_token,
        });

        return { success: true };
      } else {
        console.log("Token refresh failed:", response.status);
        return { success: false };
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      return { success: false };
    }
  };

  const clearAuth = () => {
    sessionManager.clearSession();
    setToken(null);
    setUser(null);
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionManager.saveSession(
          data.access_token,
          data.refresh_token,
          data.user,
          rememberMe
        );
        setToken(data.access_token);

        // Use only real user data from backend - no mock data
        const enhancedUser = {
          ...data.user,
          profileImage: data.user.profileImage || null,
          currency: data.user.currency || "USD",
          language: data.user.language || "en",
          theme: data.user.theme || "light",
          // Only use real data from backend - null if not provided
          portfolio: data.user.portfolio || null,
          watchlists: data.user.watchlists || null,
          alerts: data.user.alerts || null,
          activityLog: data.user.activityLog || null,
          loginSessions: data.user.loginSessions || null,
        };

        setUser(enhancedUser);
        return { success: true, user: enhancedUser };
      } else {
        return { success: false, error: data.detail || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error" };
    }
  };

  const oauthLogin = async (accessToken, refreshToken) => {
    try {
      // Get user info using the access token
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        sessionManager.saveSession(
          accessToken,
          refreshToken,
          data,
          true // Remember OAuth users
        );
        setToken(accessToken);

        // Use only real OAuth user data - no mock data
        const enhancedUser = {
          ...data,
          profileImage: data.profileImage || null,
          currency: data.currency || "USD",
          language: data.language || "en",
          theme: data.theme || "light",
          // Only use real data from backend - null if not provided
          portfolio: data.portfolio || null,
          watchlists: data.watchlists || null,
          alerts: data.alerts || null,
          activityLog: data.activityLog || null,
          loginSessions: data.loginSessions || null,
        };

        setUser(enhancedUser);
        return { success: true, user: enhancedUser };
      } else {
        return { success: false, error: "Failed to get user info" };
      }
    } catch (error) {
      console.error("OAuth login error:", error);
      return { success: false, error: "OAuth login failed" };
    }
  };

  const signup = async (email, password, name, rememberMe = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionManager.saveSession(
          data.access_token,
          data.refresh_token,
          data.user,
          rememberMe
        );
        setToken(data.access_token);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.detail || "Signup failed" };
      }
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      console.error("Forgot password error:", error);
      return { success: false, error: "Network error" };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });

      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      console.error("Reset password error:", error);
      return { success: false, error: "Network error" };
    }
  };

  const refreshUser = async () => {
    if (!token) return { success: false };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("user_data", JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error("Refresh user error:", error);
      return { success: false };
    }
  };

  const value = {
    user,
    loading,
    login,
    oauthLogin,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    refreshUser,
    isAuthenticated: !!user,
    token,
    checkAuth,
    tryRefreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
