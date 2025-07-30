/**
 * Session Persistence Utility
 * Handles cross-tab session synchronization and persistent login
 */

import CookieManager from './cookieManager';

class SessionManager {
  constructor() {
    this.listeners = new Set();
    this.initializeEventListeners();
    this.setupAutoLogout();
  }

  initializeEventListeners() {
    // Listen for storage changes across tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'access_token' || e.key === 'user_data') {
        this.notifyListeners(e);
      }
    });

    // Listen for focus events to check session validity
    window.addEventListener('focus', () => {
      this.checkSessionValidity();
    });

    // Listen for beforeunload to save session state
    window.addEventListener('beforeunload', () => {
      this.saveSessionState();
    });

    // Listen for visibility change to pause/resume auto-refresh
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAutoRefresh();
      } else {
        this.resumeAutoRefresh();
      }
    });

    // Periodic session check (every 5 minutes)
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, 5 * 60 * 1000);
  }

  // Subscribe to session changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of session changes
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Session listener error:', error);
      }
    });
  }

  // Check if session is still valid
  async checkSessionValidity() {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    // Check device fingerprint for security
    const isSecure = await this.validateSessionSecurity();
    if (!isSecure) {
      this.clearSession();
      return false;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          const refreshed = await this.tryRefreshToken();
          return refreshed;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  // Try to refresh the access token with better error handling
  async tryRefreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.showSessionError('Session expired: No refresh token found. Please log in again.');
      return false;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        this.notifyListeners({ key: 'access_token', newValue: data.access_token });
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || 'Session refresh failed. Please log in again.';
        this.showSessionError(errorMsg);
        this.clearSession();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.showSessionError('Network error during session refresh. Please check your connection and log in again.');
      this.clearSession();
      return false;
    }
  }

  // Clear session data
  clearSession() {
    // Get user data before clearing to remove user-specific data
    const userData = localStorage.getItem('user_data');
    let userId = null;
    let userEmail = null;
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
        userEmail = user.email;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('device_fingerprint');
    localStorage.removeItem('session_created');
    localStorage.removeItem('session_state');
    
    // Clear user-specific profile data
    if (userId || userEmail) {
      const userKey = userId || userEmail;
      localStorage.removeItem(`stockplay_profile_${userKey}`);
      localStorage.removeItem(`stockplay_trading_prefs_${userKey}`);
    }
    
    // Also clear old format data (for backward compatibility)
    localStorage.removeItem('stockplay_profile');
    localStorage.removeItem('stockplay_trading_prefs');
    
    // Clear session cookies
    CookieManager.clearSessionCookies();
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    
    this.notifyListeners({ key: 'access_token', newValue: null });
  }

  // Get current session state
  getSessionState() {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    return {
      isAuthenticated: !!token,
      token,
      user: userData ? JSON.parse(userData) : null,
    };
  }

  // Save session data
  saveSession(token, refreshToken, userData, rememberMe = false) {
    this.rememberMe = rememberMe;
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
    localStorage.setItem('remember_me', rememberMe.toString());
    
    // Set device fingerprint for security
    const fingerprint = JSON.stringify(this.getDeviceFingerprint());
    localStorage.setItem('device_fingerprint', fingerprint);
    
    // Set session timestamp
    localStorage.setItem('session_created', Date.now().toString());
    
    // Save session preference in cookie for cross-browser persistence
    CookieManager.setSessionPreference(rememberMe);
    
    this.resetInactivityTimer();
    
    this.notifyListeners({ key: 'access_token', newValue: token });
  }

  // Initialize session from storage (for app startup)
  initializeFromStorage() {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    
    if (token && userData) {
      this.rememberMe = rememberMe;
      // Validate session in background
      this.checkSessionValidity();
      return {
        token,
        user: JSON.parse(userData),
        rememberMe,
      };
    }
    
    return null;
  }

  // Setup auto-logout functionality
  setupAutoLogout() {
    this.lastActivity = Date.now();
    this.inactivityTimer = null;
    
    // Track user activity
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const updateActivity = () => {
      this.lastActivity = Date.now();
      this.resetInactivityTimer();
    };
    
    activities.forEach(activity => {
      document.addEventListener(activity, updateActivity, true);
    });
    
    this.resetInactivityTimer();
  }

  // Reset inactivity timer
  resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    // Auto-logout after 2 hours of inactivity (unless "Remember Me" is enabled)
    const inactivityTimeout = this.rememberMe ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
    
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivityLogout();
    }, inactivityTimeout);
  }

  // Handle logout due to inactivity
  handleInactivityLogout() {
    console.log('Session expired due to inactivity');
    this.clearSession();
    window.location.href = '/login?reason=timeout';
  }

  // Pause auto-refresh when tab is hidden
  pauseAutoRefresh() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
  }

  // Resume auto-refresh when tab becomes visible
  resumeAutoRefresh() {
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, 5 * 60 * 1000);
  }

  // Save current session state
  saveSessionState() {
    const sessionState = {
      lastActivity: this.lastActivity,
      rememberMe: this.rememberMe,
      timestamp: Date.now(),
    };
    localStorage.setItem('session_state', JSON.stringify(sessionState));
  }

  // Set remember me preference
  setRememberMe(remember) {
    this.rememberMe = remember;
    localStorage.setItem('remember_me', remember.toString());
    this.resetInactivityTimer();
  }

  // Get device fingerprint for enhanced security
  getDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvasFingerprint: canvas.toDataURL(),
    };
  }

  // Enhanced session validation with device fingerprint (relaxed: only warn, do not force logout)
  async validateSessionSecurity() {
    const storedFingerprint = localStorage.getItem('device_fingerprint');
    const currentFingerprint = JSON.stringify(this.getDeviceFingerprint());
    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      // Only warn, do not force logout
      console.warn('Device fingerprint mismatch - potential security risk');
      // Optionally, show a toast or UI warning here
      // return false; // Do not force logout
    }
    if (!storedFingerprint) {
      localStorage.setItem('device_fingerprint', currentFingerprint);
    }
    return true;
  }

  // Extend current session by getting new tokens
  async extendSession() {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/session/extend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        this.resetInactivityTimer();
        this.notifyListeners({ key: 'access_token', newValue: data.access_token });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Session extend error:', error);
      return false;
    }
  }

  // Get comprehensive session information
  async getSessionInfo() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/session/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Get session info error:', error);
      return null;
    }
  }

  // Check if session is persistent (remember me was enabled)
  isPersistentSession() {
    const cookiePreference = CookieManager.getSessionPreference();
    return cookiePreference?.rememberMe || localStorage.getItem('remember_me') === 'true';
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;
