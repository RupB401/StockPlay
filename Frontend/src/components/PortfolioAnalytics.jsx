import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { apiEndpoints } from "../utils/apiInterceptor";
import PortfolioPieChart from "./PortfolioPieChart";
import PortfolioBarChart from "./PortfolioBarChart";
import PortfolioLineChart from "./PortfolioLineChart";
// Using CSS symbols instead of Font Awesome
const icons = {
  pie: "○",
  bar: "▦",
  line: "📈",
  area: "📊",
  refresh: "⟲",
  info: "ⓘ",
  up: "↗",
  down: "↘",
  wallet: "💰",
  trending: "📈",
};

const PortfolioAnalytics = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [portfolioData, setPortfolioData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState("overview");

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Fetch portfolio data
      const portfolioResponse = await apiEndpoints.portfolio();
      if (!portfolioResponse.ok) {
        throw new Error(
          `Failed to fetch portfolio: ${portfolioResponse.status}`
        );
      }
      const portfolioResult = await portfolioResponse.json();

      // Fetch historical performance (mock data for now - you can implement this endpoint)
      const historicalResult = await generateMockHistoricalData();

      setPortfolioData(portfolioResult.data);
      setHistoricalData(historicalResult);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      setError(error.message || "Failed to load portfolio analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Generate mock historical data for demonstration
  const generateMockHistoricalData = async () => {
    const data = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // 6 months ago

    let portfolioValue = 10000;
    let totalInvested = 10000;

    for (let i = 0; i < 180; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate market volatility
      const dailyChange = (Math.random() - 0.48) * 0.02; // Slight upward bias
      portfolioValue *= 1 + dailyChange;

      if (i % 30 === 0 && i > 0) {
        totalInvested += Math.random() * 1000; // Add random investment
      }

      data.push({
        date: date.toISOString().split("T")[0],
        portfolioValue: Math.round(portfolioValue * 100) / 100,
        totalInvested: Math.round(totalInvested * 100) / 100,
        gainLoss: Math.round((portfolioValue - totalInvested) * 100) / 100,
      });
    }

    return data;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.00%";
    }
    return `${value.toFixed(2)}%`;
  };

  const prepareAllocationData = () => {
    if (!portfolioData?.holdings || portfolioData.holdings.length === 0) {
      return [];
    }

    return portfolioData.holdings.map((holding) => ({
      name: holding.symbol,
      value: holding.current_value || 0,
      shares: holding.quantity || 0,
      percentage:
        ((holding.current_value || 0) /
          (portfolioData.total_portfolio_value || 1)) *
        100,
    }));
  };

  const preparePerformanceData = () => {
    if (!portfolioData?.holdings || portfolioData.holdings.length === 0) {
      return [];
    }

    return portfolioData.holdings.map((holding) => ({
      name: holding.symbol,
      currentValue: holding.current_value || 0,
      invested: holding.total_cost || 0,
      gainLoss: holding.unrealized_gain_loss || 0,
      gainLossPercentage: holding.unrealized_gain_loss_percent || 0,
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-300 rounded"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
          <div className="h-96 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div
          className={`p-6 rounded-lg ${
            isDark ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200"
          } border`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-red-500 text-xl">{icons.info}</span>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Error Loading Analytics
              </h3>
              <p className="text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchAnalyticsData(true)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const allocationData = prepareAllocationData();
  const performanceData = preparePerformanceData();
  const totalValue = portfolioData?.total_portfolio_value || 0;
  const totalInvested = portfolioData?.total_invested || 0;
  const totalGainLoss = portfolioData?.total_gain_loss || 0;
  const totalGainLossPercentage = portfolioData?.total_gain_loss_percent || 0;
  const walletBalance = portfolioData?.wallet_balance || 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive view of your investment performance
          </p>
        </div>
        <button
          onClick={() => fetchAnalyticsData(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <span className={`text-xl ${refreshing ? "animate-spin" : ""}`}>
            {icons.refresh}
          </span>
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div
          className={`p-6 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Portfolio Value
              </p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <span className="text-blue-500 text-2xl">{icons.wallet}</span>
          </div>
        </div>

        <div
          className={`p-6 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Invested
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalInvested)}
              </p>
            </div>
            <span className="text-amber-500 text-2xl">{icons.trending}</span>
          </div>
        </div>

        <div
          className={`p-6 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Available Cash
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(walletBalance)}
              </p>
            </div>
            <span className="text-green-500 text-2xl">💰</span>
          </div>
        </div>

        <div
          className={`p-6 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Gain/Loss
              </p>
              <p
                className={`text-2xl font-bold ${
                  totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(totalGainLoss)}
              </p>
            </div>
            {totalGainLoss >= 0 ? (
              <span className="text-green-500 text-2xl">{icons.up}</span>
            ) : (
              <span className="text-red-500 text-2xl">{icons.down}</span>
            )}
          </div>
        </div>

        <div
          className={`p-6 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Return %
              </p>
              <p
                className={`text-2xl font-bold ${
                  totalGainLossPercentage >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatPercentage(totalGainLossPercentage)}
              </p>
            </div>
            {totalGainLossPercentage >= 0 ? (
              <span className="text-green-500 text-2xl">{icons.up}</span>
            ) : (
              <span className="text-red-500 text-2xl">{icons.down}</span>
            )}
          </div>
        </div>
      </div>

      {/* Performance Highlights */}
      {portfolioData?.performance_metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`p-6 rounded-lg ${
              isDark ? "bg-gray-800" : "bg-white"
            } shadow-lg`}
          >
            <h3 className="text-lg font-semibold mb-4 text-green-600">
              🏆 Best Performer
            </h3>
            {portfolioData.performance_metrics.best_performer ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {portfolioData.performance_metrics.best_performer.symbol}
                  </span>
                  <span className="text-green-600 font-bold">
                    +
                    {formatPercentage(
                      portfolioData.performance_metrics.best_performer
                        .unrealized_gain_loss_percent
                    )}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Gain:{" "}
                  {formatCurrency(
                    portfolioData.performance_metrics.best_performer
                      .unrealized_gain_loss
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          <div
            className={`p-6 rounded-lg ${
              isDark ? "bg-gray-800" : "bg-white"
            } shadow-lg`}
          >
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              📉 Worst Performer
            </h3>
            {portfolioData.performance_metrics.worst_performer ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {portfolioData.performance_metrics.worst_performer.symbol}
                  </span>
                  <span className="text-red-600 font-bold">
                    {formatPercentage(
                      portfolioData.performance_metrics.worst_performer
                        .unrealized_gain_loss_percent
                    )}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Loss:{" "}
                  {formatCurrency(
                    portfolioData.performance_metrics.worst_performer
                      .unrealized_gain_loss
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>
      )}

      {/* Chart Selection Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "overview", label: "Overview", icon: icons.line },
          { id: "allocation", label: "Allocation", icon: icons.pie },
          { id: "performance", label: "Performance", icon: icons.bar },
          { id: "timeline", label: "Timeline", icon: icons.area },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedChart(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedChart === tab.id
                ? "bg-blue-600 text-white"
                : isDark
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Display */}
      <div className="space-y-6">
        {selectedChart === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioPieChart
              data={allocationData}
              title="Portfolio Allocation"
            />
            <PortfolioLineChart
              data={historicalData}
              title="Portfolio Value Trend"
              type="area"
              dataKeys={["portfolioValue", "totalInvested"]}
            />
          </div>
        )}

        {selectedChart === "allocation" && (
          <PortfolioPieChart
            data={allocationData}
            title="Detailed Portfolio Allocation"
          />
        )}

        {selectedChart === "performance" && (
          <PortfolioBarChart
            data={performanceData}
            title="Individual Stock Performance"
          />
        )}

        {selectedChart === "timeline" && (
          <PortfolioLineChart
            data={historicalData}
            title="Portfolio Performance Over Time"
            type="line"
            dataKeys={["portfolioValue", "totalInvested", "gainLoss"]}
          />
        )}
      </div>

      {/* Holdings Table */}
      {portfolioData?.holdings && portfolioData.holdings.length > 0 && (
        <div
          className={`p-6 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
        >
          <h3 className="text-lg font-semibold mb-4">Current Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2">Symbol</th>
                  <th className="text-right py-2">Shares</th>
                  <th className="text-right py-2">Avg Price</th>
                  <th className="text-right py-2">Current Price</th>
                  <th className="text-right py-2">Current Value</th>
                  <th className="text-right py-2">Invested</th>
                  <th className="text-right py-2">Gain/Loss</th>
                  <th className="text-right py-2">Return %</th>
                  <th className="text-right py-2">CAGR</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.holdings.map((holding, index) => {
                  // Use the calculated values from backend
                  const gainLoss = holding.unrealized_gain_loss || 0;
                  const gainLossPercentage =
                    holding.unrealized_gain_loss_percent || 0;
                  const cagr = holding.cagr || 0;

                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-2 font-medium">
                        <div>
                          <div className="font-semibold">{holding.symbol}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {holding.company_name}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-2">
                        {holding.quantity || 0}
                      </td>
                      <td className="text-right py-2">
                        {formatCurrency(holding.average_price || 0)}
                      </td>
                      <td className="text-right py-2">
                        <div>
                          <div className="font-semibold">
                            {formatCurrency(holding.current_price || 0)}
                          </div>
                          <div
                            className={`text-xs ${
                              (holding.price_change || 0) >= 0
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {(holding.price_change || 0) >= 0 ? "+" : ""}
                            {formatCurrency(holding.price_change || 0)}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-2">
                        {formatCurrency(holding.current_value || 0)}
                      </td>
                      <td className="text-right py-2">
                        {formatCurrency(holding.total_cost || 0)}
                      </td>
                      <td
                        className={`text-right py-2 font-semibold ${
                          gainLoss >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        <div>
                          <div>{formatCurrency(gainLoss)}</div>
                          <div className="text-xs">
                            ({gainLoss >= 0 ? "+" : ""}
                            {formatPercentage(gainLossPercentage)})
                          </div>
                        </div>
                      </td>
                      <td
                        className={`text-right py-2 ${
                          gainLossPercentage >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatPercentage(gainLossPercentage)}
                      </td>
                      <td
                        className={`text-right py-2 text-sm ${
                          cagr >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatPercentage(cagr)}
                        <div className="text-xs text-gray-500">
                          {holding.days_held}d
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioAnalytics;
