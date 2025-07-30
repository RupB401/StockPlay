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
    if (!query || query.trim().length < 1) {
      return [];
    }
    const response = await api.get(`/search?query=${encodeURIComponent(query.trim())}`);
    const results = Array.isArray(response.data) ? response.data : [];
    return results;
  } catch (error) {
    console.error("Error searching stocks:", error);
    return [];
  }
};

// --- Restored API exports from old api.js ---
export const getPopularStocks = async (limit = 10) => {
  const response = await api.get(`/popular-stocks?limit=${limit}`);
  // Support both array and paginated object
  return response.data.stocks || response.data || [];
};

export const getMarketIndices = async () => {
  const response = await api.get('/market-indices');
  return response.data;
};

export const getTopPerformers = async (cap = 'large') => {
  const response = await api.get(`/top-performers?cap=${cap}`);
  return response.data;
};

export const getUpcomingIPOs = async () => {
  const response = await api.get('/ipos/upcoming');
  return response.data;
};

export const getStockNews = async (symbol, limit = 5) => {
  const response = await api.get(`/stock/news/${symbol}?limit=${limit}`);
  return response.data;
};

export const getAllStocks = async () => {
  const response = await api.get('/all-stocks');
  return response.data;
};

export const browseAllStocks = async (page = 1, limit = 40, sector = null, market_cap = null) => {
  const params = { page, limit };
  if (sector) params.sector = sector;
  if (market_cap) params.market_cap = market_cap;
  const response = await api.get('/browse-all-stocks', { params });
  return response.data;
};

export const getCompanyLogo = async (symbol, name = null) => {
  const response = await api.get(`/company/logo/${symbol}`);
  return response.data.logo_url || response.data.logoUrl || null;
};

export const getRealNews = async (limit = 6) => {
  const response = await api.get(`/news?limit=${limit}`);
  return response.data;
};

export default api;
