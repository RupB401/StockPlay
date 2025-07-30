import axios from 'axios';

// Configuration - could be moved to environment variables
const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for centralized error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url
    });
    
    // Handle specific error cases
    if (error.code === 'ECONNREFUSED') {
      console.error('Backend server is not running or unreachable');
    }
    
    return Promise.reject(error);
  }
);

// Health check function
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return { status: 'connected', data: response.data };
  } catch (error) {
    return { status: 'disconnected', error: error.message };
  }
};

// Stock data functions
export const getStockPrice = async (symbol) => {
  try {
    const response = await api.get(`/stock/detail/${symbol}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stock price:", error);
    throw error;
  }
};

export const getStockHistory = async (symbol) => {
  try {
    const response = await api.get(`/stock/historical/${symbol}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stock history:", error);
    throw error;
  }
};

export const getStockAllInfo = async (symbol) => {
  try {
    const response = await api.get(`/stock/detail/${symbol}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stock info:", error);
    throw error;
  }
};

// Enhanced search stocks function with robust fallback system
export const searchStocks = async (query) => {
  try {
    // Return empty array for very short queries
    if (!query || query.trim().length < 1) {
      return [];
    }

    const response = await api.get(`/search?query=${encodeURIComponent(query.trim())}`);
    
    // Ensure we always return an array
    const results = Array.isArray(response.data) ? response.data : [];
    
    // If we got results, return them
    return results;
  } catch (error) {
    console.error("Error searching stocks:", error);
    return [];
  }
};

// ... (rest of the file unchanged, copy all other exports and logic from api.js)

export default api;
