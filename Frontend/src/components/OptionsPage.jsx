import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

function OptionsPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("learn");
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [activeOptions, setActiveOptions] = useState([]);
  const [popularOptions, setPopularOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Educational content for options strategies
  const optionsStrategies = [
    {
      id: 1,
      name: "Long Call",
      difficulty: "Beginner",
      riskLevel: "Limited",
      description: "Buy a call option to profit from upward price movement",
      example: "Buy AAPL $180 Call for $5.00 premium",
      maxProfit: "Unlimited",
      maxLoss: "Premium paid",
      breakeven: "Strike + Premium",
      when: "Bullish on stock, expect significant upward movement",
      pros: ["Limited risk", "Unlimited profit potential", "Lower capital requirement"],
      cons: ["Time decay", "Requires directional movement", "Can lose entire premium"],
      tutorial: {
        steps: [
          "Choose a stock you're bullish on",
          "Select strike price above current price",
          "Pick expiration date (30-60 days recommended)",
          "Pay the premium to buy the call",
          "Monitor position and plan exit strategy"
        ],
        tips: [
          "Choose liquid options with tight bid-ask spreads",
          "Consider implied volatility levels",
          "Don't risk more than you can afford to lose"
        ]
      }
    },
    {
      id: 2,
      name: "Long Put",
      difficulty: "Beginner",
      riskLevel: "Limited",
      description: "Buy a put option to profit from downward price movement",
      example: "Buy TSLA $250 Put for $8.00 premium",
      maxProfit: "Strike - Premium",
      maxLoss: "Premium paid",
      breakeven: "Strike - Premium",
      when: "Bearish on stock, expect significant downward movement",
      pros: ["Limited risk", "High profit potential", "Portfolio hedge"],
      cons: ["Time decay", "Requires directional movement", "Can lose entire premium"],
      tutorial: {
        steps: [
          "Choose a stock you're bearish on",
          "Select strike price below current price",
          "Pick expiration date (30-60 days recommended)",
          "Pay the premium to buy the put",
          "Monitor position and plan exit strategy"
        ],
        tips: [
          "Consider using puts as portfolio insurance",
          "Watch for high volatility periods",
          "Exit before expiration if profitable"
        ]
      }
    },
    {
      id: 3,
      name: "Covered Call",
      difficulty: "Intermediate",
      riskLevel: "Medium",
      description: "Own 100 shares and sell a call option for income",
      example: "Own 100 MSFT shares, sell $200 Call for $3.00",
      maxProfit: "Premium + (Strike - Stock Price)",
      maxLoss: "Stock can decline significantly",
      breakeven: "Stock Price - Premium",
      when: "Neutral to slightly bullish, want income",
      pros: ["Generate income", "Reduce cost basis", "Limited additional risk"],
      cons: ["Limited upside", "Still exposed to downside", "May lose shares"],
      tutorial: {
        steps: [
          "Own 100 shares of the underlying stock",
          "Select a call option above current price",
          "Sell the call to collect premium",
          "Monitor until expiration",
          "Be prepared to sell shares if assigned"
        ],
        tips: [
          "Choose strikes above your cost basis",
          "Consider 30-45 days to expiration",
          "Roll the option if needed to avoid assignment"
        ]
      }
    },
    {
      id: 4,
      name: "Cash-Secured Put",
      difficulty: "Intermediate",
      riskLevel: "Medium",
      description: "Sell a put option while holding cash to buy shares",
      example: "Sell NVDA $400 Put for $6.00, hold $40,000 cash",
      maxProfit: "Premium received",
      maxLoss: "Strike - Premium",
      breakeven: "Strike - Premium",
      when: "Want to buy stock at lower price, collect income",
      pros: ["Collect premium", "Disciplined entry price", "Generate income"],
      cons: ["Tie up cash", "Miss rallies", "Still lose if stock declines"],
      tutorial: {
        steps: [
          "Have cash equal to 100 shares at strike price",
          "Select a put strike below current price",
          "Sell the put to collect premium",
          "Wait for expiration or assignment",
          "Buy shares if assigned, keep premium if not"
        ],
        tips: [
          "Choose stocks you'd want to own",
          "Use 30-45 days to expiration",
          "Consider rolling down and out if needed"
        ]
      }
    }
  ];

  // Mock data with realistic options information
  const mockActiveOptions = [
    {
      symbol: "AAPL",
      company: "Apple Inc.",
      currentPrice: "$189.25",
      strike: "$190",
      expiry: "2025-08-15",
      type: "Call",
      premium: "$5.20",
      volume: "15,230",
      openInterest: "45,670",
      impliedVolatility: "28.5%",
      delta: "0.52",
      gamma: "0.03",
      theta: "-0.08",
      vega: "0.15"
    },
    {
      symbol: "TSLA",
      company: "Tesla Inc.",
      currentPrice: "$248.90",
      strike: "$250",
      expiry: "2025-08-22",
      type: "Put",
      premium: "$12.80",
      volume: "8,940",
      openInterest: "23,120",
      impliedVolatility: "42.1%",
      delta: "-0.48",
      gamma: "0.02",
      theta: "-0.12",
      vega: "0.22"
    },
    {
      symbol: "NVDA",
      company: "NVIDIA Corp.",
      currentPrice: "$875.50",
      strike: "$900",
      expiry: "2025-09-19",
      type: "Call",
      premium: "$18.60",
      volume: "22,150",
      openInterest: "67,890",
      impliedVolatility: "35.7%",
      delta: "0.41",
      gamma: "0.02",
      theta: "-0.15",
      vega: "0.28"
    },
  ];

  const mockPopularOptions = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF", volume: "2.1M", oi: "8.5M", iv: "16.2%" },
    { symbol: "QQQ", name: "Invesco QQQ ETF", volume: "1.8M", oi: "6.2M", iv: "22.8%" },
    { symbol: "AAPL", name: "Apple Inc.", volume: "987K", oi: "4.1M", iv: "28.5%" },
    { symbol: "TSLA", name: "Tesla Inc.", volume: "743K", oi: "3.8M", iv: "42.1%" },
    { symbol: "NVDA", name: "NVIDIA Corp.", volume: "692K", oi: "2.9M", iv: "35.7%" },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setActiveOptions(mockActiveOptions);
      setPopularOptions(mockPopularOptions);
      setLoading(false);
    }, 1000);
  }, []);

  const StrategyCard = ({ strategy }) => (
    <div
      className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isDark
          ? "bg-gray-800 border-gray-700 hover:border-blue-500"
          : "bg-white border-gray-200 hover:border-blue-300"
      } ${selectedStrategy?.id === strategy.id ? (isDark ? "border-blue-500" : "border-blue-400") : ""}`}
      onClick={() => setSelectedStrategy(strategy)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
          {strategy.name}
        </h3>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-1 text-xs rounded-full ${
            strategy.difficulty === "Beginner" 
              ? "bg-green-100 text-green-800"
              : strategy.difficulty === "Intermediate"
              ? "bg-yellow-100 text-yellow-800"  
              : "bg-red-100 text-red-800"
          }`}>
            {strategy.difficulty}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            strategy.riskLevel === "Limited"
              ? "bg-blue-100 text-blue-800"
              : strategy.riskLevel === "Medium"
              ? "bg-orange-100 text-orange-800"
              : "bg-red-100 text-red-800"
          }`}>
            {strategy.riskLevel} Risk
          </span>
        </div>
      </div>
      
      <p className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
        {strategy.description}
      </p>
      
      <div className={`text-xs space-y-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        <div><strong>Max Profit:</strong> {strategy.maxProfit}</div>
        <div><strong>Max Loss:</strong> {strategy.maxLoss}</div>
        <div><strong>When to Use:</strong> {strategy.when}</div>
      </div>
    </div>
  );

  const StrategyDetail = ({ strategy }) => (
    <div className={`p-6 rounded-lg border ${
      isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          {strategy.name}
        </h2>
        <button
          onClick={() => setSelectedStrategy(null)}
          className={`p-2 rounded-full hover:bg-gray-100 ${isDark ? "hover:bg-gray-700" : ""}`}
        >
          ✕
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Strategy Details
          </h3>
          <div className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            <div><strong>Example:</strong> {strategy.example}</div>
            <div><strong>Breakeven:</strong> {strategy.breakeven}</div>
            <div><strong>Best Used When:</strong> {strategy.when}</div>
          </div>
        </div>
        
        <div>
          <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Pros & Cons
          </h3>
          <div className="space-y-2">
            <div>
              <div className="text-green-600 font-medium text-sm mb-1">Pros:</div>
              <ul className={`text-xs space-y-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {strategy.pros.map((pro, i) => <li key={i}>• {pro}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-red-600 font-medium text-sm mb-1">Cons:</div>
              <ul className={`text-xs space-y-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {strategy.cons.map((con, i) => <li key={i}>• {con}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Step-by-Step Tutorial
          </h3>
          <ol className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
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
          <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Pro Tips
          </h3>
          <ul className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
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
      <div className={`min-h-screen p-6 pt-20 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 pt-20 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Options Trading Hub
          </h1>
          <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Learn options strategies, analyze contracts, and master derivatives trading
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
                <div className={`p-6 rounded-lg border ${
                  isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}>
                  <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Options Trading Fundamentals
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { title: "Call Options", desc: "Right to BUY at strike price", icon: "📈", color: "green" },
                      { title: "Put Options", desc: "Right to SELL at strike price", icon: "📉", color: "red" },
                      { title: "Premium", desc: "Cost to buy the option", icon: "💰", color: "blue" },
                      { title: "Greeks", desc: "Risk metrics (Delta, Gamma, etc.)", icon: "🔢", color: "purple" }
                    ].map((concept, i) => (
                      <div key={i} className={`p-4 rounded-lg border-l-4 ${
                        concept.color === "green" ? "border-green-500 bg-green-50 dark:bg-green-900/20" :
                        concept.color === "red" ? "border-red-500 bg-red-50 dark:bg-red-900/20" :
                        concept.color === "blue" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" :
                        "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{concept.icon}</span>
                          <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {concept.title}
                          </h3>
                        </div>
                        <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {concept.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Options Strategies - Click to Learn
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {optionsStrategies.map((strategy) => (
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
            {/* Active Options */}
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Active Options Contracts
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeOptions.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => navigate(`/stock/${option.symbol}`)}
                    className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isDark
                        ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                            {option.symbol}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            option.type === "Call"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {option.type}
                          </span>
                        </div>
                        <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {option.company}
                        </p>
                        <p className={`text-xs text-blue-500`}>
                          Current: {option.currentPrice}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className={isDark ? "text-gray-400" : "text-gray-500"}>Strike</span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {option.strike}
                          </p>
                        </div>
                        <div>
                          <span className={isDark ? "text-gray-400" : "text-gray-500"}>Premium</span>
                          <p className={`font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>
                            {option.premium}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className={isDark ? "text-gray-400" : "text-gray-500"}>IV</span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {option.impliedVolatility}
                          </p>
                        </div>
                        <div>
                          <span className={isDark ? "text-gray-400" : "text-gray-500"}>Delta</span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {option.delta}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          Expires: {new Date(option.expiry).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Options */}
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Most Active Options
              </h2>
              <div className={`overflow-x-auto rounded-lg border ${
                isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              }`}>
                <table className="min-w-full">
                  <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}>Symbol</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}>Company</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}>Volume</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}>Open Interest</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}>Implied Vol</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                    {popularOptions.map((option, index) => (
                      <tr 
                        key={index} 
                        className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700`}
                        onClick={() => navigate(`/stock/${option.symbol}`)}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          isDark ? "text-blue-400" : "text-blue-600"
                        }`}>
                          {option.symbol}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? "text-gray-300" : "text-gray-900"
                        }`}>
                          {option.name}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? "text-gray-300" : "text-gray-900"
                        }`}>
                          {option.volume}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? "text-gray-300" : "text-gray-900"
                        }`}>
                          {option.oi}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? "text-gray-300" : "text-gray-900"
                        }`}>
                          {option.iv}
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
            <div className={`p-6 rounded-lg border ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Strategy Comparison Tool
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className={`font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    Market Outlook
                  </h3>
                  <div className="space-y-2">
                    {[
                      { outlook: "Very Bullish", strategies: ["Long Call", "Bull Call Spread"] },
                      { outlook: "Moderately Bullish", strategies: ["Covered Call", "Cash-Secured Put"] },
                      { outlook: "Neutral", strategies: ["Iron Condor", "Short Straddle"] },
                      { outlook: "Moderately Bearish", strategies: ["Long Put", "Bear Put Spread"] },
                      { outlook: "Very Bearish", strategies: ["Long Put", "Put Calendar"] }
                    ].map((item, i) => (
                      <div key={i} className={`p-3 rounded border ${
                        isDark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"
                      }`}>
                        <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {item.outlook}
                        </div>
                        <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          Recommended: {item.strategies.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className={`font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    Risk Tolerance
                  </h3>
                  <div className="space-y-2">
                    {[
                      { risk: "Low Risk", strategies: ["Covered Call", "Cash-Secured Put"], color: "green" },
                      { risk: "Medium Risk", strategies: ["Long Call", "Long Put"], color: "yellow" },
                      { risk: "High Risk", strategies: ["Short Options", "Naked Calls"], color: "red" }
                    ].map((item, i) => (
                      <div key={i} className={`p-3 rounded border ${
                        isDark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"
                      }`}>
                        <div className={`flex items-center gap-2 mb-1`}>
                          <span className={`w-3 h-3 rounded-full ${
                            item.color === "green" ? "bg-green-500" :
                            item.color === "yellow" ? "bg-yellow-500" : "bg-red-500"
                          }`}></span>
                          <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.risk}
                          </div>
                        </div>
                        <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {item.strategies.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OptionsPage;
