import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

function DayTradingPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("learn");
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [tradingStats, setTradingStats] = useState({});
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // Day Trading Strategies for Learning
  const dayTradingStrategies = [
    {
      id: 1,
      name: "Scalping",
      difficulty: "Advanced",
      riskLevel: "High",
      description:
        "Make small profits from tiny price movements with high frequency trades",
      example:
        "Buy AAPL at $150.50, sell at $150.55 for $0.05 profit per share",
      timeFrame: "1-5 minutes",
      capitalRequired: "$25,000+ (PDT rule)",
      successRate: "60-70%",
      avgProfit: "$0.05-0.20 per share",
      pros: [
        "Quick profits",
        "Limited market exposure",
        "High frequency opportunities",
        "Works in any market",
      ],
      cons: [
        "High stress",
        "Requires intense focus",
        "High commission costs",
        "Burnout risk",
      ],
      tutorial: {
        steps: [
          "Master Level 2 order book reading and tape reading skills",
          "Focus on high-volume, liquid stocks with tight spreads",
          "Use 1-minute or tick charts with volume indicators",
          "Enter positions on momentum and exit quickly (30 seconds to 5 minutes)",
          "Maintain strict risk management with 1:1 or 2:1 risk/reward ratio",
        ],
        tips: [
          "Practice with paper trading first - scalping requires split-second decisions",
          "Use hotkeys for instant order execution",
          "Focus on 2-3 stocks maximum to avoid overextension",
        ],
      },
    },
    {
      id: 2,
      name: "Momentum Trading",
      difficulty: "Intermediate",
      riskLevel: "Medium-High",
      description:
        "Trade stocks showing strong directional movement with high volume",
      example:
        "TSLA breaks above $250 resistance with 3x normal volume, ride the momentum",
      timeFrame: "15 minutes - 2 hours",
      capitalRequired: "$5,000-25,000",
      successRate: "45-55%",
      avgProfit: "$0.50-2.00 per share",
      pros: [
        "Clear entry signals",
        "Good risk/reward",
        "Works with market trends",
        "Less stressful than scalping",
      ],
      cons: [
        "False breakouts",
        "Requires patience",
        "Market dependent",
        "Whipsaw risk",
      ],
      tutorial: {
        steps: [
          "Scan for stocks with unusual volume (2x+ average) and price movement",
          "Identify key resistance/support levels and wait for clean breakouts",
          "Enter on volume confirmation with tight stop-loss below breakout level",
          "Use 15-minute or 5-minute charts with volume and momentum indicators",
          "Exit when momentum fades or take profits at predetermined targets",
        ],
        tips: [
          "Wait for volume confirmation - volume leads price",
          "Avoid trading in the first 30 minutes (too volatile)",
          "Set profit targets at 2:1 or 3:1 risk/reward ratio",
        ],
      },
    },
    {
      id: 3,
      name: "Gap Trading",
      difficulty: "Intermediate",
      riskLevel: "Medium",
      description:
        "Trade stocks that gap up or down significantly at market open",
      example:
        "NVDA gaps up 5% on earnings, trade the gap fill or continuation",
      timeFrame: "First 2 hours of trading",
      capitalRequired: "$10,000-25,000",
      successRate: "50-60%",
      avgProfit: "$0.30-1.50 per share",
      pros: [
        "Predictable patterns",
        "High probability setups",
        "Clear stop levels",
        "Works in all markets",
      ],
      cons: [
        "Limited time window",
        "Requires early wake-up",
        "Gap risk",
        "High volatility",
      ],
      tutorial: {
        steps: [
          "Pre-market: Scan for stocks gapping 3%+ on news or earnings",
          "Analyze the gap type: breakaway, exhaustion, or common gap",
          "Wait for first 15-30 minutes to assess institutional interest",
          "Enter gap fill trades (fade the gap) or continuation trades (with the gap)",
          "Use tight stops and target previous day's close for gap fills",
        ],
        tips: [
          "85% of gaps get filled within 5 trading days",
          "Higher volume = higher probability of success",
          "News-driven gaps often have stronger follow-through",
        ],
      },
    },
    {
      id: 4,
      name: "Range Trading",
      difficulty: "Beginner",
      riskLevel: "Low-Medium",
      description: "Trade within established support and resistance levels",
      example:
        "SPY trading between $430-435, buy near support, sell near resistance",
      timeFrame: "30 minutes - 4 hours",
      capitalRequired: "$3,000-10,000",
      successRate: "65-75%",
      avgProfit: "$0.20-0.80 per share",
      pros: [
        "Clear entry/exit points",
        "High win rate",
        "Lower stress",
        "Good for beginners",
      ],
      cons: [
        "Limited profit potential",
        "Breakout risk",
        "Requires patience",
        "Boring",
      ],
      tutorial: {
        steps: [
          "Identify stocks in clear trading ranges using daily and hourly charts",
          "Mark key support and resistance levels with horizontal lines",
          "Buy near support with stop-loss below, sell near resistance",
          "Use oscillators like RSI or Stochastic for entry timing",
          "Exit when price approaches opposite boundary or breaks range",
        ],
        tips: [
          "Wait for at least 3 touches of support/resistance for validity",
          "Use smaller position sizes to allow for multiple entries",
          "Be ready to switch to breakout strategy if range breaks",
        ],
      },
    },
    {
      id: 5,
      name: "News Trading",
      difficulty: "Advanced",
      riskLevel: "Very High",
      description:
        "Trade immediate market reactions to breaking news and events",
      example:
        "FDA approval announcement sends biotech stock up 30% in minutes",
      timeFrame: "Seconds to 30 minutes",
      capitalRequired: "$25,000+",
      successRate: "40-50%",
      avgProfit: "$1.00-5.00 per share",
      pros: [
        "Explosive profit potential",
        "Clear catalysts",
        "Quick decisions",
        "High adrenaline",
      ],
      cons: [
        "Extreme risk",
        "Requires fast execution",
        "Unpredictable",
        "High stress",
      ],
      tutorial: {
        steps: [
          "Set up news feeds and alerts for breaking financial news",
          "Pre-identify stocks likely to react to specific news types",
          "Have orders ready to execute within seconds of news release",
          "Enter positions in direction of initial reaction with tight stops",
          "Exit quickly - news reactions are often short-lived",
        ],
        tips: [
          "Practice with earnings announcements first",
          "Use small position sizes due to extreme volatility",
          "Never hold news trades overnight",
        ],
      },
    },
    {
      id: 6,
      name: "Reversal Trading",
      difficulty: "Advanced",
      riskLevel: "High",
      description: "Trade against the prevailing trend at key reversal points",
      example: "QQQ oversold bounce off 200-day moving average with divergence",
      timeFrame: "1-4 hours",
      capitalRequired: "$10,000-25,000",
      successRate: "35-45%",
      avgProfit: "$0.75-2.50 per share",
      pros: [
        "Large profit potential",
        "Great risk/reward",
        "Contrarian edge",
        "Market timing",
      ],
      cons: [
        "Low success rate",
        "Timing difficulty",
        "Trend continuation risk",
        "Requires experience",
      ],
      tutorial: {
        steps: [
          "Identify oversold/overbought conditions using RSI, MACD, or other oscillators",
          "Look for bullish/bearish divergences between price and indicators",
          "Wait for reversal confirmation (hammer, doji, or volume spike)",
          "Enter with tight stop beyond recent high/low",
          "Target previous support/resistance levels for exits",
        ],
        tips: [
          "Never fight strong trends - wait for clear exhaustion signs",
          "Use multiple timeframes to confirm reversal signals",
          "Risk/reward should be at least 3:1 for reversal trades",
        ],
      },
    },
  ];

  // Mock trading data for analytics
  const mockTradingData = {
    totalTrades: 147,
    winRate: 67.3,
    avgProfit: 0.85,
    avgLoss: -0.45,
    profitFactor: 2.1,
    totalPnL: 2847.5,
    bestTrade: 156.75,
    worstTrade: -89.25,
    avgHoldTime: "2h 15m",
    sharpeRatio: 1.84,
  };

  const mockRecentTrades = [
    {
      id: 1,
      symbol: "AAPL",
      type: "Long",
      entry: 189.25,
      exit: 191.5,
      quantity: 100,
      pnl: 225.0,
      duration: "1h 45m",
      strategy: "Momentum",
      date: "2025-07-23T09:30:00",
    },
    {
      id: 2,
      symbol: "TSLA",
      type: "Short",
      entry: 248.9,
      exit: 246.75,
      quantity: 50,
      pnl: 107.5,
      duration: "45m",
      strategy: "Gap Fill",
      date: "2025-07-23T10:15:00",
    },
    {
      id: 3,
      symbol: "NVDA",
      type: "Long",
      entry: 875.5,
      exit: 870.25,
      quantity: 25,
      pnl: -131.25,
      duration: "2h 30m",
      strategy: "Range Trading",
      date: "2025-07-23T11:00:00",
    },
    {
      id: 4,
      symbol: "SPY",
      type: "Long",
      entry: 434.5,
      exit: 436.25,
      quantity: 200,
      pnl: 350.0,
      duration: "3h 15m",
      strategy: "Scalping",
      date: "2025-07-22T14:30:00",
    },
    {
      id: 5,
      symbol: "QQQ",
      type: "Short",
      entry: 401.75,
      exit: 403.5,
      quantity: 75,
      pnl: -131.25,
      duration: "55m",
      strategy: "Reversal",
      date: "2025-07-22T13:20:00",
    },
  ];

  useEffect(() => {
    // Simulate loading trading data
    setLoading(true);
    setTimeout(() => {
      setTradingStats(mockTradingData);
      setRecentTrades(mockRecentTrades);
      setLoading(false);
    }, 1000);
  }, []);

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
              strategy.riskLevel === "Low" ||
              strategy.riskLevel === "Low-Medium"
                ? "bg-blue-100 text-blue-800"
                : strategy.riskLevel === "Medium" ||
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
          <strong>Time Frame:</strong> {strategy.timeFrame}
        </div>
        <div>
          <strong>Success Rate:</strong> {strategy.successRate}
        </div>
        <div>
          <strong>Capital Required:</strong> {strategy.capitalRequired}
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
              <strong>Example:</strong> {strategy.example}
            </div>
            <div>
              <strong>Time Frame:</strong> {strategy.timeFrame}
            </div>
            <div>
              <strong>Capital Required:</strong> {strategy.capitalRequired}
            </div>
            <div>
              <strong>Success Rate:</strong> {strategy.successRate}
            </div>
            <div>
              <strong>Average Profit:</strong> {strategy.avgProfit}
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
            Day Trading Hub
          </h1>
          <p
            className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            Master day trading strategies, track performance, and analyze your
            trading psychology
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            {["learn", "analytics", "strategies"].map((tab) => (
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
                {tab === "analytics" && "📊 Analytics"}
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
                    Day Trading Fundamentals
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        title: "Pattern Day Trader",
                        desc: "Need $25,000 minimum for unlimited day trades",
                        icon: "💰",
                        color: "blue",
                      },
                      {
                        title: "Risk Management",
                        desc: "Never risk more than 1-2% per trade",
                        icon: "🛡️",
                        color: "green",
                      },
                      {
                        title: "Volume Analysis",
                        desc: "Volume confirms price movements",
                        icon: "📊",
                        color: "purple",
                      },
                      {
                        title: "Time & Sales",
                        desc: "Read the tape to understand market sentiment",
                        icon: "⏱️",
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
                    Essential Day Trading Rules
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3
                        className={`font-medium mb-3 ${
                          isDark ? "text-gray-200" : "text-gray-700"
                        }`}
                      >
                        Golden Rules
                      </h3>
                      <div className="space-y-2">
                        {[
                          "Cut losses quickly, let winners run",
                          "Trade with the trend, not against it",
                          "Volume leads price - always check volume",
                          "Avoid the first 15-30 minutes (too volatile)",
                          "Plan your trade, trade your plan",
                        ].map((rule, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 text-sm ${
                              isDark ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            <span className="text-green-500 mt-1">✓</span>
                            {rule}
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
                        Common Mistakes
                      </h3>
                      <div className="space-y-2">
                        {[
                          "Revenge trading after losses",
                          "Overtrading and taking low-quality setups",
                          "Not using stop losses",
                          "Trading with emotions instead of logic",
                          "Risking too much capital per trade",
                        ].map((mistake, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 text-sm ${
                              isDark ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            <span className="text-red-500 mt-1">✗</span>
                            {mistake}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2
                    className={`text-xl font-semibold mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Day Trading Strategies - Click to Learn
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {dayTradingStrategies.map((strategy) => (
                      <StrategyCard key={strategy.id} strategy={strategy} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: "Total P&L",
                  value: `$${tradingStats.totalPnL?.toLocaleString() || "0"}`,
                  color:
                    tradingStats.totalPnL > 0
                      ? "text-green-500"
                      : "text-red-500",
                  icon: "💰",
                },
                {
                  label: "Win Rate",
                  value: `${tradingStats.winRate || 0}%`,
                  color: "text-blue-500",
                  icon: "🎯",
                },
                {
                  label: "Total Trades",
                  value: tradingStats.totalTrades || 0,
                  color: "text-purple-500",
                  icon: "📊",
                },
                {
                  label: "Profit Factor",
                  value: tradingStats.profitFactor || "0.0",
                  color: "text-orange-500",
                  icon: "⚡",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`p-6 rounded-lg border ${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stat.icon}</span>
                    <h3
                      className={`font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {stat.label}
                    </h3>
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  Performance Metrics
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      label: "Average Profit",
                      value: `$${tradingStats.avgProfit}`,
                    },
                    {
                      label: "Average Loss",
                      value: `$${tradingStats.avgLoss}`,
                    },
                    {
                      label: "Best Trade",
                      value: `$${tradingStats.bestTrade}`,
                    },
                    {
                      label: "Worst Trade",
                      value: `$${tradingStats.worstTrade}`,
                    },
                    { label: "Avg Hold Time", value: tradingStats.avgHoldTime },
                    { label: "Sharpe Ratio", value: tradingStats.sharpeRatio },
                  ].map((metric, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span
                        className={`${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {metric.label}
                      </span>
                      <span
                        className={`font-medium ${
                          metric.label.includes("Loss") ||
                          metric.label.includes("Worst")
                            ? "text-red-500"
                            : metric.label.includes("Profit") ||
                              metric.label.includes("Best")
                            ? "text-green-500"
                            : isDark
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {metric.value}
                      </span>
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
                <h3
                  className={`text-lg font-semibold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Strategy Performance
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      strategy: "Momentum",
                      trades: 45,
                      winRate: 71.1,
                      pnl: 1247.5,
                    },
                    {
                      strategy: "Scalping",
                      trades: 67,
                      winRate: 64.2,
                      pnl: 892.25,
                    },
                    {
                      strategy: "Gap Trading",
                      trades: 23,
                      winRate: 69.6,
                      pnl: 567.75,
                    },
                    {
                      strategy: "Range Trading",
                      trades: 12,
                      winRate: 75.0,
                      pnl: 140.0,
                    },
                  ].map((strat, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded border ${
                        isDark
                          ? "border-gray-600 bg-gray-700"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {strat.strategy}
                        </span>
                        <span
                          className={`text-sm ${
                            strat.pnl > 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          ${strat.pnl.toFixed(2)}
                        </span>
                      </div>
                      <div
                        className={`text-xs ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {strat.trades} trades • {strat.winRate}% win rate
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div
              className={`rounded-lg border ${
                isDark
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3
                  className={`text-lg font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Recent Trades
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
                    <tr>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDark ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        Symbol
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDark ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        Type
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDark ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        Entry/Exit
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDark ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        P&L
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDark ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        Duration
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDark ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        Strategy
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      isDark ? "divide-gray-700" : "divide-gray-200"
                    }`}
                  >
                    {recentTrades.map((trade) => (
                      <tr
                        key={trade.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700`}
                      >
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isDark ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {trade.symbol}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              trade.type === "Long"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {trade.type}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDark ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {trade.entry} → {trade.exit}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            trade.pnl > 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          ${trade.pnl.toFixed(2)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDark ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {trade.duration}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDark ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {trade.strategy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                Trading Plan Template
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3
                    className={`font-medium mb-3 ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Pre-Market Preparation
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        task: "Review overnight news and earnings",
                        status: "✓",
                      },
                      {
                        task: "Identify gap ups/downs and key levels",
                        status: "✓",
                      },
                      {
                        task: "Set daily risk limit and profit target",
                        status: "✓",
                      },
                      {
                        task: "Check economic calendar for events",
                        status: "✓",
                      },
                      { task: "Prepare watchlist of 5-10 stocks", status: "✓" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-2 rounded ${
                          isDark ? "bg-gray-700" : "bg-gray-50"
                        }`}
                      >
                        <span className="text-green-500">{item.status}</span>
                        <span
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {item.task}
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
                    Risk Management Rules
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        rule: "Max risk per trade: 1% of account",
                        level: "Critical",
                      },
                      {
                        rule: "Daily loss limit: 3% of account",
                        level: "Critical",
                      },
                      {
                        rule: "Max 3 consecutive losses, then stop",
                        level: "Important",
                      },
                      {
                        rule: "Risk/Reward minimum 2:1 ratio",
                        level: "Important",
                      },
                      {
                        rule: "No more than 5 positions at once",
                        level: "Moderate",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-2 rounded ${
                          isDark ? "bg-gray-700" : "bg-gray-50"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.level === "Critical"
                              ? "bg-red-500"
                              : item.level === "Important"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        ></span>
                        <span
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {item.rule}
                        </span>
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
                Psychology & Mindset
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    emotion: "Fear (FOMO)",
                    trigger: "Missing a big move",
                    solution: "Stick to your plan, opportunities always return",
                    color: "red",
                  },
                  {
                    emotion: "Greed",
                    trigger: "Big winning streak",
                    solution:
                      "Take profits at targets, don't get overconfident",
                    color: "yellow",
                  },
                  {
                    emotion: "Revenge Trading",
                    trigger: "Big loss or losing streak",
                    solution:
                      "Step away, review what went wrong, smaller sizes",
                    color: "orange",
                  },
                ].map((psych, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded border ${
                      isDark
                        ? "border-gray-600 bg-gray-700"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`flex items-center gap-2 mb-2`}>
                      <span
                        className={`w-3 h-3 rounded-full ${
                          psych.color === "red"
                            ? "bg-red-500"
                            : psych.color === "yellow"
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                        }`}
                      ></span>
                      <h3
                        className={`font-bold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {psych.emotion}
                      </h3>
                    </div>
                    <div
                      className={`text-sm space-y-2 ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      <div>
                        <strong>Trigger:</strong> {psych.trigger}
                      </div>
                      <div>
                        <strong>Solution:</strong> {psych.solution}
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

export default DayTradingPage;
