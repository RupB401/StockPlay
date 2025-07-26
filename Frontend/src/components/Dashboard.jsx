import React, { useState, useEffect } from "react";
import { FiEye, FiTrash2 } from "react-icons/fi";
const icons = {
  plus: "+",
  up: "↗",
  down: "↘",
};
import { useNavigate } from "react-router-dom";
import { getDashboardStocks, removeStockFromDashboard } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStocks();
      console.log("Dashboard data received:", data);
      // The API returns an array of stocks directly, so we need to wrap it in the expected structure
      setDashboardData({
        watchlist: Array.isArray(data) ? data : [],
        portfolio: null, // We can add portfolio data later if needed
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStock = async (symbol) => {
    try {
      await removeStockFromDashboard(symbol);
      // Refresh dashboard data after removal
      await fetchDashboardData();
    } catch (error) {
      console.error("Error removing stock:", error);
    }
  };

  const handleViewStock = (symbol) => {
    navigate(`/stock/${symbol}`);
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

  if (error) {
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
                Error Loading Dashboard
              </h2>
              <p className="mb-4">{error}</p>
              <button onClick={fetchDashboardData} className="btn btn-primary">
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className={`text-3xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              My Dashboard
            </h1>
            <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Track your favorite stocks and portfolio performance
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              disabled={loading}
            >
              {loading ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
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
              )}
              Refresh
            </button>
            <button
              onClick={() => navigate("/explore")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>{icons.plus}</span>
              Add Stocks
            </button>
          </div>
        </div>

        {/* Portfolio Overview */}
        {dashboardData?.portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-sm font-medium ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Total Value
              </h3>
              <p
                className={`text-2xl font-bold mt-1 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                ${dashboardData.portfolio.totalValue?.toLocaleString() || "0"}
              </p>
            </div>
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-sm font-medium ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Total Gain/Loss
              </h3>
              <p
                className={`text-2xl font-bold mt-1 ${
                  dashboardData.portfolio.totalGainLoss >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {dashboardData.portfolio.totalGainLoss >= 0 ? "+" : ""}$
                {dashboardData.portfolio.totalGainLoss?.toLocaleString() || "0"}
              </p>
            </div>
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-sm font-medium ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Total Return
              </h3>
              <p
                className={`text-2xl font-bold mt-1 ${
                  dashboardData.portfolio.totalReturn >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {dashboardData.portfolio.totalReturn >= 0 ? "+" : ""}
                {dashboardData.portfolio.totalReturn?.toFixed(2) || "0"}%
              </p>
            </div>
          </div>
        )}

        {/* Watchlist */}
        <div
          className={`rounded-lg shadow-sm p-6 ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h2
            className={`text-xl font-semibold mb-6 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Watchlist
          </h2>

          {dashboardData?.watchlist && dashboardData.watchlist.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b ${
                      isDark ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <th
                      className={`text-left py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Symbol
                    </th>
                    <th
                      className={`text-left py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Name
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Price
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Change
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.watchlist.map((stock, index) => (
                    <tr
                      key={stock.symbol}
                      className={`border-b ${
                        isDark ? "border-gray-700" : "border-gray-200"
                      } hover:${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                    >
                      <td
                        className={`py-4 px-4 font-semibold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {stock.symbol}
                      </td>
                      <td
                        className={`py-4 px-4 ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {stock.name}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-semibold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {stock.price}
                      </td>
                      <td className={`py-4 px-4 text-right font-medium`}>
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            stock.isNegative ? "text-red-500" : "text-green-500"
                          }`}
                        >
                          <span>
                            {stock.isNegative ? icons.down : icons.up}
                          </span>
                          {stock.change} ({stock.percent})
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewStock(stock.symbol)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "text-blue-400 hover:bg-gray-700"
                                : "text-blue-600 hover:bg-blue-50"
                            }`}
                            title="View Details"
                          >
                            <FiEye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveStock(stock.symbol)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "text-red-400 hover:bg-gray-700"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                            title="Remove from Watchlist"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className={`text-center py-12 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <span className="mx-auto text-4xl mb-4 opacity-50 block">
                {icons.plus}
              </span>
              <h3 className="text-lg font-medium mb-2">
                No stocks in your watchlist
              </h3>
              <p className="mb-4">
                Add some stocks to start tracking their performance
              </p>
              <button
                onClick={() => navigate("/explore")}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Stocks
              </button>
            </div>
          )}
        </div>

        {/* Holdings */}
        {dashboardData?.holdings && dashboardData.holdings.length > 0 && (
          <div
            className={`rounded-lg shadow-sm p-6 mt-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <h2
              className={`text-xl font-semibold mb-6 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Holdings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b ${
                      isDark ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <th
                      className={`text-left py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Symbol
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Shares
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Avg Cost
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Current Price
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Market Value
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Gain/Loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.holdings.map((holding, index) => (
                    <tr
                      key={holding.symbol}
                      className={`border-b ${
                        isDark ? "border-gray-700" : "border-gray-200"
                      } hover:${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                    >
                      <td
                        className={`py-4 px-4 font-semibold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {holding.symbol}
                      </td>
                      <td
                        className={`py-4 px-4 text-right ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {holding.shares}
                      </td>
                      <td
                        className={`py-4 px-4 text-right ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        ${holding.avgCost?.toFixed(2)}
                      </td>
                      <td
                        className={`py-4 px-4 text-right ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${holding.currentPrice?.toFixed(2)}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-semibold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${holding.marketValue?.toFixed(2)}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-medium ${
                          holding.gainLoss >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {holding.gainLoss >= 0 ? "+" : ""}$
                        {holding.gainLoss?.toFixed(2)}
                        <br />
                        <span className="text-sm">
                          ({holding.gainLossPercent >= 0 ? "+" : ""}
                          {holding.gainLossPercent?.toFixed(2)}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
