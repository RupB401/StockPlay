import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaExternalLinkAlt,
  FaPlus,
  FaCheck,
  FaChartLine,
  FaChartBar,
  FaShoppingCart,
  FaTags,
  FaInfoCircle,
} from "react-icons/fa";
// Tooltip descriptions for each fundamental
const fundamentalsInfo = {
  "Market Cap":
    "The total market value of a company's outstanding shares, calculated as share price times shares outstanding.",
  "P/E Ratio (TTM)":
    "Price-to-Earnings ratio over the trailing twelve months. Indicates how much investors are willing to pay per dollar of earnings.",
  "P/B Ratio":
    "Price-to-Book ratio. Compares a company's market value to its book value.",
  "Industry P/E": "Average Price-to-Earnings ratio for the industry sector.",
  "Debt to Equity":
    "A measure of a company's financial leverage, calculated by dividing its total liabilities by stockholders' equity.",
  "IPO Date": "The date when the company first offered shares to the public.",
  ROE: "Return on Equity. Measures a corporation's profitability by revealing how much profit a company generates with the money shareholders have invested.",
  "EPS (TTM)":
    "Earnings Per Share over the trailing twelve months. Indicates a company's profitability.",
  "Dividend Yield":
    "A financial ratio that shows how much a company pays out in dividends each year relative to its stock price.",
  "Book Value":
    "The net value of a company's assets found on its balance sheet.",
  "Face Value": "The nominal value of a security stated by the issuer.",
  "52W High/Low":
    "The highest and lowest price at which a stock has traded during the previous 52 weeks.",
};
import { FiTrendingUp, FiTrendingDown, FiBarChart } from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";
import {
  getStockDetail,
  getStockHistorical,
  getCompanyNews,
  addStockToDashboard,
  getCompanyLogo,
} from "../services/stockApi";
import { useTheme } from "../contexts/ThemeContext";
import CandlestickChart from "./CandlestickChart";

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Safety check for symbol
  if (!symbol) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Stock Symbol</h2>
          <button
            onClick={() => navigate("/explore")}
            className="btn btn-primary"
          >
            Go Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartRange, setChartRange] = useState("1M");
  const [chartType, setChartType] = useState("area");
  const [isAddedToDashboard, setIsAddedToDashboard] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [chartLoading, setChartLoading] = useState(false);
  const [isUsingDummyData, setIsUsingDummyData] = useState(false);

  const hasFetchedData = useRef(false);
  const hasFetchedHistorical = useRef(false);

  // Load stock data on component mount or symbol change
  useEffect(() => {
    if (!symbol) return;

    // Reset flags when symbol changes
    hasFetchedData.current = false;
    hasFetchedHistorical.current = false;

    fetchStockData();
  }, [symbol]);

  useEffect(() => {
    if (symbol && chartRange && stockData) {
      // Reset flag when chart range changes
      hasFetchedHistorical.current = false;
      // Add a small delay to ensure stock data is loaded first
      const timer = setTimeout(() => {
        fetchHistoricalData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [symbol, chartRange, stockData]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [detail, newsData] = await Promise.all([
        getStockDetail(symbol),
        getCompanyNews(symbol, 5),
      ]);

      setStockData(detail);
      setNews(newsData.news || []);

      // Load company logo
      let logoUrl = "";
      if (detail.logo) {
        logoUrl = detail.logo;
        setLogoUrl(logoUrl);
      } else {
        try {
          const logoData = await getCompanyLogo(symbol, detail.name);
          logoUrl = logoData;
          setLogoUrl(logoUrl);
        } catch (error) {
          console.error("Error loading logo:", error);
          logoUrl = generateFallbackLogo(symbol);
          setLogoUrl(logoUrl);
        }
      }

      hasFetchedData.current = true;
    } catch (error) {
      console.error("Error fetching stock data:", error);
      setError("Failed to load stock data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    setChartLoading(true);
    try {
      const historical = await getStockHistorical(symbol, chartRange);

      if (historical && historical.data && historical.data.length > 0) {
        setHistoricalData(historical);
        setIsUsingDummyData(false);
        hasFetchedHistorical.current = true;
      } else {
        // Use dummy data as fallback
        const currentPrice = stockData?.price
          ? parseFloat(stockData.price.replace(/[$,]/g, ""))
          : 150;
        const dummyData = {
          symbol: symbol,
          range: chartRange,
          data: generateDummyChartData(chartRange, currentPrice),
          isDummy: true,
        };
        setHistoricalData(dummyData);
        setIsUsingDummyData(true);
      }

      hasFetchedHistorical.current = true;
    } catch (error) {
      console.error("Error fetching historical data:", error);

      // Use dummy data on error
      const currentPrice = stockData?.price
        ? parseFloat(stockData.price.replace(/[$,]/g, ""))
        : 150;
      const dummyData = {
        symbol: symbol,
        range: chartRange,
        data: generateDummyChartData(chartRange, currentPrice),
        isDummy: true,
      };
      setHistoricalData(dummyData);
      setIsUsingDummyData(true);
      hasFetchedHistorical.current = true;
    } finally {
      setChartLoading(false);
    }
  };

  // Generate dummy chart data as fallback
  const generateDummyChartData = (range, currentPrice = 150) => {
    const data = [];
    const basePrice = currentPrice || 150;

    // Add some realistic price variation
    const volatility = basePrice * 0.05; // 5% volatility

    if (range === "1D") {
      for (let i = 0; i < 24; i++) {
        const variation = (Math.random() - 0.5) * volatility;
        data.push({
          time: `${String(i).padStart(2, "0")}:00`,
          price: basePrice + variation,
          volume: Math.floor(Math.random() * 1000000) + 500000,
        });
      }
    } else {
      const days =
        range === "1W"
          ? 7
          : range === "1M"
          ? 30
          : range === "3M"
          ? 90
          : range === "1Y"
          ? 365
          : range === "5Y"
          ? 365 * 5
          : range === "All"
          ? 365 * 10
          : 365;

      let currentValue = basePrice * 0.9; // Start 10% lower to show growth

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        // Gradual trend towards current price
        const targetProgress = i / (days - 1);
        const trendValue =
          currentValue + (basePrice - currentValue) * targetProgress;

        // Add daily variation
        const dailyVariation = (Math.random() - 0.5) * volatility * 0.5;
        const open = trendValue + dailyVariation;
        const close = open + (Math.random() - 0.5) * volatility * 0.3;
        const high = Math.max(open, close) + Math.random() * volatility * 0.2;
        const low = Math.min(open, close) - Math.random() * volatility * 0.2;

        data.push({
          date: date.toISOString().split("T")[0],
          open: Math.max(0, open),
          high: Math.max(0, high),
          low: Math.max(0, low),
          close: Math.max(0, close),
          volume: Math.floor(Math.random() * 2000000) + 1000000,
        });

        currentValue = close;
      }
    }
    return data;
  };

  const handleAddToDashboard = async () => {
    try {
      console.log("Adding stock to dashboard:", symbol);
      const result = await addStockToDashboard(symbol);
      console.log("Stock added successfully:", result);
      setIsAddedToDashboard(true);

      // Show success message with option to navigate to dashboard
      const userResponse = confirm(
        `${symbol} has been successfully added to your dashboard! 🎉\n\nWould you like to go to your Dashboard now to see your watchlist?`
      );

      if (userResponse) {
        navigate("/dashboard");
      }

      setTimeout(() => setIsAddedToDashboard(false), 3000);
    } catch (error) {
      console.error("Error adding to dashboard:", error);
      // Show error to user with more detail
      if (error.response?.status === 400) {
        alert(
          `${symbol} is already in your dashboard. You can view it in the Dashboard tab.`
        );
      } else {
        alert(
          `Failed to add ${symbol} to dashboard. Please check your connection and try again.\n\nError details: ${error.message}`
        );
      }
    }
  };

  const generateFallbackLogo = (symbol) => {
    const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
    const color = colors[symbol.charCodeAt(0) % colors.length];

    const svg = `
      <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="${color}"/>
        <text x="24" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">${symbol.charAt(
          0
        )}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const formatMarketCap = (marketCap) => {
    if (!marketCap || isNaN(marketCap)) return "N/A";
    // Finnhub returns millions, so divide by 1000 for billions
    return `${(marketCap / 1000).toFixed(2)} Billion`;
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stockData) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64">
            <div
              className={`text-center ${
                isDark ? "text-red-400" : "text-red-600"
              }`}
            >
              <h2 className="text-2xl font-bold mb-4">
                Error Loading Stock Data
              </h2>
              <p className="mb-4">{error}</p>
              <div className="space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate("/explore")}
                  className="btn btn-outline"
                >
                  Go Back to Explore
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <FaArrowLeft />
            Back
          </button>
          <div className="text-center">
            <h1
              className={`text-2xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-800"
              }`}
            >
              Stock Not Found
            </h1>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Unable to load data for {symbol}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-6 pt-20 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 transition-colors ${
              isDark
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-600 hover:text-blue-800"
            }`}
          >
            <FaArrowLeft />
            Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/trade/${symbol}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
            >
              <FaShoppingCart />
              Buy Stock
            </button>
            <button
              onClick={() => navigate(`/trade/${symbol}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
            >
              <FaTags />
              Sell Stock
            </button>
            <button
              onClick={handleAddToDashboard}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isAddedToDashboard
                  ? isDark
                    ? "bg-green-900 text-green-300 border border-green-700"
                    : "bg-green-100 text-green-700 border border-green-300"
                  : isDark
                  ? "bg-blue-700 text-white hover:bg-blue-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isAddedToDashboard ? <FaCheck /> : <FaPlus />}
              {isAddedToDashboard ? "Added to Dashboard" : "Add to Dashboard"}
            </button>
          </div>
        </div>

        {/* Stock Header */}
        <div
          className={`rounded-lg shadow-sm p-6 mb-6 ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img
                src={logoUrl || generateFallbackLogo(symbol)}
                alt={stockData.name}
                className="w-16 h-16 rounded-full"
                onError={(e) => {
                  e.target.src = generateFallbackLogo(symbol);
                }}
              />
              <div>
                <h1
                  className={`text-3xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {stockData.symbol}
                </h1>
                <h2
                  className={`text-xl mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {stockData.name}
                </h2>
                <div
                  className={`flex items-center gap-4 text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <span>{stockData.exchange}</span>
                  <span>•</span>
                  <span>{stockData.currency}</span>
                  <span>•</span>
                  <span>{stockData.country}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-3xl font-bold mb-1 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {stockData.price}
              </div>
              <div
                className={`flex items-center justify-end gap-1 text-lg font-medium ${
                  stockData.isNegative ? "text-red-500" : "text-green-500"
                }`}
              >
                {stockData.isNegative ? <FiTrendingDown /> : <FiTrendingUp />}
                {stockData.change} ({stockData.percent})
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            {/* Chart Controls */}
            <div
              className={`rounded-lg shadow-sm p-6 mb-4 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="mb-4">
                <h3
                  className={`text-lg font-semibold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Price Chart
                </h3>

                {/* Combined Controls - Time Range and Chart Type */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium mr-2 ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Time Range:
                    </span>
                    {["1D", "1W", "1M", "3M", "1Y", "5Y", "All"].map(
                      (range) => (
                        <button
                          key={range}
                          onClick={() => setChartRange(range)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            chartRange === range
                              ? isDark
                                ? "bg-blue-600 text-white"
                                : "bg-blue-500 text-white"
                              : isDark
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {range}
                        </button>
                      )
                    )}
                  </div>

                  {/* Chart Type Selector */}
                  <div className="flex items-center gap-2">
                    {[
                      { type: "area", icon: FiTrendingUp },
                      { type: "candlestick", icon: FiBarChart },
                      { type: "bar", icon: FaChartBar },
                    ].map(({ type, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`p-2 rounded-lg transition-colors ${
                          chartType === type
                            ? isDark
                              ? "bg-blue-600 text-white"
                              : "bg-blue-500 text-white"
                            : isDark
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              {!historicalData || chartLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="loading loading-spinner loading-lg"></div>
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Loading chart data...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "candlestick" ? (
                      <div className="w-full h-full">
                        <CandlestickChart
                          data={historicalData.data}
                          height={256}
                        />
                      </div>
                    ) : chartType === "bar" ? (
                      <BarChart data={historicalData.data}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? "#374151" : "#f0f0f0"}
                        />
                        <XAxis
                          dataKey={chartRange === "1D" ? "time" : "date"}
                          tick={{
                            fontSize: 12,
                            fill: isDark ? "#9CA3AF" : "#6B7280",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: isDark ? "#9CA3AF" : "#6B7280",
                          }}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                            border: isDark
                              ? "1px solid #374151"
                              : "1px solid #E5E7EB",
                            borderRadius: "8px",
                            color: isDark ? "white" : "#1F2937",
                          }}
                        />
                        <Bar
                          dataKey={chartRange === "1D" ? "price" : "close"}
                          fill={stockData?.isNegative ? "#EF4444" : "#10B981"}
                        />
                      </BarChart>
                    ) : (
                      // Default: Area Chart
                      <AreaChart data={historicalData.data}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? "#374151" : "#f0f0f0"}
                        />
                        <XAxis
                          dataKey={chartRange === "1D" ? "time" : "date"}
                          tick={{
                            fontSize: 12,
                            fill: isDark ? "#9CA3AF" : "#6B7280",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: isDark ? "#9CA3AF" : "#6B7280",
                          }}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                            border: isDark
                              ? "1px solid #374151"
                              : "1px solid #E5E7EB",
                            borderRadius: "8px",
                            color: isDark ? "white" : "#1F2937",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={chartRange === "1D" ? "price" : "close"}
                          stroke={stockData?.isNegative ? "#EF4444" : "#10B981"}
                          strokeWidth={2}
                          fill={
                            stockData?.isNegative
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(16, 185, 129, 0.1)"
                          }
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}

              {isUsingDummyData && (
                <div className="mt-3 text-center">
                  <span
                    className={`text-xs ${
                      isDark ? "text-yellow-400" : "text-yellow-600"
                    }`}
                  >
                    ⚠️ Using simulated data for demonstration
                  </span>
                </div>
              )}
            </div>

            {/* Company Info */}
            <div
              className={`rounded-lg shadow-sm p-6 mb-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-xl font-semibold mb-6 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Fundamentals
              </h3>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Market Cap
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["Market Cap"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      <span>
                        {formatMarketCap(
                          stockData.marketCapitalization ||
                            stockData.marketCap ||
                            stockData.market_cap
                        )}
                      </span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      P/E Ratio (TTM)
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["P/E Ratio (TTM)"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.peRatio || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      P/B Ratio
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["P/B Ratio"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.pbRatio || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Industry P/E
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["Industry P/E"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.industryPE || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Debt to Equity
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["Debt to Equity"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.debtToEquity || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      IPO Date
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["IPO Date"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.ipo || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      ROE
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["ROE"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.roe ? `${stockData.roe}%` : "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      EPS (TTM)
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["EPS (TTM)"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.eps || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Dividend Yield
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["Dividend Yield"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.dividendYield
                        ? `${stockData.dividendYield}%`
                        : "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Book Value
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["Book Value"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.bookValue || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-opacity-20 border-gray-400">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Face Value
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["Face Value"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.faceValue || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      52W High/Low
                      <FaInfoCircle
                        className="inline-block cursor-pointer"
                        title={fundamentalsInfo["52W High/Low"]}
                        style={{ color: isDark ? "#a3a3a3" : "#6b7280" }}
                        size={14}
                      />
                    </span>
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.fiftyTwoWeekHigh && stockData.fiftyTwoWeekLow
                        ? `${stockData.fiftyTwoWeekHigh}/${stockData.fiftyTwoWeekLow}`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Company Info */}
              <div
                className={`mt-6 pt-6 border-t ${
                  isDark ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <span
                      className={`block ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Sector
                    </span>
                    <span
                      className={`font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.sector || "N/A"}
                    </span>
                  </div>
                  <div className="text-center">
                    <span
                      className={`block ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Industry
                    </span>
                    <span
                      className={`font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.industry || "N/A"}
                    </span>
                  </div>
                  <div className="text-center">
                    <span
                      className={`block ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Employees
                    </span>
                    <span
                      className={`font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {stockData.employees
                        ? stockData.employees.toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* News Section */}
          <div className="lg:col-span-1">
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-xl font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Latest News
              </h3>
              <div className="space-y-4">
                {news.length > 0 ? (
                  news.map((article, index) => (
                    <div
                      key={index}
                      className={`border-b pb-4 last:border-b-0 ${
                        isDark ? "border-gray-700" : "border-gray-200"
                      }`}
                    >
                      <h4
                        className={`font-medium mb-2 line-clamp-2 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {article.title}
                      </h4>
                      <p
                        className={`text-sm mb-2 line-clamp-3 ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {article.summary}
                      </p>
                      <div
                        className={`flex items-center justify-between text-xs ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        <span>{article.source}</span>
                        <span>{article.publishedAt}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className={`text-center ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <p>No recent news available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockDetail;
