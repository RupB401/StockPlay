/**
 * Cookie-based Session Persistence Utility
 * Provides secure HTTP-only cookie support for enhanced security
 */

class CookieManager {
  // Set a cookie with secure options
  static setCookie(name, value, options = {}) {
    const defaults = {
      expires: 30, // 30 days default
      path: '/',
      secure: window.location.protocol === 'https:',
      sameSite: 'Strict'
    };
    
    const cookieOptions = { ...defaults, ...options };
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (cookieOptions.expires) {
      const date = new Date();
      date.setTime(date.getTime() + (cookieOptions.expires * 24 * 60 * 60 * 1000));
      cookieString += `; expires=${date.toUTCString()}`;
    }
    
    if (cookieOptions.path) {
      cookieString += `; path=${cookieOptions.path}`;
    }
    
    if (cookieOptions.secure) {
      cookieString += '; secure';
    }
    
    if (cookieOptions.sameSite) {
      cookieString += `; samesite=${cookieOptions.sameSite}`;
    }
    
    if (cookieOptions.httpOnly) {
      cookieString += '; httponly';
    }
    
    document.cookie = cookieString;
  }
  
  // Get a cookie value
  static getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }
  
  // Delete a cookie
  static deleteCookie(name, path = '/') {
    this.setCookie(name, '', { expires: -1, path });
  }
  
  // Check if cookies are enabled
  static areCookiesEnabled() {
    try {
      this.setCookie('test', 'test', { expires: 1 });
      const enabled = this.getCookie('test') === 'test';
      this.deleteCookie('test');
      return enabled;
    } catch (e) {
      return false;
    }
  }
  
  // Set session preference in cookie (for remember me)
  static setSessionPreference(rememberMe) {
    this.setCookie('session_preference', JSON.stringify({
      rememberMe,
      timestamp: Date.now()
    }), {
      expires: rememberMe ? 30 : 1, // 30 days if remember me, 1 day otherwise
      secure: true,
      sameSite: 'Strict'
    });
  }
  
  // Get session preference from cookie
  static getSessionPreference() {
    try {
      const preference = this.getCookie('session_preference');
      return preference ? JSON.parse(preference) : null;
    } catch (e) {
      return null;
    }
  }
  
  // Clear all session cookies
  static clearSessionCookies() {
    this.deleteCookie('session_preference');
    this.deleteCookie('device_trust');
    this.deleteCookie('session_id');
  }
}

export default CookieManager;
