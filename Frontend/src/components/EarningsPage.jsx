import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { earningsService } from "../services/earningsService";

function EarningsPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("upcoming");
  const [loading, setLoading] = useState(false);
  const [earningsData, setEarningsData] = useState({
    upcoming: [],
    recent: [],
  });
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch earnings calendar data from API
  useEffect(() => {
    const fetchEarningsData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await earningsService.getEarningsCalendar();
        if (data.error) {
          throw new Error(data.error);
        }
        setEarningsData({
          upcoming: data.upcoming || [],
          recent: data.recent || [],
        });
      } catch (err) {
        console.error("Error fetching earnings data:", err);
        setError("Failed to load earnings data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, []);

  // Fetch analysis data for AAPL (default)
  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const data = await earningsService.getEarningsAnalysis("AAPL");
        if (!data.error) {
          setAnalysisData(data);
        }
      } catch (err) {
        console.error("Error fetching analysis data:", err);
      }
    };

    if (activeTab === "analysis") {
      fetchAnalysisData();
    }
  }, [activeTab]);

  // Mock historical earnings data for detailed analysis (fallback if API fails)
  const getMockHistoricalData = (symbol) =>
    ({
      AAPL: {
        quarters: analysisData?.quarters || [
          {
            quarter: "Q1 2025",
            actualEPS: 2.18,
            estimatedEPS: 2.1,
            actualRevenue: 119.6,
            estimatedRevenue: 117.9,
            surprise: 3.8,
            reaction: "+2.3%",
          },
          {
            quarter: "Q4 2024",
            actualEPS: 2.18,
            estimatedEPS: 2.11,
            actualRevenue: 119.6,
            estimatedRevenue: 117.3,
            surprise: 3.3,
            reaction: "+1.8%",
          },
          {
            quarter: "Q3 2024",
            actualEPS: 1.64,
            estimatedEPS: 1.6,
            actualRevenue: 94.9,
            estimatedRevenue: 94.5,
            surprise: 2.5,
            reaction: "+0.8%",
          },
          {
            quarter: "Q2 2024",
            actualEPS: 1.4,
            estimatedEPS: 1.35,
            actualRevenue: 85.8,
            estimatedRevenue: 84.4,
            surprise: 3.7,
            reaction: "+2.9%",
          },
        ],
        ratios: analysisData?.ratios || {
          currentPE: 28.5,
          forwardPE: 26.2,
          pegRatio: 2.1,
          earningsYield: 3.5,
          priceToSales: 7.8,
          epsGrowth: 8.2,
        },
        guidance: analysisData?.guidance || {
          nextQuarterEPS: "1.32 - 1.38",
          nextQuarterRevenue: "84.0 - 87.0B",
          fyEstimate: "6.10 - 6.25",
          analystCount: 24,
          strongBuy: 12,
          buy: 8,
          hold: 4,
          sell: 0,
        },
      },
    }[symbol] || {});

  const mockHistoricalData = getMockHistoricalData("AAPL");

  // Earnings education strategies
  const earningsStrategies = [
    {
      id: 1,
      name: "Earnings Momentum Play",
      difficulty: "Intermediate",
      riskLevel: "Medium-High",
      description:
        "Buy stocks showing consistent earnings beats and raising guidance",
      example:
        "NVDA consistently beating estimates by 15%+ with raised guidance",
      timeFrame: "1-3 months (earnings cycle)",
      successRate: "60-70%",
      avgReturn: "15-25% per cycle",
      pros: [
        "Clear fundamental catalyst",
        "Institutional buying support",
        "Momentum continuation",
        "Multiple expansion",
      ],
      cons: [
        "High valuation risk",
        "Guidance dependent",
        "Market sentiment risk",
        "Crowded trades",
      ],
      tutorial: {
        steps: [
          "Screen for stocks with 3+ consecutive earnings beats",
          "Look for revenue growth acceleration, not just EPS beats",
          "Check if company is raising full-year guidance",
          "Enter position 2-3 weeks before earnings announcement",
          "Set stop-loss at 8-10% below entry, profit target at 20-30%",
        ],
        tips: [
          "Focus on companies with strong competitive moats",
          "Avoid earnings plays during market downturns",
          "Pay attention to sector rotation and macro trends",
        ],
      },
    },
    {
      id: 2,
      name: "Earnings Reversal Strategy",
      difficulty: "Advanced",
      riskLevel: "High",
      description:
        "Buy beaten-down quality stocks after earnings disappointments",
      example: "META after Q4 2022 metaverse concerns, recovered 180%",
      timeFrame: "3-12 months",
      successRate: "40-50%",
      avgReturn: "50-100%+ when right",
      pros: [
        "Contrarian edge",
        "Lower entry prices",
        "Institutional re-entry",
        "Multiple re-rating potential",
      ],
      cons: [
        "Falling knife risk",
        "Extended downtrend",
        "Fundamental deterioration",
        "Long holding periods",
      ],
      tutorial: {
        steps: [
          "Identify quality companies with temporary setbacks",
          "Analyze if earnings miss is cyclical or structural",
          "Wait for capitulation selling and insider buying",
          "Enter in stages during 3-6 month accumulation period",
          "Focus on management commentary about future improvements",
        ],
        tips: [
          "Only buy companies with strong balance sheets",
          "Avoid secular declining industries",
          "Wait for signs of operational improvements",
        ],
      },
    },
    {
      id: 3,
      name: "Pre-Earnings Runup",
      difficulty: "Beginner",
      riskLevel: "Medium",
      description: "Capture momentum before earnings announcements",
      example: "Buy AMZN 2 weeks before earnings, sell day before",
      timeFrame: "2-4 weeks",
      successRate: "55-65%",
      avgReturn: "3-8% per trade",
      pros: [
        "Predictable pattern",
        "Limited time exposure",
        "Multiple opportunities",
        "Options strategies available",
      ],
      cons: [
        "Whipsaw risk",
        "Guidance dependent",
        "Market timing required",
        "Lower absolute returns",
      ],
      tutorial: {
        steps: [
          "Identify stocks with historical pre-earnings momentum",
          "Enter position 3-4 weeks before earnings date",
          "Monitor unusual options activity for confirmation",
          "Exit 1-2 days before earnings (avoid announcement risk)",
          "Use technical analysis to time entry and exit points",
        ],
        tips: [
          "Focus on high-beta growth stocks for better momentum",
          "Avoid during earnings recession or market stress",
          "Consider selling covered calls to enhance returns",
        ],
      },
    },
    {
      id: 4,
      name: "Earnings Options Straddle",
      difficulty: "Advanced",
      riskLevel: "High",
      description:
        "Profit from high volatility around earnings regardless of direction",
      example: "TSLA straddle before earnings expecting 8%+ move",
      timeFrame: "1-3 days (earnings event)",
      successRate: "45-55%",
      avgReturn: "20-40% when profitable",
      pros: [
        "Direction neutral",
        "High profit potential",
        "Defined risk",
        "Volatility play",
      ],
      cons: [
        "Time decay risk",
        "Expensive premium",
        "Large moves needed",
        "Volatility crush",
      ],
      tutorial: {
        steps: [
          "Select stocks with historical >6% earnings moves",
          "Buy ATM call and put 1-2 weeks before earnings",
          "Ensure implied volatility is below historical volatility",
          "Plan exit strategy before volatility crush",
          "Calculate breakeven points and required move size",
        ],
        tips: [
          "Avoid if IV rank is above 75th percentile",
          "Consider iron condors if expecting smaller moves",
          "Exit winning side early if stock moves strongly pre-earnings",
        ],
      },
    },
  ];

  const StrategyCard = ({ strategy }) => (
    <div
      className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isDark
          ? "bg-gray-800 border-gray-700 hover:border-blue-500"
          : "bg-white border-gray-200 hover:border-blue-300"
      }`}
      onClick={() => setSelectedStock(strategy)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3
          className={`font-bold text-lg ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {strategy.name}
        </h3>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              strategy.difficulty === "Beginner"
                ? "bg-green-100 text-green-800"
                : strategy.difficulty === "Intermediate"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {strategy.difficulty}
          </span>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              strategy.riskLevel === "Low" || strategy.riskLevel === "Medium"
                ? "bg-blue-100 text-blue-800"
                : strategy.riskLevel === "Medium-High"
                ? "bg-orange-100 text-orange-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {strategy.riskLevel} Risk
          </span>
        </div>
      </div>

      <p
        className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}
      >
        {strategy.description}
      </p>

      <div
        className={`text-xs space-y-1 ${
          isDark ? "text-gray-400" : "text-gray-500"
        }`}
      >
        <div>
          <strong>Time Frame:</strong> {strategy.timeFrame}
        </div>
        <div>
          <strong>Success Rate:</strong> {strategy.successRate}
        </div>
        <div>
          <strong>Average Return:</strong> {strategy.avgReturn}
        </div>
      </div>
    </div>
  );

  const StrategyDetail = ({ strategy }) => (
    <div
      className={`p-6 rounded-lg border ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <h2
          className={`text-2xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {strategy.name}
        </h2>
        <button
          onClick={() => setSelectedStock(null)}
          className={`p-2 rounded-full hover:bg-gray-100 ${
            isDark ? "hover:bg-gray-700" : ""
          }`}
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3
            className={`font-semibold mb-3 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Strategy Overview
          </h3>
          <div
            className={`space-y-2 text-sm ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            <div>
              <strong>Example:</strong> {strategy.example}
            </div>
            <div>
              <strong>Time Frame:</strong> {strategy.timeFrame}
            </div>
            <div>
              <strong>Success Rate:</strong> {strategy.successRate}
            </div>
            <div>
              <strong>Average Return:</strong> {strategy.avgReturn}
            </div>
          </div>
        </div>

        <div>
          <h3
            className={`font-semibold mb-3 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Pros & Cons
          </h3>
          <div className="space-y-2">
            <div>
              <div className="text-green-600 font-medium text-sm mb-1">
                Pros:
              </div>
              <ul
                className={`text-xs space-y-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {strategy.pros.map((pro, i) => (
                  <li key={i}>• {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-red-600 font-medium text-sm mb-1">Cons:</div>
              <ul
                className={`text-xs space-y-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {strategy.cons.map((con, i) => (
                  <li key={i}>• {con}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3
            className={`font-semibold mb-3 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Step-by-Step Tutorial
          </h3>
          <ol
            className={`space-y-2 text-sm ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {strategy.tutorial.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3
            className={`font-semibold mb-3 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Pro Tips
          </h3>
          <ul
            className={`space-y-2 text-sm ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {strategy.tutorial.tips.map((tip, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-yellow-500">💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="loading loading-spinner loading-lg"></div>
              <p
                className={`text-lg ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Loading earnings data...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="text-red-500 text-6xl">⚠️</div>
              <p
                className={`text-lg ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                Try Again
              </button>
            </div>
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
            Earnings Intelligence Hub
          </h1>
          <p
            className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            Track earnings reports, analyze results, and master earnings-driven
            investment strategies
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            {["calendar", "analysis", "strategies"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab === "calendar" && "📅 Calendar"}
                {tab === "analysis" && "📊 Analysis"}
                {tab === "strategies" && "🎯 Strategies"}
              </button>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "calendar" && (
          <div className="space-y-8">
            {/* Time Frame Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTimeFrame("upcoming")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedTimeFrame === "upcoming"
                    ? "bg-blue-500 text-white"
                    : isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Upcoming Earnings
              </button>
              <button
                onClick={() => setSelectedTimeFrame("recent")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedTimeFrame === "recent"
                    ? "bg-blue-500 text-white"
                    : isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Recent Results
              </button>
            </div>

            {/* Upcoming Earnings */}
            {selectedTimeFrame === "upcoming" && (
              <div>
                <h2
                  className={`text-xl font-semibold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Upcoming Earnings Reports
                </h2>
                {earningsData.upcoming.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {earningsData.upcoming.map((earning, i) => (
                      <div
                        key={i}
                        onClick={() => navigate(`/stock/${earning.symbol}`)}
                        className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                            : "bg-white border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3
                                className={`font-bold text-lg ${
                                  isDark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {earning.symbol}
                              </h3>
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {earning.quarter}
                              </span>
                              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                {earningsService.getDaysUntilEarnings(
                                  earning.date
                                )}
                              </span>
                            </div>
                            <p
                              className={`text-sm font-medium mb-1 ${
                                isDark ? "text-gray-200" : "text-gray-700"
                              }`}
                            >
                              {earning.company}
                            </p>
                            <p
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {earningsService.formatDate(earning.date)} •{" "}
                              {earning.time}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              EPS Estimate
                            </div>
                            <div
                              className={`font-bold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              ${(earning.estimatedEPS || 0).toFixed(2)}
                            </div>
                            <div
                              className={`text-xs ${
                                (earning.estimatedEPS || 0) >
                                (earning.previousEPS || 0)
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              vs ${(earning.previousEPS || 0).toFixed(2)} prev
                            </div>
                          </div>
                          <div>
                            <div
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Revenue Est.
                            </div>
                            <div
                              className={`font-bold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              ${(earning.estimatedRevenue || 0).toFixed(1)}B
                            </div>
                            <div
                              className={`text-xs ${
                                (earning.estimatedRevenue || 0) >
                                (earning.previousRevenue || 0)
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              vs ${(earning.previousRevenue || 0).toFixed(1)}B
                              prev
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Market Cap:{" "}
                            {earningsService.formatMarketCap(earning.marketCap)}
                          </span>
                          <span
                            className={`${
                              isDark ? "text-yellow-400" : "text-yellow-600"
                            }`}
                          >
                            {earning.volatility || "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`text-center py-12 ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <div className="text-4xl mb-4">📊</div>
                    <p>No upcoming earnings data available</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Results */}
            {selectedTimeFrame === "recent" && (
              <div>
                <h2
                  className={`text-xl font-semibold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Recent Earnings Results
                </h2>
                {earningsData.recent.length > 0 ? (
                  <div className="space-y-4">
                    {earningsData.recent.map((earning, i) => (
                      <div
                        key={i}
                        onClick={() => navigate(`/stock/${earning.symbol}`)}
                        className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                          isDark
                            ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                            : "bg-white border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3
                                className={`font-bold text-lg ${
                                  isDark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {earning.symbol}
                              </h3>
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {earning.quarter}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  (earning.surprise || 0) > 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {(earning.surprise || 0) > 0 ? "BEAT" : "MISS"}
                              </span>
                            </div>
                            <p
                              className={`text-sm font-medium mb-1 ${
                                isDark ? "text-gray-200" : "text-gray-700"
                              }`}
                            >
                              {earning.company}
                            </p>
                            <p
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {earningsService.formatDate(earning.date)} •{" "}
                              {earning.time}
                            </p>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-lg font-bold ${
                                earning.reaction?.includes("+")
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {earning.reaction || "N/A"}
                            </div>
                            <div
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Stock Reaction
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <div
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              EPS
                            </div>
                            <div
                              className={`font-bold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              ${(earning.actualEPS || 0).toFixed(2)}
                            </div>
                            <div
                              className={`text-xs ${
                                (earning.actualEPS || 0) >
                                (earning.estimatedEPS || 0)
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              vs ${(earning.estimatedEPS || 0).toFixed(2)} est
                            </div>
                          </div>
                          <div>
                            <div
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Revenue
                            </div>
                            <div
                              className={`font-bold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              ${(earning.actualRevenue || 0).toFixed(1)}B
                            </div>
                            <div
                              className={`text-xs ${
                                (earning.actualRevenue || 0) >
                                (earning.estimatedRevenue || 0)
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              vs ${(earning.estimatedRevenue || 0).toFixed(1)}B
                              est
                            </div>
                          </div>
                          <div>
                            <div
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Surprise %
                            </div>
                            <div
                              className={`font-bold ${
                                (earning.surprise || 0) > 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {(earning.surprise || 0) > 0 ? "+" : ""}
                              {(earning.surprise || 0).toFixed(1)}%
                            </div>
                            <div
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              vs estimates
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`${
                              isDark ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            Revenue Growth:{" "}
                            {(earning.revenueGrowth || 0).toFixed(1)}% YoY
                          </span>
                          <span
                            className={`${
                              isDark ? "text-yellow-400" : "text-yellow-600"
                            }`}
                          >
                            Guidance: {earning.guidance || "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`text-center py-12 ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <div className="text-4xl mb-4">📈</div>
                    <p>No recent earnings data available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-8">
            {/* Stock Selection for Analysis */}
            <div
              className={`p-6 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <h2
                className={`text-xl font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Detailed Earnings Analysis - AAPL
              </h2>

              {/* Historical Earnings Performance */}
              <div className="mb-6">
                <h3
                  className={`font-medium mb-3 ${
                    isDark ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Historical Earnings Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
                      <tr>
                        <th
                          className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                            isDark ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          Quarter
                        </th>
                        <th
                          className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                            isDark ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          Actual EPS
                        </th>
                        <th
                          className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                            isDark ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          Est. EPS
                        </th>
                        <th
                          className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                            isDark ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          Revenue
                        </th>
                        <th
                          className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                            isDark ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          Surprise %
                        </th>
                        <th
                          className={`px-4 py-2 text-left text-xs font-medium uppercase ${
                            isDark ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          Reaction
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        isDark ? "divide-gray-700" : "divide-gray-200"
                      }`}
                    >
                      {mockHistoricalData?.quarters?.length > 0 ? (
                        mockHistoricalData.quarters.map((quarter, i) => (
                          <tr key={i}>
                            <td
                              className={`px-4 py-3 text-sm font-medium ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {quarter.quarter}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm ${
                                isDark ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              ${(quarter.actualEPS || 0).toFixed(2)}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm ${
                                isDark ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              ${(quarter.estimatedEPS || 0).toFixed(2)}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm ${
                                isDark ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              ${(quarter.actualRevenue || 0).toFixed(1)}B
                            </td>
                            <td
                              className={`px-4 py-3 text-sm font-medium ${
                                (quarter.surprise || 0) > 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {(quarter.surprise || 0) > 0 ? "+" : ""}
                              {(quarter.surprise || 0).toFixed(1)}%
                            </td>
                            <td
                              className={`px-4 py-3 text-sm font-medium ${
                                quarter.reaction?.includes("+")
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {quarter.reaction || "N/A"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className={`px-4 py-3 text-center ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            No historical data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Ratios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3
                    className={`font-medium mb-3 ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Valuation Ratios
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        label: "P/E Ratio (Current)",
                        value: mockHistoricalData?.ratios?.currentPE || 0,
                        unit: "x",
                      },
                      {
                        label: "Forward P/E",
                        value: mockHistoricalData?.ratios?.forwardPE || 0,
                        unit: "x",
                      },
                      {
                        label: "PEG Ratio",
                        value: mockHistoricalData?.ratios?.pegRatio || 0,
                        unit: "",
                      },
                      {
                        label: "Earnings Yield",
                        value: mockHistoricalData?.ratios?.earningsYield || 0,
                        unit: "%",
                      },
                      {
                        label: "Price/Sales",
                        value: mockHistoricalData?.ratios?.priceToSales || 0,
                        unit: "x",
                      },
                      {
                        label: "EPS Growth (TTM)",
                        value: mockHistoricalData?.ratios?.epsGrowth || 0,
                        unit: "%",
                      },
                    ].map((ratio, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center"
                      >
                        <span
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {ratio.label}
                        </span>
                        <span
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {ratio.value}
                          {ratio.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3
                    className={`font-medium mb-3 ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Analyst Estimates & Guidance
                  </h3>
                  <div className="space-y-3">
                    <div
                      className={`p-3 rounded border ${
                        isDark
                          ? "border-gray-600 bg-gray-700"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Next Quarter EPS
                      </div>
                      <div className={`text-lg font-bold text-blue-500`}>
                        {mockHistoricalData?.guidance?.nextQuarterEPS || "N/A"}
                      </div>
                    </div>
                    <div
                      className={`p-3 rounded border ${
                        isDark
                          ? "border-gray-600 bg-gray-700"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        FY 2025 EPS Estimate
                      </div>
                      <div className={`text-lg font-bold text-blue-500`}>
                        ${mockHistoricalData?.guidance?.fyEstimate || "N/A"}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center text-xs">
                      <div
                        className={`p-2 rounded ${
                          isDark ? "bg-green-900" : "bg-green-100"
                        }`}
                      >
                        <div className="font-bold text-green-600">
                          {mockHistoricalData?.guidance?.strongBuy || 0}
                        </div>
                        <div
                          className={isDark ? "text-gray-400" : "text-gray-600"}
                        >
                          Strong Buy
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded ${
                          isDark ? "bg-blue-900" : "bg-blue-100"
                        }`}
                      >
                        <div className="font-bold text-blue-600">
                          {mockHistoricalData?.guidance?.buy || 0}
                        </div>
                        <div
                          className={isDark ? "text-gray-400" : "text-gray-600"}
                        >
                          Buy
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded ${
                          isDark ? "bg-yellow-900" : "bg-yellow-100"
                        }`}
                      >
                        <div className="font-bold text-yellow-600">
                          {mockHistoricalData?.guidance?.hold || 0}
                        </div>
                        <div
                          className={isDark ? "text-gray-400" : "text-gray-600"}
                        >
                          Hold
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded ${
                          isDark ? "bg-red-900" : "bg-red-100"
                        }`}
                      >
                        <div className="font-bold text-red-600">
                          {mockHistoricalData?.guidance?.sell || 0}
                        </div>
                        <div
                          className={isDark ? "text-gray-400" : "text-gray-600"}
                        >
                          Sell
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Impact Analysis */}
            <div
              className={`p-6 rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <h2
                className={`text-xl font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Earnings Impact on Stock Price
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    metric: "Average Move",
                    value: "±4.2%",
                    description: "Average stock movement day after earnings",
                    color: "blue",
                  },
                  {
                    metric: "Beat Reaction",
                    value: "+2.8%",
                    description: "Average gain when beating estimates",
                    color: "green",
                  },
                  {
                    metric: "Miss Reaction",
                    value: "-5.1%",
                    description: "Average decline when missing estimates",
                    color: "red",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`text-center p-4 rounded border ${
                      isDark
                        ? "border-gray-600 bg-gray-700"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div
                      className={`text-2xl font-bold ${
                        item.color === "green"
                          ? "text-green-500"
                          : item.color === "red"
                          ? "text-red-500"
                          : "text-blue-500"
                      }`}
                    >
                      {item.value}
                    </div>
                    <div
                      className={`font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {item.metric}
                    </div>
                    <div
                      className={`text-xs ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "strategies" && (
          <div className="space-y-8">
            {selectedStock ? (
              <StrategyDetail strategy={selectedStock} />
            ) : (
              <>
                <div
                  className={`p-6 rounded-lg border ${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <h2
                    className={`text-xl font-semibold mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Earnings Strategy Fundamentals
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        title: "Earnings Surprise",
                        desc: "Actual vs Expected results drive stock moves",
                        icon: "📈",
                        color: "green",
                      },
                      {
                        title: "Guidance Matters",
                        desc: "Forward outlook often more important than past results",
                        icon: "🔮",
                        color: "blue",
                      },
                      {
                        title: "Sector Context",
                        desc: "Compare performance within industry peers",
                        icon: "🏭",
                        color: "purple",
                      },
                      {
                        title: "Options Activity",
                        desc: "Unusual volume indicates expected volatility",
                        icon: "⚡",
                        color: "yellow",
                      },
                    ].map((concept, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border-l-4 ${
                          concept.color === "green"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : concept.color === "blue"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : concept.color === "yellow"
                            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                            : "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{concept.icon}</span>
                          <h3
                            className={`font-semibold ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {concept.title}
                          </h3>
                        </div>
                        <p
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {concept.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2
                    className={`text-xl font-semibold mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Earnings Trading Strategies - Click to Learn
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {earningsStrategies.map((strategy) => (
                      <StrategyCard key={strategy.id} strategy={strategy} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EarningsPage;
