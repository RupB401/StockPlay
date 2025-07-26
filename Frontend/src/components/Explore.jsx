import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import {
  getPopularStocks,
  getMarketIndices,
  getTopPerformers,
  getRealNews,
  addStockToDashboard,
  refreshStockCache,
  getCompanyLogo,
} from "../services/api";
import {
  FaRocket,
  FaChartLine,
  FaClock,
  FaCalendarAlt,
  FaSearch,
  FaArrowUp,
} from "react-icons/fa";

// Using CSS symbols instead of Font Awesome
const icons = {
  plus: "+",
  external: "🔗",
};

function Explore() {
  const { isDark } = useTheme();
  const [popularStocks, setPopularStocks] = useState([]);
  const [marketIndices, setMarketIndices] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCap, setSelectedCap] = useState("large");
  const [addedStocks, setAddedStocks] = useState(new Set()); // Track added stocks
  const [stockLogos, setStockLogos] = useState({}); // Cache for stock logos

  const hasFetchedData = useRef(false);
  const navigate = useNavigate();

  // Load data on component mount

  useEffect(() => {
    if (!hasFetchedData.current) {
      fetchExploreData();
      hasFetchedData.current = true;
    }
  }, []);

  // Fetch popular stocks and preload all logos atomically to prevent flickering
  const fetchExploreData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [stocksResponse, indicesData, performersData, newsData] =
        await Promise.all([
          getPopularStocks(10), // Get 10 stocks for main page
          getMarketIndices(),
          getTopPerformers(selectedCap),
          getRealNews(6).catch((err) => {
            console.error("Error fetching news:", err);
            return [];
          }),
        ]);

      // Handle both old format (array) and new format (object with pagination)
      const stocksData = Array.isArray(stocksResponse)
        ? stocksResponse
        : stocksResponse.stocks || [];

      // Debug log the performers data
      console.log("Raw performers data from API:", performersData);
      console.log("Selected cap:", selectedCap);

      // Preload all logos for popular stocks to prevent flickering
      // Only update state once, after all logos are loaded
      const logoPromises = stocksData.map(async (stock) => {
        if (stock?.symbol) {
          try {
            const logoUrl = await getCompanyLogo(stock.symbol, stock.name);
            if (logoUrl && !logoUrl.startsWith("data:image/svg+xml")) {
              return { symbol: stock.symbol, logoUrl };
            }
          } catch (error) {
            // Swallow error, fallback will be used
          }
        }
        return null;
      });
      const logoResults = await Promise.all(logoPromises);
      const newLogos = {};
      logoResults.forEach((result) => {
        if (result?.symbol && result?.logoUrl) {
          newLogos[result.symbol] = result.logoUrl;
        }
      });
      // Atomic state update for all logos
      setStockLogos((prev) => ({ ...prev, ...newLogos }));

      setPopularStocks(stocksData);
      setMarketIndices(indicesData);
      setTopPerformers(performersData);
      setNews(newsData);
      hasFetchedData.current = true;
    } catch (error) {
      console.error("Error fetching explore data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to load logos for stocks with better flickering prevention (atomic update)
  const loadLogosForStocks = async (stocks) => {
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return;
    }

    // Only load logos for stocks that don't already have real logos (not fallbacks)
    const stocksNeedingLogos = stocks.filter(
      (stock) =>
        stock &&
        stock.symbol &&
        (!stockLogos[stock.symbol] ||
          stockLogos[stock.symbol].startsWith("data:image/svg+xml"))
    );

    if (stocksNeedingLogos.length === 0) {
      return;
    }

    // Load all logos at once and update state only once to prevent flickering
    const logoPromises = stocksNeedingLogos.map(async (stock) => {
      try {
        const logoUrl = await getCompanyLogo(stock.symbol, stock.name);
        // Only return real logo URLs, not fallbacks
        if (logoUrl && !logoUrl.startsWith("data:image/svg+xml")) {
          return { symbol: stock.symbol, logoUrl };
        }
        return { symbol: stock.symbol, logoUrl: null }; // Keep fallback
      } catch (error) {
        return { symbol: stock.symbol, logoUrl: null }; // Keep fallback
      }
    });

    try {
      const logoResults = await Promise.all(logoPromises);
      const newLogos = {};

      logoResults.forEach((result) => {
        if (result && result.symbol && result.logoUrl) {
          newLogos[result.symbol] = result.logoUrl;
        }
      });

      // Atomic state update for all logos
      setStockLogos((prev) => ({ ...prev, ...newLogos }));
    } catch (error) {
      // Swallow error, fallback will be used
    }
  };

  useEffect(() => {
    // Fetch data when selectedCap changes (but not on initial mount)
    if (hasFetchedData.current) {
      fetchExploreData();
    }
  }, [selectedCap]);

  // Debug effect to monitor topPerformers changes
  useEffect(() => {
    console.log(
      "TopPerformers state changed:",
      topPerformers.length,
      "items",
      topPerformers
    );
    console.log("Loading state:", loading);
    console.log("Selected cap:", selectedCap);
  }, [topPerformers, loading]);

  // Save state when component unmounts or before navigation
  useEffect(() => {
    return () => {
      // Simple mock for caching - could be implemented later
      console.log("Saving page state:", {
        selectedCap,
        addedStocks: Array.from(addedStocks),
        stockLogos,
      });
    };
  }, [selectedCap, addedStocks, stockLogos]);

  const handleAddToDashboard = async (symbol) => {
    try {
      // Check if stock is already added
      if (addedStocks.has(symbol)) {
        // If it's already added, we want to remove it (toggle functionality)
        // For now, we'll just toggle the UI state since there's no remove endpoint
        setAddedStocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });
        console.log(`Removed ${symbol} from dashboard (UI only)`);
      } else {
        // Add to dashboard
        await addStockToDashboard(symbol);
        setAddedStocks((prev) => new Set([...prev, symbol]));
        console.log(`Added ${symbol} to dashboard`);

        // Optional: Remove from added state after a delay to allow re-adding
        setTimeout(() => {
          setAddedStocks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(symbol);
            return newSet;
          });
        }, 3000); // Reset after 3 seconds
      }
    } catch (error) {
      console.error("Error managing dashboard:", error);
    }
  };

  const handleRefreshCache = async () => {
    try {
      setLoading(true);

      // Also refresh the backend stock cache if needed
      await refreshStockCache();

      // Fetch fresh data
      await fetchExploreData();

      console.log("Cache refreshed and data updated");
    } catch (error) {
      console.error("Error refreshing cache:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to clear specific sections (removed cache functionality)
  const clearCacheSection = (section) => {
    console.log(`Clearing ${section} section (cache functionality removed)`);
  };

  const handleCapChange = async (cap) => {
    if (cap === selectedCap) return; // Don't refetch if same cap is selected

    setSelectedCap(cap);

    // Fetch new data for the selected cap
    setLoading(true);
    try {
      console.log(`Fetching top performers for ${cap} cap...`);
      const performersData = await getTopPerformers(cap);
      console.log(
        `Received ${performersData.length} performers for ${cap} cap:`,
        performersData
      );

      setTopPerformers(performersData);

      // Load logos for new performers
      await loadLogosForStocks(performersData);
    } catch (error) {
      console.error("Error fetching top performers:", error);
      setTopPerformers([]); // Clear on error
    } finally {
      setLoading(false);
    }
  };

  // Get logo URL from cache or return fallback, never return external placeholder.com
  // Memoized to prevent unnecessary re-renders
  const getLogoUrlSync = React.useCallback(
    (symbol) => {
      const url = stockLogos[symbol];
      // If the URL is missing, or is a placeholder.com, or not a valid http(s) or data URL, use fallback
      if (
        !url ||
        (typeof url === "string" && url.includes("placeholder.com")) ||
        (typeof url === "string" &&
          !url.startsWith("http") &&
          !url.startsWith("data:image/svg+xml"))
      ) {
        return generateFallbackLogo(symbol);
      }
      return url;
    },
    [stockLogos]
  );

  // Generate SVG fallback logo with memoization
  const fallbackCache = useRef({});
  const generateFallbackLogo = React.useCallback((symbol) => {
    if (fallbackCache.current[symbol]) {
      return fallbackCache.current[symbol];
    }
    const colors = [
      "#3B82F6",
      "#EF4444",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#06B6D4",
      "#84CC16",
      "#F97316",
      "#EC4899",
      "#6366F1",
    ];
    const colorIndex = symbol.charCodeAt(0) % colors.length;
    const bgColor = colors[colorIndex];
    const initials = symbol.slice(0, 3);
    const svgContent = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="${bgColor}"/>
        <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
          ${initials}
        </text>
      </svg>
    `;
    const fallbackLogo = `data:image/svg+xml;base64,${btoa(svgContent)}`;
    fallbackCache.current[symbol] = fallbackLogo;
    return fallbackLogo;
  }, []);

  // Get index logo (creates custom SVG logos for indices, no external requests)
  const getIndexLogo = React.useCallback((symbol, name) => {
    const svgMap = {
      "^GSPC": `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#1f77b4"/><text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">S&amp;P</text></svg>`,
      "^IXIC": `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#ff7f0e"/><text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">NDQ</text></svg>`,
      "^DJI": `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#2ca02c"/><text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">DOW</text></svg>`,
      "^RUT": `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#d62728"/><text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">RUT</text></svg>`,
      "^VIX": `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#9467bd"/><text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">VIX</text></svg>`,
    };
    if (svgMap[symbol]) {
      return `data:image/svg+xml;base64,${btoa(svgMap[symbol])}`;
    }
    // Default: use first 3 letters of name, blue background
    const initials = name
      ? name.slice(0, 3).toUpperCase()
      : symbol.slice(0, 3).toUpperCase();
    const svg = `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#6366f1"/><text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${initials}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, []);

  const handleAddIndexToDashboard = async (index) => {
    try {
      const cleanSymbol = index.symbol.replace("^", "");

      // Check if index is already added
      if (addedStocks.has(cleanSymbol)) {
        // If it's already added, remove it (toggle functionality)
        setAddedStocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cleanSymbol);
          return newSet;
        });
        console.log(`Removed ${index.name} from dashboard (UI only)`);
      } else {
        // Add to dashboard
        await addStockToDashboard(cleanSymbol);
        setAddedStocks((prev) => new Set([...prev, cleanSymbol]));
        console.log(`Added ${index.name} to dashboard`);

        setTimeout(() => {
          setAddedStocks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(cleanSymbol);
            return newSet;
          });
        }, 3000);
      }
    } catch (error) {
      console.error("Error managing index in dashboard:", error);
    }
  };

  // Tools & features with click handlers
  const tools = [
    {
      name: "IPOs",
      icon: <FaRocket className="text-lg" />,
      onClick: () => navigate("/ipos"),
    },
    {
      name: "Options",
      icon: <FaChartLine className="text-lg" />,
      onClick: () => navigate("/options"),
    },
    {
      name: "ETFs",
      icon: <FaArrowUp className="text-lg" />,
      onClick: () => navigate("/etfs"),
    },
    {
      name: "Day Trading",
      icon: <FaClock className="text-lg" />,
      onClick: () => navigate("/day-trading"),
    },
    {
      name: "Earnings",
      icon: <FaCalendarAlt className="text-lg" />,
      onClick: () => navigate("/earnings"),
    },
    {
      name: "Screener",
      icon: <FaSearch className="text-lg" />,
      onClick: () => navigate("/screener"),
    },
  ];

  // Filter out stocks with price 0 or falsy
  const filteredPopularStocks = popularStocks.filter((stock) => {
    if (!stock) return false;

    // Handle price parsing for different formats ($123.45, 123.45, etc.)
    let priceNumber = 0;
    if (typeof stock.price === "string") {
      // Remove $ and other currency symbols, then parse
      priceNumber = Number(stock.price.replace(/[$,]/g, ""));
    } else if (typeof stock.price === "number") {
      priceNumber = stock.price;
    }

    return priceNumber > 0;
  });
  const filteredTopPerformers = topPerformers.filter((stock) => {
    if (!stock) return false;

    // Handle price parsing for different formats ($123.45, 123.45, etc.)
    let priceNumber = 0;
    if (typeof stock.price === "string") {
      // Remove $ and other currency symbols, then parse
      priceNumber = Number(stock.price.replace(/[$,]/g, ""));
    } else if (typeof stock.price === "number") {
      priceNumber = stock.price;
    }

    console.log(
      `Stock ${stock.symbol}: price="${stock.price}", parsed=${priceNumber}`
    );
    return priceNumber > 0;
  });

  // Debug log the filtering results
  console.log("topPerformers before filtering:", topPerformers);
  console.log("filteredTopPerformers after filtering:", filteredTopPerformers);

  return (
    <div
      className={`p-4 pt-20 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      } min-h-screen`}
    >
      {/* Cache Status Indicator removed for users */}

      {/* Market Indices Ticker */}
      <div
        className={`w-full mb-8 rounded-lg p-4 border ${
          isDark
            ? "bg-gradient-to-r from-gray-800 to-blue-900 border-gray-700"
            : "bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200"
        }`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {marketIndices.map((index, i) => {
            const cleanSymbol = index.symbol.replace("^", "");
            // Map index symbols to their corresponding ETFs for navigation
            const getETFSymbol = (indexSymbol) => {
              const mapping = {
                "^GSPC": "SPY", // S&P 500 -> SPDR S&P 500 ETF
                "^IXIC": "QQQ", // NASDAQ -> Invesco QQQ ETF
                "^DJI": "DIA", // DOW -> SPDR Dow Jones ETF
                "^RUT": "IWM", // Russell 2000 -> iShares Russell 2000 ETF
                "^VIX": "VXX", // VIX -> iPath S&P 500 VIX Short-Term Futures ETN
              };
              return mapping[indexSymbol] || cleanSymbol;
            };
            const etfSymbol = getETFSymbol(index.symbol);

            return (
              <div
                key={i}
                className={`group relative rounded-lg p-4 shadow-sm hover:shadow-md transition-all border flex flex-col cursor-pointer ${
                  isDark
                    ? "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-blue-500"
                    : "bg-white border-gray-100 hover:bg-gray-50 hover:border-blue-300"
                }`}
                onClick={() => {
                  // Navigate to indices page with the specific index selected
                  if (
                    index.name === "S&P 500" ||
                    index.name === "NASDAQ" ||
                    index.name === "DOW" ||
                    index.name === "Russell 2000" ||
                    index.name === "VIX"
                  ) {
                    navigate(`/indices?selected=${etfSymbol}`);
                  } else {
                    navigate(`/stock/${etfSymbol}`);
                  }
                }}
                title={`View ${index.name} details`}
              >
                <div className="flex flex-col flex-1">
                  <span
                    className={`font-semibold text-sm mb-2 ${
                      isDark ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    {index.name}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span
                      className={`font-medium text-lg ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {index.value}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        index.isNegative ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {index.change} ({index.percent})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddIndexToDashboard(index)}
                  className={`absolute top-2 right-2 p-1.5 rounded-full border transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                    addedStocks.has(cleanSymbol)
                      ? "border-green-500 bg-green-50 hover:bg-green-100"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                  title={
                    addedStocks.has(cleanSymbol)
                      ? "Added to Dashboard"
                      : "Add to Dashboard"
                  }
                >
                  {addedStocks.has(cleanSymbol) ? (
                    <svg
                      className="w-3 h-3 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="w-3 h-3 text-gray-600">{icons.plus}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular US Stocks */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2
              className={`text-xl font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Popular US Stocks
            </h2>
            <span className="badge badge-outline badge-xs text-blue-600">
              Real-time Data
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefreshCache}
              disabled={loading}
              className="btn btn-ghost btn-sm text-primary hover:bg-primary/10"
              title="Refresh Stock Data"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              to="/explore/stocks"
              className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              See more <span className="w-3 h-3">{icons.external}</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div>Loading stock data...</div>
          </div>
        ) : filteredPopularStocks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3
              className={`text-lg font-semibold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              No Stock Data Available
            </h3>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mb-4`}>
              Unable to load popular stocks at the moment.
            </p>
            <button
              onClick={handleRefreshCache}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {filteredPopularStocks.map((stock, i) => (
              <div
                key={i}
                className={`group relative border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  isDark
                    ? "bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-700"
                    : "bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
                onClick={() => navigate(`/stock/${stock.symbol}`)}
                title={`View ${stock.name} details`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${
                        isDark ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <img
                        src={getLogoUrlSync(stock.symbol)}
                        alt={stock.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Only change to fallback if it's not already a fallback
                          if (!e.target.src.startsWith("data:image/svg+xml")) {
                            e.target.src = generateFallbackLogo(stock.symbol);
                          }
                        }}
                        style={{
                          imageRendering: "auto",
                          backfaceVisibility: "hidden",
                          transform: "translateZ(0)", // Force hardware acceleration
                        }}
                      />
                    </div>
                    <div>
                      <div
                        className={`font-medium text-sm ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {stock.name}
                      </div>
                      <div
                        className={`text-xs ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {stock.symbol}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handleAddToDashboard(stock.symbol);
                    }}
                    className={`absolute top-2 right-2 p-2 rounded-full border transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                      addedStocks.has(stock.symbol)
                        ? "border-green-500 bg-green-50 hover:bg-green-100"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                    title={
                      addedStocks.has(stock.symbol)
                        ? "Added to Dashboard"
                        : "Add to Dashboard"
                    }
                  >
                    {addedStocks.has(stock.symbol) ? (
                      <svg
                        className="w-3 h-3 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="w-3 h-3 text-gray-600">
                        {icons.plus}
                      </span>
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold">{stock.price}</div>
                    {stock.status === "live" && (
                      <span className="badge badge-success badge-xs">LIVE</span>
                    )}
                    {stock.status === "fallback" && (
                      <span className="badge badge-warning badge-xs">
                        STATIC
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        stock.isNegative ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {stock.change} ({stock.percent}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products & Tools */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Products & tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {tools.map((tool, i) => (
            <div
              key={i}
              className={`border rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer transition-colors ${
                isDark
                  ? "border-gray-700 hover:bg-gray-800"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
              onClick={tool.onClick}
            >
              <div
                className={`mb-2 ${isDark ? "text-blue-400" : "text-blue-500"}`}
              >
                {tool.icon}
              </div>
              <div
                className={`font-medium ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {tool.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2
            className={`text-xl font-semibold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Top Performers
          </h2>
          <Link
            to="/screener"
            className={`flex items-center gap-1 transition-colors ${
              isDark
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-500 hover:text-blue-700"
            }`}
          >
            See more <span className="w-3 h-3">{icons.external}</span>
          </Link>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded-full transition-colors ${
              selectedCap === "large"
                ? isDark
                  ? "bg-green-900 text-green-300 border border-green-700"
                  : "bg-green-100 text-green-800"
                : isDark
                ? "hover:bg-gray-700 border border-gray-600 text-gray-300"
                : "hover:bg-gray-100 border text-gray-700"
            }`}
            onClick={() => handleCapChange("large")}
          >
            Large Cap
          </button>
          <button
            className={`px-4 py-2 rounded-full transition-colors ${
              selectedCap === "mid"
                ? isDark
                  ? "bg-green-900 text-green-300 border border-green-700"
                  : "bg-green-100 text-green-800"
                : isDark
                ? "hover:bg-gray-700 border border-gray-600 text-gray-300"
                : "hover:bg-gray-100 border text-gray-700"
            }`}
            onClick={() => handleCapChange("mid")}
          >
            Mid Cap
          </button>
          <button
            className={`px-4 py-2 rounded-full transition-colors ${
              selectedCap === "small"
                ? isDark
                  ? "bg-green-900 text-green-300 border border-green-700"
                  : "bg-green-100 text-green-800"
                : isDark
                ? "hover:bg-gray-700 border border-gray-600 text-gray-300"
                : "hover:bg-gray-100 border text-gray-700"
            }`}
            onClick={() => handleCapChange("small")}
          >
            Small Cap
          </button>
        </div>

        <div
          className={`border rounded-lg overflow-hidden ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div
            className={`grid grid-cols-4 gap-4 p-4 font-semibold text-sm ${
              isDark ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-gray-900"
            }`}
          >
            <div>Company</div>
            <div>Price</div>
            <div>Change</div>
            <div>Action</div>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="loading loading-spinner loading-md"></div>
              <p
                className={`text-sm mt-2 ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Loading top performers...
              </p>
            </div>
          ) : filteredTopPerformers.length === 0 ? (
            <div className="p-8 text-center">
              <p
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No top performers available for {selectedCap} cap stocks.
              </p>
            </div>
          ) : (
            filteredTopPerformers.map((stock, i) => (
              <div
                key={i}
                className={`group grid grid-cols-4 gap-4 p-4 border-t transition-colors relative cursor-pointer ${
                  isDark
                    ? "border-gray-700 hover:bg-gray-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => navigate(`/stock/${stock.symbol}`)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${
                      isDark ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <img
                      src={getLogoUrlSync(stock.symbol)}
                      alt={stock.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Only change to fallback if it's not already a fallback
                        if (!e.target.src.startsWith("data:image/svg+xml")) {
                          e.target.src = generateFallbackLogo(stock.symbol);
                        }
                      }}
                      style={{
                        imageRendering: "auto",
                        backfaceVisibility: "hidden",
                        transform: "translateZ(0)", // Force hardware acceleration
                      }}
                    />
                  </div>
                  <div>
                    <div
                      className={`font-medium text-sm ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stock.name}
                    </div>
                    <div
                      className={`text-xs ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {stock.symbol}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {stock.price}
                  </div>
                  {stock.status === "live" && (
                    <span className="badge badge-success badge-xs">LIVE</span>
                  )}
                  {stock.status === "fallback" && (
                    <span className="badge badge-warning badge-xs">STATIC</span>
                  )}
                </div>
                <div
                  className={`font-medium ${
                    stock.isNegative ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {stock.change} ({stock.percent}%)
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent row click
                      handleAddToDashboard(stock.symbol);
                    }}
                    className={`p-2 rounded-full border transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                      addedStocks.has(stock.symbol)
                        ? "border-green-500 bg-green-50 hover:bg-green-100"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                    title={
                      addedStocks.has(stock.symbol)
                        ? "Added to Dashboard"
                        : "Add to Dashboard"
                    }
                  >
                    {addedStocks.has(stock.symbol) ? (
                      <svg
                        className="w-3 h-3 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="w-3 h-3 text-gray-600">
                        {icons.plus}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stock Market News */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2
              className={`text-xl font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Market News
            </h2>
            <span className="badge badge-outline badge-xs text-green-600">
              Live Updates
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((article) => (
            <div
              key={article.id}
              className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
              onClick={() => window.open(article.url, "_blank")}
            >
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  // Inline SVG fallback for news
                  const svg = `<svg width='300' height='200' xmlns='http://www.w3.org/2000/svg'><rect width='300' height='200' fill='#6366f1'/><text x='150' y='110' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='24' font-weight='bold'>News</text></svg>`;
                  e.target.src = `data:image/svg+xml;base64,${btoa(svg)}`;
                }}
              />
              <div className="p-4">
                <h3
                  className={`font-semibold text-sm mb-2 line-clamp-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {article.title}
                </h3>
                <p
                  className={`text-xs mb-3 line-clamp-2 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {article.summary}
                </p>
                <div
                  className={`flex justify-between items-center text-xs ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <span>{article.source}</span>
                  <span>{article.publishedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Explore;
