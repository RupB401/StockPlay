import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { FaChartLine, FaChartBar, FaCheck } from "react-icons/fa";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiBarChart,
  FiPlus,
} from "react-icons/fi";
import { addStockToDashboard } from "../services/stockApi";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CandlestickChart from "./CandlestickChart";

function IndicesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const [indices, setIndices] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [chartRange, setChartRange] = useState("1D");
  const [chartType, setChartType] = useState("area");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [isUsingDummyData, setIsUsingDummyData] = useState(false);
  const [isAddedToDashboard, setIsAddedToDashboard] = useState(false);

  const indexMapping = {
    "^GSPC": {
      symbol: "SPY",
      name: "S&P 500",
      fullName: "S&P 500 Index",
      description:
        "The S&P 500 tracks the performance of 500 large companies listed on stock exchanges in the United States.",
    },
    "^IXIC": {
      symbol: "QQQ",
      name: "NASDAQ",
      fullName: "NASDAQ Composite",
      description:
        "The NASDAQ Composite Index tracks over 3,000 stocks listed on the NASDAQ stock exchange.",
    },
    "^DJI": {
      symbol: "DIA",
      name: "Dow Jones",
      fullName: "Dow Jones Industrial Average",
      description:
        "The Dow Jones Industrial Average tracks 30 large publicly-owned blue-chip companies trading on the NYSE and NASDAQ.",
    },
    "^VIX": {
      symbol: "VXX",
      name: "VIX",
      fullName: "Volatility Index",
      description:
        "The VIX measures the stock market's expectation of volatility based on S&P 500 index options.",
    },
    "^RUT": {
      symbol: "IWM",
      name: "Russell 2000",
      fullName: "Russell 2000 Index",
      description:
        "The Russell 2000 Index measures the performance of approximately 2,000 smallest-cap American companies.",
    },
  };

  useEffect(() => {
    fetchIndicesData();
  }, []);

  useEffect(() => {
    if (selectedIndex) {
      fetchHistoricalData(selectedIndex.symbol, chartRange);
    }
  }, [selectedIndex, chartRange, chartType]);

  const fetchIndicesData = async () => {
    try {
      setLoading(true);
      // Skip the /indices endpoint and go directly to individual stock calls
      await fetchIndicesDataFallback();
    } catch (error) {
      console.error("Error fetching indices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicesDataFallback = async () => {
    try {
      const promises = Object.entries(indexMapping).map(
        async ([indexSymbol, mapping]) => {
          const response = await fetch(
            `http://localhost:8000/stock/detail/${mapping.symbol}`
          );
          const data = await response.json();
          return {
            ...data,
            indexSymbol,
            ...mapping,
            performance: generatePerformanceData(),
          };
        }
      );

      const indicesData = await Promise.all(promises);
      setIndices(indicesData);

      // Check if there's a selected parameter in URL
      const selectedParam = searchParams.get("selected");
      if (selectedParam) {
        const targetIndex = indicesData.find(
          (index) => index.symbol === selectedParam
        );
        if (targetIndex) {
          setSelectedIndex(targetIndex);
          return;
        }
      }

      // Set S&P 500 as default selected index
      const spyIndex = indicesData.find((index) => index.symbol === "SPY");
      if (spyIndex) {
        setSelectedIndex(spyIndex);
      }
    } catch (error) {
      console.error("Error fetching indices fallback:", error);
    }
  };

  const fetchHistoricalData = async (symbol, range) => {
    try {
      setChartLoading(true);
      setIsUsingDummyData(false);

      const response = await fetch(
        `http://localhost:8000/stock/historical/${symbol}?range=${range}`
      );
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        setHistoricalData(data.data);
      } else {
        throw new Error("Insufficient historical data");
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);

      // Generate dummy data as fallback
      const currentPrice = selectedIndex?.price
        ? parseFloat(selectedIndex.price.replace(/[$,]/g, ""))
        : 150;

      setHistoricalData(generateDummyChartData(range, currentPrice));
      setIsUsingDummyData(true);
    } finally {
      setChartLoading(false);
    }
  };

  // Generate dummy chart data as fallback
  const generateDummyChartData = (range, basePrice = 150) => {
    const data = [];
    // Add some realistic price variation
    const volatility = basePrice * 0.05; // 5% volatility

    if (range === "1D") {
      // Generate hourly data for 1D
      const today = new Date();
      today.setHours(9, 30, 0, 0); // Market open at 9:30 AM

      for (let i = 0; i < 7; i++) {
        // 9:30 AM to 4:00 PM (6.5 hours)
        const hour = today.getHours() + Math.floor(i);
        const minute = (today.getMinutes() + (i % 1) * 60) % 60;
        const timeString = `${hour}:${minute === 0 ? "00" : minute}`;

        // Create some price movement patterns
        const priceChange = (Math.random() - 0.5) * volatility;
        const price = basePrice + priceChange * (i + 1);

        data.push({
          time: timeString,
          price: parseFloat(price.toFixed(2)),
          date: today.toLocaleDateString(),
        });
      }
    } else {
      // For longer ranges: 1W, 1M, 3M, 1Y, 5Y, All
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
          : 30;

      let currentValue = basePrice * 0.9; // Start 10% lower to show growth

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        // Add some random price movement with trend bias
        const trendBias = 0.52; // Slightly upward trend (52% chance of going up)
        const priceChange =
          (Math.random() > 1 - trendBias ? 1 : -1) * Math.random() * volatility;
        currentValue = currentValue + priceChange;

        // Ensure value doesn't go negative
        if (currentValue <= 0) currentValue = basePrice * 0.1;

        data.push({
          date: date.toLocaleDateString(),
          close: parseFloat(currentValue.toFixed(2)),
          open: parseFloat((currentValue - priceChange * 0.5).toFixed(2)),
          high: parseFloat(
            (currentValue + Math.random() * volatility * 0.5).toFixed(2)
          ),
          low: parseFloat(
            (currentValue - Math.random() * volatility * 0.5).toFixed(2)
          ),
          volume: Math.floor(Math.random() * 1000000) + 500000,
        });
      }
    }
    return data;
  };

  const handleAddToDashboard = async (symbol) => {
    try {
      console.log("Adding index to dashboard:", symbol);
      const result = await addStockToDashboard(symbol);
      console.log("Index added successfully:", result);
      setIsAddedToDashboard(true);

      // Show success message with option to navigate to dashboard
      const userResponse = confirm(
        `${symbol} has been successfully added to your dashboard! 🎉\n\nWould you like to go to your Dashboard now to see your watchlist?`
      );

      if (userResponse) {
        navigate("/dashboard");
      }

      // Reset the state after 3 seconds
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

  const generatePerformanceData = () => {
    return {
      todayLow: (Math.random() * 100 + 200).toFixed(2),
      todayHigh: (Math.random() * 100 + 300).toFixed(2),
      open: (Math.random() * 100 + 250).toFixed(2),
      prevClose: (Math.random() * 100 + 245).toFixed(2),
      weekLow52: (Math.random() * 100 + 150).toFixed(2),
      weekHigh52: (Math.random() * 100 + 400).toFixed(2),
    };
  };

  const formatPrice = (price) => {
    if (typeof price === "string" && price.startsWith("$")) {
      return price;
    }
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataKey = chartRange === "1D" ? "price" : "close";
      const value = payload[0]?.payload[dataKey];
      const color = selectedIndex?.isNegative ? "#EF4444" : "#10B981";

      // For candlestick view
      const open = payload[0]?.payload?.open;
      const high = payload[0]?.payload?.high;
      const low = payload[0]?.payload?.low;
      const volume = payload[0]?.payload?.volume;
      const isCandlestick = chartType === "candlestick" && open !== undefined;

      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            isDark
              ? "bg-gray-800 border-gray-700 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <p className="text-sm font-medium mb-1">
            {chartRange === "1D" ? `Time: ${label}` : `Date: ${label}`}
          </p>

          {isCandlestick ? (
            <>
              <p className="text-sm font-medium">
                <span className="mr-2">Open:</span>
                <span style={{ color }}>${open?.toFixed(2)}</span>
              </p>
              <p className="text-sm font-medium">
                <span className="mr-2">Close:</span>
                <span style={{ color }}>${value?.toFixed(2)}</span>
              </p>
              <p className="text-sm font-medium">
                <span className="mr-2">High:</span>
                <span style={{ color: "#10B981" }}>${high?.toFixed(2)}</span>
              </p>
              <p className="text-sm font-medium">
                <span className="mr-2">Low:</span>
                <span style={{ color: "#EF4444" }}>${low?.toFixed(2)}</span>
              </p>
              <p className="text-sm font-medium text-gray-500">
                <span className="mr-2">Volume:</span>
                {volume?.toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium" style={{ color }}>
              {`Price: $${value?.toFixed(2)}`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="loading loading-spinner loading-lg"></div>
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Market Indices
          </h1>
          <p
            className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            Track major market indices and their performance
          </p>

          {/* Market Status */}
          {indices.length > 0 && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <h3
                className={`text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Market Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {indices.slice(0, 5).map((index) => (
                  <div key={index.symbol} className="text-center">
                    <div
                      className={`text-xs ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {index.name}
                    </div>
                    <div
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {index.price}
                    </div>
                    <div
                      className={`text-xs ${
                        index.isNegative ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {index.percent}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Indices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {indices.map((index) => (
            <div
              key={index.symbol}
              onClick={() => setSelectedIndex(index)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedIndex?.symbol === index.symbol
                  ? isDark
                    ? "bg-blue-900 border-blue-700"
                    : "bg-blue-50 border-blue-200"
                  : isDark
                  ? "bg-gray-800 border-gray-700 hover:bg-gray-750"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={`font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {index.name}
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {index.symbol}
                </span>
              </div>

              <div className="space-y-1">
                <div
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatPrice(index.price)}
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-sm font-medium ${
                      index.isNegative ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {index.isNegative ? "" : "+"}
                    {index.change}
                  </span>
                  <span
                    className={`text-sm ${
                      index.isNegative ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    ({index.percent})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Index Details */}
        {selectedIndex && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="lg:col-span-2">
              <div
                className={`p-6 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {selectedIndex.fullName}
                    </h2>
                    <div className="flex items-center space-x-4 mt-2">
                      <span
                        className={`text-3xl font-bold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {formatPrice(selectedIndex.price)}
                      </span>
                      <span
                        className={`text-lg font-medium ${
                          selectedIndex.isNegative
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {selectedIndex.isNegative ? "" : "+"}
                        {selectedIndex.change} ({selectedIndex.percent})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Combined Controls - Time Range and Chart Type */}
                <div className="flex flex-wrap justify-between gap-2 mb-4">
                  {/* Time Range Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-sm font-medium my-auto ${
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

                  {/* Right side with chart type and status */}
                  <div className="flex items-center gap-3">
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

                    <div className="flex items-center space-x-2">
                      {/* Removed 'Last updated' display for users */}
                      <div
                        className={`w-2 h-2 rounded-full ${
                          selectedIndex.status === "live"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        } animate-pulse`}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-96">
                  {chartLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="loading loading-spinner loading-lg"></div>
                      <span
                        className={`ml-4 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Loading chart data...
                      </span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "candlestick" ? (
                        <div className="w-full h-full">
                          <CandlestickChart
                            data={historicalData}
                            height={300}
                            isDark={isDark}
                          />
                        </div>
                      ) : chartType === "bar" ? (
                        <BarChart data={historicalData}>
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
                            fill={
                              selectedIndex?.isNegative ? "#EF4444" : "#10B981"
                            }
                          />
                        </BarChart>
                      ) : (
                        // Default: Area Chart
                        <AreaChart data={historicalData}>
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
                            stroke={
                              selectedIndex?.isNegative ? "#EF4444" : "#10B981"
                            }
                            strokeWidth={2}
                            fill={
                              selectedIndex?.isNegative
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(16, 185, 129, 0.1)"
                            }
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
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
              </div>
            </div>

            {/* Performance Section */}
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div
                className={`p-6 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Performance
                </h3>

                <div className="space-y-4">
                  {/* Today's Range */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Today's Low
                      </span>
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Today's High
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${selectedIndex.performance.todayLow}
                      </span>
                      <span
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${selectedIndex.performance.todayHigh}
                      </span>
                    </div>
                    <div
                      className={`w-full h-2 rounded ${
                        isDark ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className="h-full bg-green-500 rounded relative"
                        style={{ width: "65%" }}
                      >
                        <div className="absolute right-0 top-0 w-3 h-3 bg-green-500 rounded-full transform translate-x-1/2 -translate-y-0.5"></div>
                      </div>
                    </div>
                  </div>

                  {/* Open and Previous Close */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Open
                      </div>
                      <div
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${selectedIndex.performance.open}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Prev. Close
                      </div>
                      <div
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${selectedIndex.performance.prevClose}
                      </div>
                    </div>
                  </div>

                  {/* 52 Week Range */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        52W Low
                      </span>
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        52W High
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${selectedIndex.performance.weekLow52}
                      </span>
                      <span
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${selectedIndex.performance.weekHigh52}
                      </span>
                    </div>
                    <div
                      className={`w-full h-2 rounded ${
                        isDark ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className="h-full bg-blue-500 rounded relative"
                        style={{ width: "45%" }}
                      >
                        <div className="absolute right-0 top-0 w-3 h-3 bg-blue-500 rounded-full transform translate-x-1/2 -translate-y-0.5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div
                className={`p-6 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-3 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  About {selectedIndex.name}
                </h3>
                <p
                  className={`text-sm leading-relaxed mb-4 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {selectedIndex.description}
                </p>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div
                    className={`p-3 rounded-md ${
                      isDark ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <div
                      className={`text-xs ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Market Cap
                    </div>
                    <div
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {selectedIndex.marketCapitalization
                        ? `$${(
                            selectedIndex.marketCapitalization / 1e12
                          ).toFixed(1)}T`
                        : "N/A"}
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-md ${
                      isDark ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <div
                      className={`text-xs ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Volume
                    </div>
                    <div
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {Math.floor(Math.random() * 100 + 50)}M
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div
                className={`p-6 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Performance Summary
                </h3>

                <div className="space-y-3">
                  {[
                    { period: "1 Day", return: selectedIndex.percent },
                    {
                      period: "1 Week",
                      return: `${(Math.random() * 4 - 2).toFixed(2)}%`,
                    },
                    {
                      period: "1 Month",
                      return: `${(Math.random() * 8 - 4).toFixed(2)}%`,
                    },
                    {
                      period: "3 Months",
                      return: `${(Math.random() * 15 - 7.5).toFixed(2)}%`,
                    },
                    {
                      period: "1 Year",
                      return: `${(Math.random() * 30 - 15).toFixed(2)}%`,
                    },
                  ].map((item, index) => {
                    const isPositive = !item.return.startsWith("-");
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {item.period}
                        </span>
                        <span
                          className={`font-medium ${
                            isPositive ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {item.return}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Single button to navigate to detailed page of the index */}
              <div className="mt-6">
                <button
                  onClick={() => navigate(`/stock/${selectedIndex.symbol}`)}
                  className="w-full btn btn-primary text-base px-6 py-3 rounded-lg font-semibold shadow-md"
                >
                  View Detailed Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IndicesPage;
