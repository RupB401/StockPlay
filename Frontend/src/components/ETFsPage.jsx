import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

function ETFsPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [etfs, setEtfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("learn");
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  // ETF Investment Strategies for Learning
  const etfStrategies = [
    {
      id: 1,
      name: "Core-Satellite Strategy",
      difficulty: "Beginner",
      riskLevel: "Low",
      description:
        "Build a portfolio with a core broad market ETF and satellite specialized ETFs",
      example:
        "70% VTI (Total Market) + 20% QQQ (Tech) + 10% VXUS (International)",
      allocation: "Core: 60-80%, Satellites: 20-40%",
      timeHorizon: "Long-term (5+ years)",
      suitableFor: "New investors, retirement accounts",
      pros: [
        "Instant diversification",
        "Low cost",
        "Simple to maintain",
        "Tax efficient",
      ],
      cons: ["Limited customization", "Market risk", "No active management"],
      tutorial: {
        steps: [
          "Choose a broad market ETF as your core (70-80% allocation)",
          "Select 2-4 satellite ETFs for specific exposure (sectors, regions, themes)",
          "Rebalance quarterly or when allocations drift 5% from targets",
          "Review strategy annually and adjust satellites based on market conditions",
          "Keep expense ratios low and maintain diversification",
        ],
        tips: [
          "Start with VTI or VOO as your core holding",
          "Don't over-diversify - 3-6 ETFs are usually sufficient",
          "Use tax-advantaged accounts for frequent rebalancing",
        ],
      },
    },
    {
      id: 2,
      name: "Dollar-Cost Averaging",
      difficulty: "Beginner",
      riskLevel: "Low",
      description:
        "Invest a fixed amount regularly regardless of market conditions",
      example: "$500/month into SPY over 12 months",
      allocation: "Fixed dollar amount, variable shares",
      timeHorizon: "Long-term (3+ years)",
      suitableFor: "Regular savers, emotional investors",
      pros: [
        "Reduces timing risk",
        "Builds discipline",
        "Smooths volatility",
        "Easy automation",
      ],
      cons: [
        "May buy at peaks",
        "Requires discipline",
        "Opportunity cost in bull markets",
      ],
      tutorial: {
        steps: [
          "Determine monthly investment amount you can consistently afford",
          "Choose 1-3 broad market ETFs (SPY, VTI, or target-date funds)",
          "Set up automatic investments on the same date each month",
          "Ignore short-term market fluctuations and stick to the plan",
          "Review and adjust amount annually based on income changes",
        ],
        tips: [
          "Start small and increase gradually as income grows",
          "Use commission-free brokers to minimize costs",
          "Consider increasing contributions during market downturns",
        ],
      },
    },
    {
      id: 3,
      name: "Sector Rotation Strategy",
      difficulty: "Intermediate",
      riskLevel: "Medium",
      description: "Rotate between sector ETFs based on economic cycles",
      example:
        "XLF (Financials) in rising rates, XLP (Consumer Staples) in recession",
      allocation: "Based on economic cycle analysis",
      timeHorizon: "Medium-term (6 months - 2 years)",
      suitableFor: "Active investors, market followers",
      pros: [
        "Potential outperformance",
        "Economic awareness",
        "Tactical flexibility",
      ],
      cons: [
        "Timing difficulty",
        "Higher turnover",
        "Requires research",
        "Tax implications",
      ],
      tutorial: {
        steps: [
          "Study economic cycles and sector performance patterns",
          "Identify current economic phase (early/mid/late cycle, recession)",
          "Select 3-5 sector ETFs that historically perform well in current phase",
          "Monitor economic indicators and sector relative strength",
          "Rotate positions as economic cycle evolves",
        ],
        tips: [
          "Use sector momentum and relative strength indicators",
          "Don't chase performance - anticipate cycle changes",
          "Keep some core broad market exposure for stability",
        ],
      },
    },
    {
      id: 4,
      name: "Geographic Diversification",
      difficulty: "Intermediate",
      riskLevel: "Medium",
      description: "Spread investments across different countries and regions",
      example: "50% US (VTI), 30% Developed (VEA), 20% Emerging (VWO)",
      allocation: "Based on global market cap or equal weight",
      timeHorizon: "Long-term (5+ years)",
      suitableFor: "Global investors, currency diversifiers",
      pros: [
        "Reduced country risk",
        "Currency diversification",
        "Growth opportunities",
      ],
      cons: [
        "Currency risk",
        "Political risk",
        "Higher complexity",
        "Tax complications",
      ],
      tutorial: {
        steps: [
          "Determine desired geographic allocation (home bias vs global market cap)",
          "Choose broad developed market ETFs (VEA, IEFA, EFA)",
          "Add emerging markets exposure (VWO, IEMG, EEM) - typically 10-20%",
          "Consider currency hedged versions for stability (HEDJ, HEFA)",
          "Rebalance annually or when allocations drift significantly",
        ],
        tips: [
          "Start with 20-30% international allocation",
          "Consider tax implications of foreign ETFs",
          "Use broad-based funds before country-specific ETFs",
        ],
      },
    },
    {
      id: 5,
      name: "Factor Investing",
      difficulty: "Advanced",
      riskLevel: "Medium-High",
      description:
        "Target specific risk factors like value, momentum, quality, or size",
      example: "Tilt toward VTV (Value) + MTUM (Momentum) + QUAL (Quality)",
      allocation: "Factor weights based on research and conviction",
      timeHorizon: "Long-term (7+ years)",
      suitableFor: "Sophisticated investors, factor believers",
      pros: [
        "Potential excess returns",
        "Academic backing",
        "Customizable exposure",
      ],
      cons: [
        "Factor risk",
        "Underperformance periods",
        "Higher costs",
        "Complex tracking",
      ],
      tutorial: {
        steps: [
          "Research factor premiums and their historical performance",
          "Choose 2-3 factors with low correlation (value + momentum, quality + size)",
          "Select factor ETFs with strong methodology and low costs",
          "Determine factor allocation (10-30% tilt from market cap weights)",
          "Monitor factor performance and maintain discipline during underperformance",
        ],
        tips: [
          "Combine factors that work well together (momentum + quality)",
          "Be prepared for long periods of underperformance",
          "Factor investing requires patience and conviction",
        ],
      },
    },
    {
      id: 6,
      name: "Bond Ladder with ETFs",
      difficulty: "Advanced",
      riskLevel: "Low-Medium",
      description: "Create bond exposure using ETFs with different durations",
      example:
        "SHY (1-3yr) + IEI (3-7yr) + TLT (20+yr) for yield curve exposure",
      allocation: "Based on duration target and yield curve view",
      timeHorizon: "Medium to Long-term (3-10 years)",
      suitableFor: "Income investors, retirees, portfolio balancers",
      pros: [
        "Interest rate risk management",
        "Predictable income",
        "Diversification",
      ],
      cons: [
        "Interest rate risk",
        "Credit risk",
        "Inflation risk",
        "Lower expected returns",
      ],
      tutorial: {
        steps: [
          "Determine target portfolio duration and credit quality",
          "Select treasury ETFs for different duration buckets (SHY, IEI, IEF, TLT)",
          "Add corporate bond ETFs for additional yield (LQD, HYG, JNK)",
          "Consider international bonds for diversification (BNDX, VTEB)",
          "Rebalance based on duration drift and yield curve changes",
        ],
        tips: [
          "Match bond duration to your investment timeline",
          "Consider TIPS for inflation protection (SCHP, VTIP)",
          "Use municipal bond ETFs in taxable accounts (MUB, VTEB)",
        ],
      },
    },
  ];

  // ETF Categories with educational content
  const etfCategories = [
    {
      name: "Broad Market",
      description: "Diversified exposure to entire stock markets",
      examples: ["VTI", "VOO", "ITOT"],
      riskLevel: "Medium",
      icon: "🌐",
      bestFor: "Core holdings, beginners, long-term investors",
      considerations:
        "Market risk, no active management, broad diversification",
    },
    {
      name: "Sector ETFs",
      description: "Focused exposure to specific industry sectors",
      examples: ["XLK", "XLF", "XLE"],
      riskLevel: "High",
      icon: "🏭",
      bestFor: "Tactical allocation, sector rotation, thematic investing",
      considerations: "Concentration risk, sector cycles, higher volatility",
    },
    {
      name: "International",
      description: "Exposure to foreign developed and emerging markets",
      examples: ["VEA", "VWO", "IEFA"],
      riskLevel: "Medium-High",
      icon: "🌍",
      bestFor: "Geographic diversification, global exposure",
      considerations: "Currency risk, political risk, tax implications",
    },
    {
      name: "Fixed Income",
      description: "Government and corporate bonds of various durations",
      examples: ["BND", "TLT", "LQD"],
      riskLevel: "Low-Medium",
      icon: "🏛️",
      bestFor: "Income generation, portfolio stability, diversification",
      considerations: "Interest rate risk, credit risk, inflation risk",
    },
    {
      name: "Factor/Smart Beta",
      description: "Weighted by factors like value, momentum, quality",
      examples: ["VTV", "MTUM", "QUAL"],
      riskLevel: "Medium-High",
      icon: "📊",
      bestFor: "Factor exposure, potential outperformance, academic strategies",
      considerations: "Factor risk, tracking error, higher fees",
    },
    {
      name: "Commodities",
      description: "Exposure to physical commodities and futures",
      examples: ["GLD", "SLV", "DBC"],
      riskLevel: "High",
      icon: "🥇",
      bestFor: "Inflation hedge, diversification, commodity exposure",
      considerations: "Volatility, storage costs, tax treatment",
    },
  ];

  // Popular ETFs including the index ETFs
  const popularETFs = [
    {
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      category: "Large Cap",
      description: "Tracks the S&P 500 Index",
    },
    {
      symbol: "QQQ",
      name: "Invesco QQQ ETF",
      category: "Technology",
      description: "Tracks the NASDAQ-100 Index",
    },
    {
      symbol: "DIA",
      name: "SPDR Dow Jones Industrial Average ETF",
      category: "Large Cap",
      description: "Tracks the Dow Jones Industrial Average",
    },
    {
      symbol: "IWM",
      name: "iShares Russell 2000 ETF",
      category: "Small Cap",
      description: "Tracks the Russell 2000 Index",
    },
    {
      symbol: "VXX",
      name: "iPath Series B S&P 500 VIX Short-Term Futures ETN",
      category: "Volatility",
      description: "Tracks the S&P 500 VIX Short-Term Futures Index",
    },
    {
      symbol: "VTI",
      name: "Vanguard Total Stock Market ETF",
      category: "Broad Market",
      description: "Tracks the entire U.S. stock market",
    },
    {
      symbol: "VOO",
      name: "Vanguard S&P 500 ETF",
      category: "Large Cap",
      description: "Tracks the S&P 500 Index",
    },
    {
      symbol: "ARKK",
      name: "ARK Innovation ETF",
      category: "Innovation",
      description: "Focuses on disruptive innovation companies",
    },
    {
      symbol: "GLD",
      name: "SPDR Gold Shares",
      category: "Commodities",
      description: "Tracks the price of gold bullion",
    },
    {
      symbol: "TLT",
      name: "iShares 20+ Year Treasury Bond ETF",
      category: "Bonds",
      description: "Tracks long-term U.S. Treasury bonds",
    },
    {
      symbol: "XLF",
      name: "Financial Select Sector SPDR Fund",
      category: "Financial",
      description: "Tracks financial sector stocks",
    },
    {
      symbol: "XLK",
      name: "Technology Select Sector SPDR Fund",
      category: "Technology",
      description: "Tracks technology sector stocks",
    },
  ];

  useEffect(() => {
    fetchETFData();
  }, []);

  const fetchETFData = async () => {
    try {
      setLoading(true);
      // Fetch data for each ETF
      const etfPromises = popularETFs.map(async (etf) => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/stock/detail/${etf.symbol}`
          );
          const data = await response.json();
          return {
            ...etf,
            price: data.price || "$0.00",
            change: data.change || "0.00",
            percent: data.percent || "0.00%",
            isNegative: data.isNegative || false,
            status: data.status || "unknown",
          };
        } catch (error) {
          console.error(`Error fetching ${etf.symbol}:`, error);
          return {
            ...etf,
            price: "$0.00",
            change: "0.00",
            percent: "0.00%",
            isNegative: false,
            status: "error",
          };
        }
      });

      const etfData = await Promise.all(etfPromises);
      setEtfs(etfData);
    } catch (error) {
      console.error("Error fetching ETF data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Large Cap": "bg-blue-100 text-blue-800",
      Technology: "bg-purple-100 text-purple-800",
      "Small Cap": "bg-green-100 text-green-800",
      Volatility: "bg-red-100 text-red-800",
      "Broad Market": "bg-indigo-100 text-indigo-800",
      Innovation: "bg-pink-100 text-pink-800",
      Commodities: "bg-yellow-100 text-yellow-800",
      Bonds: "bg-gray-100 text-gray-800",
      Financial: "bg-orange-100 text-orange-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const StrategyCard = ({ strategy }) => (
    <div
      className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isDark
          ? "bg-gray-800 border-gray-700 hover:border-blue-500"
          : "bg-white border-gray-200 hover:border-blue-300"
      } ${
        selectedStrategy?.id === strategy.id
          ? isDark
            ? "border-blue-500"
            : "border-blue-400"
          : ""
      }`}
      onClick={() => setSelectedStrategy(strategy)}
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
              strategy.riskLevel === "Low"
                ? "bg-blue-100 text-blue-800"
                : strategy.riskLevel === "Medium" ||
                  strategy.riskLevel === "Low-Medium" ||
                  strategy.riskLevel === "Medium-High"
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
          <strong>Example:</strong> {strategy.example}
        </div>
        <div>
          <strong>Time Horizon:</strong> {strategy.timeHorizon}
        </div>
        <div>
          <strong>Best For:</strong> {strategy.suitableFor}
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
          onClick={() => setSelectedStrategy(null)}
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
              <strong>Example Allocation:</strong> {strategy.example}
            </div>
            <div>
              <strong>Allocation Method:</strong> {strategy.allocation}
            </div>
            <div>
              <strong>Time Horizon:</strong> {strategy.timeHorizon}
            </div>
            <div>
              <strong>Suitable For:</strong> {strategy.suitableFor}
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
            Implementation Steps
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
            Expert Tips
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
            ETF Investment Hub
          </h1>
          <p
            className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            Learn ETF investing strategies, build diversified portfolios, and
            master passive investing
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            {["learn", "market", "strategies"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab === "learn" && "📚 Learn"}
                {tab === "market" && "📊 Market Data"}
                {tab === "strategies" && "🎯 Strategies"}
              </button>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "learn" && (
          <div className="space-y-8">
            {selectedStrategy ? (
              <StrategyDetail strategy={selectedStrategy} />
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
                    ETF Investment Fundamentals
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        title: "Diversification",
                        desc: "Spread risk across many assets",
                        icon: "🌐",
                        color: "blue",
                      },
                      {
                        title: "Low Costs",
                        desc: "Minimal expense ratios vs mutual funds",
                        icon: "💰",
                        color: "green",
                      },
                      {
                        title: "Liquidity",
                        desc: "Trade during market hours like stocks",
                        icon: "⚡",
                        color: "yellow",
                      },
                      {
                        title: "Tax Efficiency",
                        desc: "Lower capital gains distributions",
                        icon: "📊",
                        color: "purple",
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
                    ETF Categories Guide
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {etfCategories.map((category, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border ${
                          isDark
                            ? "border-gray-600 bg-gray-700"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{category.icon}</span>
                          <h3
                            className={`font-bold ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {category.name}
                          </h3>
                        </div>
                        <p
                          className={`text-sm mb-3 ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {category.description}
                        </p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <strong>Examples:</strong>{" "}
                            {category.examples.join(", ")}
                          </div>
                          <div>
                            <strong>Risk Level:</strong>
                            <span
                              className={`ml-1 px-2 py-1 rounded ${
                                category.riskLevel === "Low"
                                  ? "bg-green-100 text-green-800"
                                  : category.riskLevel === "Low-Medium" ||
                                    category.riskLevel === "Medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : category.riskLevel === "Medium-High"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {category.riskLevel}
                            </span>
                          </div>
                          <div>
                            <strong>Best For:</strong> {category.bestFor}
                          </div>
                          <div>
                            <strong>Key Considerations:</strong>{" "}
                            {category.considerations}
                          </div>
                        </div>
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
                    ETF Investment Strategies - Click to Learn
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {etfStrategies.map((strategy) => (
                      <StrategyCard key={strategy.id} strategy={strategy} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "market" && (
          <div className="space-y-8">
            {/* ETF Categories */}
            <div>
              <h2
                className={`text-xl font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Popular ETFs by Category
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {etfs.map((etf) => (
                  <div
                    key={etf.symbol}
                    onClick={() => navigate(`/stock/${etf.symbol}`)}
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
                            {etf.symbol}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              isDark
                                ? getCategoryColor(etf.category).replace(
                                    "text-",
                                    "text-"
                                  )
                                : getCategoryColor(etf.category)
                            }`}
                          >
                            {etf.category}
                          </span>
                        </div>
                        <p
                          className={`text-sm font-medium mb-2 ${
                            isDark ? "text-gray-200" : "text-gray-700"
                          }`}
                        >
                          {etf.name}
                        </p>
                        <p
                          className={`text-xs ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {etf.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div
                          className={`text-xl font-bold ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {etf.price}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              etf.isNegative ? "text-red-500" : "text-green-500"
                            }`}
                          >
                            {etf.isNegative ? "" : "+"}
                            {etf.change}
                          </span>
                          <span
                            className={`text-sm ${
                              etf.isNegative ? "text-red-500" : "text-green-500"
                            }`}
                          >
                            ({etf.percent})
                          </span>
                        </div>
                      </div>

                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          etf.status === "live"
                            ? "bg-green-100 text-green-800"
                            : etf.status === "error"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {etf.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ETF Information */}
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
                About ETFs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4
                    className={`font-medium mb-2 ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    What are ETFs?
                  </h4>
                  <p
                    className={`text-sm ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Exchange-traded funds (ETFs) are investment funds that trade
                    on stock exchanges like individual stocks. They typically
                    track an index, commodity, bonds, or a basket of assets.
                  </p>
                </div>
                <div>
                  <h4
                    className={`font-medium mb-2 ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Benefits of ETFs
                  </h4>
                  <ul
                    className={`text-sm space-y-1 ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    <li>• Diversification across multiple assets</li>
                    <li>• Lower expense ratios than mutual funds</li>
                    <li>• Trade during market hours like stocks</li>
                    <li>• Tax efficiency</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "strategies" && (
          <div className="space-y-8">
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
                Portfolio Building Guide
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3
                    className={`font-medium mb-3 ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Investment Timeline
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        timeline: "Short-term (1-3 years)",
                        recommendation:
                          "Money market ETFs, short-term bond ETFs (SHY, BIL)",
                        risk: "Low",
                      },
                      {
                        timeline: "Medium-term (3-7 years)",
                        recommendation:
                          "Balanced mix of stocks/bonds (60/40 allocation)",
                        risk: "Medium",
                      },
                      {
                        timeline: "Long-term (7+ years)",
                        recommendation:
                          "Growth-focused stock ETFs, international diversification",
                        risk: "Medium-High",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded border ${
                          isDark
                            ? "border-gray-600 bg-gray-700"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {item.timeline}
                        </div>
                        <div
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {item.recommendation}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs">Risk Level:</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              item.risk === "Low"
                                ? "bg-green-100 text-green-800"
                                : item.risk === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {item.risk}
                          </span>
                        </div>
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
                    Risk Tolerance
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        risk: "Conservative",
                        allocation: "20% Stocks, 80% Bonds",
                        etfs: "BND, TLT, VTEB",
                        color: "green",
                      },
                      {
                        risk: "Moderate",
                        allocation: "60% Stocks, 40% Bonds",
                        etfs: "VTI, BND, VXUS",
                        color: "yellow",
                      },
                      {
                        risk: "Aggressive",
                        allocation: "90% Stocks, 10% Bonds",
                        etfs: "VTI, QQQ, VWO",
                        color: "red",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded border ${
                          isDark
                            ? "border-gray-600 bg-gray-700"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className={`flex items-center gap-2 mb-1`}>
                          <span
                            className={`w-3 h-3 rounded-full ${
                              item.color === "green"
                                ? "bg-green-500"
                                : item.color === "yellow"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          ></span>
                          <div
                            className={`font-medium ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {item.risk} Portfolio
                          </div>
                        </div>
                        <div
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          <div>{item.allocation}</div>
                          <div>Suggested ETFs: {item.etfs}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

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
                Rebalancing Strategy
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    method: "Calendar Rebalancing",
                    frequency: "Quarterly or Annually",
                    description: "Rebalance on set dates regardless of drift",
                    pros: "Simple, disciplined",
                    cons: "May miss opportunities",
                  },
                  {
                    method: "Threshold Rebalancing",
                    frequency: "When 5% drift occurs",
                    description:
                      "Rebalance when allocation drifts beyond set threshold",
                    pros: "Market responsive",
                    cons: "More complex to monitor",
                  },
                  {
                    method: "Hybrid Approach",
                    frequency: "Check quarterly, 5% threshold",
                    description: "Combine calendar and threshold methods",
                    pros: "Balanced approach",
                    cons: "Requires more attention",
                  },
                ].map((method, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded border ${
                      isDark
                        ? "border-gray-600 bg-gray-700"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <h3
                      className={`font-bold mb-2 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {method.method}
                    </h3>
                    <div
                      className={`text-sm space-y-2 ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      <div>
                        <strong>Frequency:</strong> {method.frequency}
                      </div>
                      <div>{method.description}</div>
                      <div className="text-xs">
                        <span className="text-green-600">✓ {method.pros}</span>
                        <br />
                        <span className="text-red-600">✗ {method.cons}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ETFsPage;
