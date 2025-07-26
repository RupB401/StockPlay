import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaSyncAlt,
  FaShoppingCart,
  FaChartBar,
  FaChartArea,
  FaWallet,
} from "react-icons/fa";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { apiEndpoints } from "../utils/apiInterceptor";

const PortfolioPage = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [portfolioData, setPortfolioData] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPortfolioData();
    }
  }, [user]);

  const fetchPortfolioData = async (isRefresh = false) => {
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

      // Create abort controller for timeout handling
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout

      try {
        const [portfolioRes, walletRes] = await Promise.all([
          apiEndpoints.portfolio(),
          apiEndpoints.wallet(),
        ]);

        clearTimeout(timeoutId);

        // Handle portfolio response
        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          setPortfolioData(portfolioData.data);

          // Check for warnings in response
          if (portfolioData.warning) {
            console.warn("Portfolio warning:", portfolioData.warning);
          }
        } else if (portfolioRes.status === 404 || portfolioRes.status === 500) {
          // No portfolio data yet or server error - provide fallback for new users
          console.log(
            `Portfolio endpoint returned ${portfolioRes.status}, using fallback data`
          );
          setPortfolioData({
            wallet_balance: 0,
            total_portfolio_value: 0,
            total_invested: 0,
            total_gain_loss: 0,
            total_gain_loss_percent: 0,
            number_of_holdings: 0,
            diversification_score: 0,
            holdings: [],
          });
        } else {
          console.error(
            "Portfolio fetch failed with status:",
            portfolioRes.status
          );
          try {
            const errorData = await portfolioRes.text();
            console.error("Portfolio error response:", errorData);
          } catch (e) {
            console.error("Could not read error response");
          }

          // Still provide fallback data instead of complete failure
          setPortfolioData({
            wallet_balance: 0,
            total_portfolio_value: 0,
            total_invested: 0,
            total_gain_loss: 0,
            total_gain_loss_percent: 0,
            number_of_holdings: 0,
            diversification_score: 0,
            holdings: [],
          });

          // Set a warning instead of a hard error
          setError(
            `Portfolio service temporarily unavailable (${portfolioRes.status})`
          );
        }

        // Handle wallet response
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWalletData(walletData.data);
        } else {
          console.warn("Wallet fetch failed, continuing with portfolio data");
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      if (error.name === "AbortError") {
        setError("Request timed out - please try again");
      } else if (error.message.includes("401")) {
        setError("Authentication expired - please login again");
      } else if (
        error.message.includes("NetworkError") ||
        error.message.includes("Failed to fetch")
      ) {
        setError("Network error - check your connection");
      } else {
        setError(error.message || "Failed to load portfolio data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatPercent = (percent) => {
    return `${percent >= 0 ? "+" : ""}${percent?.toFixed(2)}%`;
  };

  const getProfitLossColor = (amount) => {
    if (amount > 0) return isDark ? "text-green-400" : "text-green-600";
    if (amount < 0) return isDark ? "text-red-400" : "text-red-600";
    return isDark ? "text-gray-300" : "text-gray-600";
  };

  const getTotalPortfolioValue = () => {
    if (!portfolioData || !walletData) return 0;
    return (
      (portfolioData.total_portfolio_value || 0) +
      (walletData.quantz_balance || 0)
    );
  };

  if (loading && !portfolioData) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center py-12">
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
          <div className="text-center py-12">
            <h2
              className={`text-2xl font-bold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Error Loading Portfolio
            </h2>
            <p className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {error}
            </p>
            <button
              onClick={() => fetchPortfolioData()}
              className="btn btn-primary"
            >
              Try Again
            </button>
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
              Portfolio
            </h1>
            <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Track your investments and performance
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/portfolio/analytics")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaChartBar />
              Analytics
            </button>
            <button
              onClick={() => fetchPortfolioData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {refreshing ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
                <FaSyncAlt />
              )}
              Refresh
            </button>
            <button
              onClick={() => navigate("/explore")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaShoppingCart />
              Trade Stocks
            </button>
          </div>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Portfolio Value */}
          <div
            className={`rounded-lg shadow-sm p-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Total Portfolio Value
              </h3>
              <FaWallet
                className={`${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {formatCurrency(getTotalPortfolioValue())}
            </p>
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Cash + Investments
            </p>
          </div>

          {/* Investment Value */}
          <div
            className={`rounded-lg shadow-sm p-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Investment Value
              </h3>
              <FaChartLine
                className={`${isDark ? "text-blue-400" : "text-blue-600"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {formatCurrency(portfolioData?.total_portfolio_value)}
            </p>
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Current market value
            </p>
          </div>

          {/* Total Gain/Loss */}
          <div
            className={`rounded-lg shadow-sm p-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Total Gain/Loss
              </h3>
              {portfolioData?.total_gain_loss >= 0 ? (
                <FaArrowUp className="text-green-500" />
              ) : (
                <FaArrowDown className="text-red-500" />
              )}
            </div>
            <p
              className={`text-2xl font-bold ${getProfitLossColor(
                portfolioData?.total_gain_loss
              )}`}
            >
              {formatCurrency(portfolioData?.total_gain_loss)}
            </p>
            <p
              className={`text-xs mt-1 ${getProfitLossColor(
                portfolioData?.total_gain_loss
              )}`}
            >
              {formatPercent(portfolioData?.total_gain_loss_percent)}
            </p>
          </div>

          {/* Available Cash */}
          <div
            className={`rounded-lg shadow-sm p-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Available Cash
              </h3>
              <FaWallet
                className={`${isDark ? "text-green-400" : "text-green-600"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold ${
                isDark ? "text-green-400" : "text-green-600"
              }`}
            >
              {formatCurrency(walletData?.quantz_balance)}
            </p>
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              QuantZ balance
            </p>
          </div>
        </div>

        {/* Holdings Table */}
        <div
          className={`rounded-lg shadow-sm ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2
                className={`text-xl font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Your Holdings
              </h2>
              <span
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {portfolioData?.holdings?.length || 0} stocks
              </span>
            </div>
          </div>

          {portfolioData?.holdings && portfolioData.holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b ${
                      isDark ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <th
                      className={`text-left py-3 px-6 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Stock
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Quantity
                    </th>
                    <th
                      className={`text-right py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Avg Price
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
                    <th
                      className={`text-center py-3 px-4 font-medium ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioData.holdings.map((holding) => (
                    <tr
                      key={holding.symbol}
                      className={`border-b ${
                        isDark ? "border-gray-700" : "border-gray-200"
                      } hover:${
                        isDark ? "bg-gray-700" : "bg-gray-50"
                      } transition-colors`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isDark ? "bg-gray-700" : "bg-gray-100"
                            }`}
                          >
                            <span
                              className={`font-bold text-sm ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {holding.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p
                              className={`font-medium ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {holding.symbol}
                            </p>
                            <p
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {holding.company_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {holding.quantity}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {formatCurrency(holding.average_price)}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {formatCurrency(holding.current_price)}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {formatCurrency(holding.current_value)}
                      </td>
                      <td className={`py-4 px-4 text-right font-medium`}>
                        <div
                          className={`${getProfitLossColor(
                            holding.unrealized_gain_loss
                          )}`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {holding.unrealized_gain_loss >= 0 ? (
                              <FaArrowUp className="text-xs" />
                            ) : (
                              <FaArrowDown className="text-xs" />
                            )}
                            <span>
                              {formatCurrency(holding.unrealized_gain_loss)}
                            </span>
                          </div>
                          <div className="text-xs">
                            {formatPercent(
                              holding.unrealized_gain_loss_percent
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/stock/${holding.symbol}`)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "text-blue-400 hover:bg-gray-700"
                                : "text-blue-600 hover:bg-blue-50"
                            }`}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => navigate(`/trade/${holding.symbol}`)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "text-green-400 hover:bg-gray-700"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title="Trade"
                          >
                            <FaShoppingCart />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div
                className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                <FaChartLine className="mx-auto text-4xl mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
                <p className="mb-4">
                  Start building your portfolio by purchasing your first stock
                </p>
              </div>
              <button
                onClick={() => navigate("/explore")}
                className="btn btn-primary"
              >
                <FaShoppingCart className="mr-2" />
                Explore Stocks
              </button>
            </div>
          )}
        </div>

        {/* Portfolio Performance Summary */}
        {portfolioData?.holdings && portfolioData.holdings.length > 0 && (
          <div
            className={`mt-6 rounded-lg shadow-sm p-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <h3
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Portfolio Performance Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Total Invested
                </p>
                <p
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatCurrency(portfolioData.total_invested)}
                </p>
              </div>
              <div className="text-center">
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Current Value
                </p>
                <p
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatCurrency(portfolioData.total_portfolio_value)}
                </p>
              </div>
              <div className="text-center">
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Diversification Score
                </p>
                <p
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {portfolioData.diversification_score?.toFixed(0) || 0}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;
