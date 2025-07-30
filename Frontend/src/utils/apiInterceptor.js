/**
 * API Interceptor for handling authentication and token refresh
 */

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

export const createAuthenticatedRequest = (url, options = {}) => {
  const token = localStorage.getItem("access_token");
  
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  
  return fetch(url, options);
};

export const authenticatedFetch = async (url, options = {}) => {
  try {
    const response = await createAuthenticatedRequest(url, options);
    
    if (response.status === 401) {
      // Token might be expired, try to refresh
      const newToken = await handleTokenRefresh();
      if (newToken) {
        // Retry with new token
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return fetch(url, options);
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
    }
    
    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
};

const handleTokenRefresh = () => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  const refreshToken = localStorage.getItem("refresh_token");
  
  if (!refreshToken) {
    isRefreshing = false;
    processQueue(new Error('No refresh token'), null);
    return Promise.resolve(null);
  }

  return fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Token refresh failed');
      }
    })
    .then(data => {
      localStorage.setItem("access_token", data.access_token);
      processQueue(null, data.access_token);
      return data.access_token;
    })
    .catch(error => {
      console.error('Token refresh error:', error);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");
      processQueue(error, null);
      return null;
    })
    .finally(() => {
      isRefreshing = false;
    });
};

// Utility function for common API endpoints
export const apiEndpoints = {
  wallet: () => authenticatedFetch(`${import.meta.env.VITE_API_URL}/trading/wallet`),
  portfolio: () => authenticatedFetch(`${import.meta.env.VITE_API_URL}/trading/portfolio`),
  stockDetail: (symbol) => authenticatedFetch(`${import.meta.env.VITE_API_URL}/stock/detail/${symbol}`),
  holdings: (symbol) => authenticatedFetch(`${import.meta.env.VITE_API_URL}/trading/holdings/${symbol}`),
  buy: (data) => authenticatedFetch(`${import.meta.env.VITE_API_URL}/trading/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }),
  sell: (data) => authenticatedFetch(`${import.meta.env.VITE_API_URL}/trading/sell`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }),
};
