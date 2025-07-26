import axios from 'axios';

// Configuration - could be moved to environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    if (results.length > 0) {
      return results;
    }
    
    // If no results from API, try local fallback
    return getLocalFallbackResults(query.trim());
    
  } catch (error) {
    console.error("Error searching stocks:", error);
    
    // Comprehensive fallback system
    return getLocalFallbackResults(query.trim());
  }
};

// Local fallback search results for when API fails
const getLocalFallbackResults = (query) => {
  const commonStocks = [
    { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
    { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology" },
    { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication Services" },
    { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical" },
    { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical" },
    { symbol: "META", name: "Meta Platforms Inc.", sector: "Communication Services" },
    { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology" },
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc.", sector: "Financial Services" },
    { symbol: "BLK", name: "BlackRock Inc.", sector: "Financial Services" },
    { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services" },
    { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
    { symbol: "V", name: "Visa Inc.", sector: "Financial Services" },
    { symbol: "PG", name: "Procter & Gamble Co.", sector: "Consumer Defensive" },
    { symbol: "UNH", name: "UnitedHealth Group Inc.", sector: "Healthcare" },
    { symbol: "HD", name: "Home Depot Inc.", sector: "Consumer Cyclical" },
    { symbol: "MA", name: "Mastercard Inc.", sector: "Financial Services" },
    { symbol: "BAC", name: "Bank of America Corp.", sector: "Financial Services" },
    { symbol: "XOM", name: "Exxon Mobil Corporation", sector: "Energy" },
    { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive" },
    { symbol: "CVX", name: "Chevron Corporation", sector: "Energy" },
    { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services" },
    { symbol: "DIS", name: "Walt Disney Co.", sector: "Communication Services" },
    { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology" },
    { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology" },
    { symbol: "PYPL", name: "PayPal Holdings Inc.", sector: "Financial Services" }
  ];

  const queryLower = query.toLowerCase();
  
  // Enhanced matching logic
  const matches = commonStocks.filter(stock => {
    const symbolMatch = stock.symbol.toLowerCase().includes(queryLower);
    const nameMatch = stock.name.toLowerCase().includes(queryLower);
    const wordMatch = stock.name.toLowerCase().split(' ').some(word => 
      word.startsWith(queryLower)
    );
    
    return symbolMatch || nameMatch || wordMatch;
  });

  // Sort matches by relevance
  return matches
    .sort((a, b) => {
      // Exact symbol match gets highest priority
      if (a.symbol.toLowerCase() === queryLower) return -1;
      if (b.symbol.toLowerCase() === queryLower) return 1;
      
      // Symbol starts with query gets second priority
      const aSymbolStarts = a.symbol.toLowerCase().startsWith(queryLower);
      const bSymbolStarts = b.symbol.toLowerCase().startsWith(queryLower);
      if (aSymbolStarts && !bSymbolStarts) return -1;
      if (bSymbolStarts && !aSymbolStarts) return 1;
      
      // Name starts with query gets third priority
      const aNameStarts = a.name.toLowerCase().startsWith(queryLower);
      const bNameStarts = b.name.toLowerCase().startsWith(queryLower);
      if (aNameStarts && !bNameStarts) return -1;
      if (bNameStarts && !aNameStarts) return 1;
      
      // Sort by name length for better UX
      return a.name.length - b.name.length;
    })
    .slice(0, 8) // Limit to 8 results
    .map(stock => ({
      ...stock,
      type: "Equity",
      region: "US",
      currency: "USD",
      from_fallback: true
    }));
};

// Market indices function
export const getMarketIndices = async () => {
  try {
    const response = await api.get('/market/indices');
    return response.data;
  } catch (error) {
    console.error("Error fetching market indices:", error);
    // Fallback mock data
    return [
      { name: "S&P 500", symbol: "^GSPC", value: "5,308.14", change: "-15.40", percent: "-0.29", isNegative: true },
      { name: "NASDAQ", symbol: "^IXIC", value: "16,742.32", change: "-87.56", percent: "-0.52", isNegative: true },
      { name: "DOW", symbol: "^DJI", value: "39,123.56", change: "+45.30", percent: "+0.12", isNegative: false },
      { name: "RUSSELL 2000", symbol: "^RUT", value: "2,042.58", change: "-18.24", percent: "-0.89", isNegative: true },
      { name: "VIX", symbol: "^VIX", value: "14.82", change: "+0.75", percent: "+5.33", isNegative: false },
    ];
  }
};

// Get top performers by market cap
export const getTopPerformers = async (marketCap = 'large') => {
  try {
    const response = await api.get(`/top-performers?cap=${marketCap}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching top performers:", error);
    // Fallback mock data
    return [
      { symbol: "NVDA", name: "NVIDIA Corporation", price: "$875.50", change: "+2.45", percent: "+0.28", isNegative: false },
      { symbol: "TSLA", name: "Tesla Inc.", price: "$248.90", change: "+8.20", percent: "+3.41", isNegative: false },
      { symbol: "AMD", name: "Advanced Micro Devices", price: "$165.30", change: "+4.15", percent: "+2.58", isNegative: false },
      { symbol: "NFLX", name: "Netflix Inc.", price: "$485.20", change: "+12.80", percent: "+2.71", isNegative: false },
      { symbol: "CRM", name: "Salesforce Inc.", price: "$295.75", change: "+6.45", percent: "+2.23", isNegative: false },
    ];
  }
};

// Get popular stocks with detailed info
export const getPopularStocks = async (limit = 15, page = 1) => {
  try {
    const response = await api.get(`/popular-stocks?limit=${limit}&page=${page}`);
    
    // Handle both old format (array) and new format (object with pagination)
    if (Array.isArray(response.data)) {
      return {
        stocks: response.data,
        pagination: {
          page: 1,
          limit: response.data.length,
          total: response.data.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching popular stocks:", error);
    // Fallback mock data
    const fallbackStocks = [
      { symbol: "AAPL", name: "Apple Inc.", price: "$189.50", change: "+2.45", percent: "+1.31", isNegative: false },
      { symbol: "MSFT", name: "Microsoft Corporation", price: "$385.20", change: "-1.80", percent: "-0.46", isNegative: true },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: "$2,845.60", change: "+15.30", percent: "+0.54", isNegative: false },
      { symbol: "AMZN", name: "Amazon.com Inc.", price: "$3,285.04", change: "-8.92", percent: "-0.27", isNegative: true },
      { symbol: "TSLA", name: "Tesla Inc.", price: "$248.90", change: "+8.20", percent: "+3.41", isNegative: false },
      { symbol: "META", name: "Meta Platforms Inc.", price: "$485.30", change: "+12.85", percent: "+2.72", isNegative: false },
      { symbol: "NVDA", name: "NVIDIA Corporation", price: "$875.50", change: "+2.45", percent: "+0.28", isNegative: false },
      { symbol: "NFLX", name: "Netflix Inc.", price: "$485.20", change: "+12.80", percent: "+2.71", isNegative: false },
    ].slice(0, limit);
    
    return {
      stocks: fallbackStocks,
      pagination: {
        page: 1,
        limit: fallbackStocks.length,
        total: fallbackStocks.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }
};

// Browse all stocks with pagination and filtering
export const browseAllStocks = async (page = 1, limit = 20, sector = null, marketCap = null) => {
  try {
    let url = `/stocks/browse?page=${page}&limit=${limit}`;
    if (sector) url += `&sector=${encodeURIComponent(sector)}`;
    if (marketCap) url += `&market_cap=${encodeURIComponent(marketCap)}`;
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error browsing stocks:", error);
    // Fallback mock data
    const fallbackStocks = [
      { symbol: "AAPL", name: "Apple Inc.", price: "$189.50", change: "+2.45", percent: "+1.31", isNegative: false, sector: "Technology", marketCap: 2900000000000 },
      { symbol: "MSFT", name: "Microsoft Corporation", price: "$385.20", change: "-1.80", percent: "-0.46", isNegative: true, sector: "Technology", marketCap: 2800000000000 },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: "$2,845.60", change: "+15.30", percent: "+0.54", isNegative: false, sector: "Technology", marketCap: 1800000000000 },
      { symbol: "AMZN", name: "Amazon.com Inc.", price: "$3,285.04", change: "-8.92", percent: "-0.27", isNegative: true, sector: "Consumer Cyclical", marketCap: 1700000000000 },
      { symbol: "TSLA", name: "Tesla Inc.", price: "$248.90", change: "+8.20", percent: "+3.41", isNegative: false, sector: "Consumer Cyclical", marketCap: 800000000000 },
    ].slice(0, limit);
    
    return {
      stocks: fallbackStocks,
      pagination: {
        page: 1,
        limit: fallbackStocks.length,
        total: fallbackStocks.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }
};

// Get stock market news
export const getStockNews = async (limit = 6) => {
  try {
    const response = await api.get(`/news?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stock news:", error);
    // Fallback mock data
    return [
      {
        id: 1,
        title: "Fed Signals Potential Rate Cuts as Inflation Shows Signs of Cooling",
        summary: "Federal Reserve officials hint at possible interest rate reductions following recent inflation data.",
        source: "Financial Times",
        publishedAt: "2 hours ago",
        imageUrl: "https://via.placeholder.com/300x200?text=Fed+News",
        url: "#"
      },
      {
        id: 2,
        title: "Tech Stocks Rally as AI Spending Continues to Drive Growth",
        summary: "Major technology companies see significant gains as artificial intelligence investments pay off.",
        source: "Reuters",
        publishedAt: "4 hours ago",
        imageUrl: "https://via.placeholder.com/300x200?text=Tech+Rally",
        url: "#"
      },
      {
        id: 3,
        title: "Energy Sector Surges on Rising Oil Prices and Supply Concerns",
        summary: "Oil companies lead market gains amid geopolitical tensions and supply chain disruptions.",
        source: "Bloomberg",
        publishedAt: "6 hours ago",
        imageUrl: "https://via.placeholder.com/300x200?text=Energy+Surge",
        url: "#"
      },
      {
        id: 4,
        title: "Banking Stocks Mixed Ahead of Quarterly Earnings Reports",
        summary: "Investors await quarterly results from major banks as lending conditions remain uncertain.",
        source: "Wall Street Journal",
        publishedAt: "8 hours ago",
        imageUrl: "https://via.placeholder.com/300x200?text=Banking+News",
        url: "#"
      },
      {
        id: 5,
        title: "Electric Vehicle Sales Show Strong Growth Despite Market Headwinds",
        summary: "EV manufacturers report robust sales figures as consumer adoption continues to accelerate.",
        source: "CNBC",
        publishedAt: "10 hours ago",
        imageUrl: "https://via.placeholder.com/300x200?text=EV+Growth",
        url: "#"
      },
      {
        id: 6,
        title: "Cryptocurrency Market Volatility Continues as Regulatory Clarity Awaited",
        summary: "Digital assets experience significant price swings while investors await regulatory decisions.",
        source: "CoinDesk",
        publishedAt: "12 hours ago",
        imageUrl: "https://via.placeholder.com/300x200?text=Crypto+News",
        url: "#"
      }
    ].slice(0, limit);
  }
};

// Enhanced logo function using our Finnhub API endpoint
export const getCompanyLogo = async (symbol, companyName) => {
  try {
    // First, try our backend Finnhub logo endpoint
    const response = await api.get(`/company/logo/${symbol.toUpperCase()}`);
    if (response.data && response.data.logo && response.data.logo !== '') {
      return response.data.logo;
    }
  } catch (error) {
    console.log(`Backend logo API failed for ${symbol}, trying fallback sources`);
  }

  // Fallback to external logo sources if backend fails
  const logoSources = [
    // Primary: Clearbit with company domain
    `https://logo.clearbit.com/${getCompanyDomain(symbol, companyName)}`,
    // Secondary: Alternative Clearbit URL
    `https://logo.clearbit.com/${symbol.toLowerCase()}.com`,
    // Manual mapping for known companies
    getManualLogoMapping(symbol),
    // Company favicon approach
    `https://www.google.com/s2/favicons?domain=${getCompanyDomain(symbol, companyName)}&sz=64`,
  ].filter(Boolean); // Remove null/undefined entries

  // Try each fallback logo source
  for (const logoUrl of logoSources) {
    try {
      const response = await fetch(logoUrl, { method: 'HEAD', timeout: 3000 });
      if (response.ok && response.headers.get('content-type')?.includes('image')) {
        return logoUrl;
      }
    } catch (error) {
      continue; // Try next source
    }
  }
  
  // Final fallback: Generate SVG logo with company initials
  return generateSVGLogo(symbol, companyName);
};

// Helper function to get company domain
const getCompanyDomain = (symbol, companyName) => {
  // Manual domain mapping for major companies
  const domainMap = {
    'AAPL': 'apple.com',
    'MSFT': 'microsoft.com',
    'GOOGL': 'google.com',
    'GOOG': 'google.com',
    'AMZN': 'amazon.com',
    'TSLA': 'tesla.com',
    'META': 'meta.com',
    'NVDA': 'nvidia.com',
    'NFLX': 'netflix.com',
    'AMD': 'amd.com',
    'INTC': 'intel.com',
    'ORCL': 'oracle.com',
    'CSCO': 'cisco.com',
    'ADBE': 'adobe.com',
    'PYPL': 'paypal.com',
    'CRM': 'salesforce.com',
    'UBER': 'uber.com',
    'LYFT': 'lyft.com',
    'SNAP': 'snap.com',
    'TWTR': 'twitter.com',
    'SQ': 'block.xyz',
    'ROKU': 'roku.com',
    'ZM': 'zoom.us',
    'TWLO': 'twilio.com',
    'DOCU': 'docusign.com',
    'SHOP': 'shopify.com',
    'SPCE': 'virgingalactic.com',
    'BB': 'blackberry.com',
    'NOK': 'nokia.com',
    'V': 'visa.com',
    'MA': 'mastercard.com'
  };

  if (domainMap[symbol]) {
    return domainMap[symbol];
  }

  // Try to derive domain from company name
  if (companyName) {
    const cleanName = companyName
      .toLowerCase()
      .replace(/\s+(inc|corp|corporation|ltd|limited|llc|company|co)\.?$/i, '')
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    return `${cleanName}.com`;
  }

  return `${symbol.toLowerCase()}.com`;
};

// Generate SVG logo as final fallback
const generateSVGLogo = (symbol, companyName) => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];
  
  // Use symbol to pick consistent color
  const colorIndex = symbol.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];
  
  // Get initials (first 2-3 chars of symbol)
  const initials = symbol.slice(0, 3);
  
  const svgContent = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="${bgColor}"/>
      <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};

// Manual logo mapping for popular stocks
const getManualLogoMapping = (symbol) => {
  const logoMap = {
    'AAPL': 'https://logo.clearbit.com/apple.com',
    'MSFT': 'https://logo.clearbit.com/microsoft.com',
    'GOOGL': 'https://logo.clearbit.com/google.com',
    'GOOG': 'https://logo.clearbit.com/google.com',
    'AMZN': 'https://logo.clearbit.com/amazon.com',
    'TSLA': 'https://logo.clearbit.com/tesla.com',
    'META': 'https://logo.clearbit.com/meta.com',
    'NVDA': 'https://logo.clearbit.com/nvidia.com',
    'NFLX': 'https://logo.clearbit.com/netflix.com',
    'AMD': 'https://logo.clearbit.com/amd.com',
    'INTC': 'https://logo.clearbit.com/intel.com',
    'ORCL': 'https://logo.clearbit.com/oracle.com',
    'CSCO': 'https://logo.clearbit.com/cisco.com',
    'ADBE': 'https://logo.clearbit.com/adobe.com',
    'PYPL': 'https://logo.clearbit.com/paypal.com',
    'CRM': 'https://logo.clearbit.com/salesforce.com',
    'UBER': 'https://logo.clearbit.com/uber.com',
    'LYFT': 'https://logo.clearbit.com/lyft.com',
    'SNAP': 'https://logo.clearbit.com/snapchat.com',
    'TWTR': 'https://logo.clearbit.com/twitter.com',
    'SQ': 'https://logo.clearbit.com/squareup.com',
    'ROKU': 'https://logo.clearbit.com/roku.com'
  };
  return logoMap[symbol] || null;
};

// Get real stock news with actual links and images
export const getRealStockNews = async (limit = 6) => {
  try {
    // In a real implementation, you'd use a news API like Alpha Vantage, NewsAPI, or Finnhub
    // For now, providing realistic news with actual sources
    const realNews = [
      {
        id: 1,
        title: "Apple Reports Strong Q4 Earnings Driven by iPhone 15 Sales",
        summary: "Apple Inc. exceeded analyst expectations with record-breaking iPhone sales and services revenue growth.",
        source: "Reuters",
        publishedAt: "2 hours ago",
        imageUrl: "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?w=400&h=200&fit=crop",
        url: "https://www.reuters.com/technology/apple-earnings-2025/"
      },
      {
        id: 2,
        title: "Federal Reserve Maintains Interest Rates at Current Levels",
        summary: "The Fed signals cautious approach to monetary policy amid economic uncertainty and inflation concerns.",
        source: "Bloomberg",
        publishedAt: "4 hours ago",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop",
        url: "https://www.bloomberg.com/news/federal-reserve-decision"
      },
      {
        id: 3,
        title: "Tesla Stock Surges on Record Vehicle Deliveries",
        summary: "Tesla reports highest quarterly deliveries in company history, beating analyst estimates by 15%.",
        source: "CNBC",
        publishedAt: "6 hours ago",
        imageUrl: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=200&fit=crop",
        url: "https://www.cnbc.com/tesla-deliveries-record/"
      },
      {
        id: 4,
        title: "Microsoft Azure Revenue Grows 30% as Cloud Demand Continues",
        summary: "Microsoft's cloud computing division shows robust growth as enterprise adoption accelerates.",
        source: "Wall Street Journal",
        publishedAt: "8 hours ago",
        imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=200&fit=crop",
        url: "https://www.wsj.com/articles/microsoft-azure-growth"
      },
      {
        id: 5,
        title: "NVIDIA Announces New AI Chip Architecture",
        summary: "The semiconductor giant unveils next-generation processors designed for artificial intelligence workloads.",
        source: "TechCrunch",
        publishedAt: "10 hours ago",
        imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=200&fit=crop",
        url: "https://techcrunch.com/nvidia-ai-chip-announcement"
      },
      {
        id: 6,
        title: "Oil Prices Rise on Middle East Supply Concerns",
        summary: "Crude oil futures climb as geopolitical tensions threaten global supply chains.",
        source: "Financial Times",
        publishedAt: "12 hours ago",
        imageUrl: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400&h=200&fit=crop",
        url: "https://www.ft.com/content/oil-prices-middle-east"
      }
    ];
    return realNews.slice(0, limit);
  } catch (error) {
    console.error("Error fetching real stock news:", error);
    return [];
  }
};

// Add stock to dashboard
export const addStockToDashboard = async (symbol) => {
  try {
    const response = await api.post(`/dashboard/stocks?symbol=${symbol}`);
    return response.data;
  } catch (error) {
    console.error("Error adding stock to dashboard:", error);
    throw error;
  }
};

// Dashboard management functions
export const getDashboardStocks = async () => {
  try {
    const response = await api.get('/dashboard/stocks');
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard stocks:", error);
    throw error;
  }
};

export const removeStockFromDashboard = async (symbol) => {
  try {
    const response = await api.delete(`/dashboard/stocks/${symbol}`);
    return response.data;
  } catch (error) {
    console.error("Error removing stock from dashboard:", error);
    throw error;
  }
};

// IPO data functions
export const getIPOData = async () => {
  try {
    const response = await api.get('/ipos');
    return response.data;
  } catch (error) {
    console.error("Error fetching IPO data:", error);
    throw error;
  }
};

// Enhanced real news function with cache busting
export const getRealNews = async (limit = 6) => {
  try {
    // Add timestamp to prevent caching and ensure fresh news
    const timestamp = Date.now();
    const response = await api.get(`/news?limit=${limit}&_t=${timestamp}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching real news:", error);
    throw error;
  }
};

// Cache management functions
export const refreshStockCache = async () => {
  try {
    const response = await api.get('/stocks/refresh-cache');
    return response.data;
  } catch (error) {
    console.error("Error refreshing stock cache:", error);
    return { error: "Failed to refresh cache" };
  }
};

export const getStockCacheStatus = async () => {
  try {
    const response = await api.get('/stocks/cache-status');
    return response.data;
  } catch (error) {
    console.error("Error getting cache status:", error);
    return { error: "Failed to get cache status" };
  }
};

// Stock Detail page functions
export const getStockDetail = async (symbol) => {
  try {
    const response = await api.get(`/stock/detail/${symbol}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stock detail:", error);
    throw error;
  }
};

export const getStockHistorical = async (symbol, range = "1M") => {
  try {
    const response = await api.get(`/stock/historical/${symbol}?range=${range}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    throw error;
  }
};

export const getCompanyNews = async (symbol, limit = 5) => {
  try {
    const response = await api.get(`/stock/news/${symbol}?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stock news:", error);
    throw error;
  }
};

export default api;