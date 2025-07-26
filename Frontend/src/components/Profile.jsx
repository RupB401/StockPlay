import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaWallet,
  FaChartLine,
  FaTrophy,
  FaCoins,
  FaArrowUp,
  FaArrowDown,
  FaPlus,
  FaBell,
  FaHistory,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

function Profile() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [portfolioData, setPortfolioData] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");

      // Fetch all data in parallel
      const [portfolioRes, walletRes, transactionsRes, alertsRes] =
        await Promise.all([
          fetch("http://localhost:8000/trading/portfolio", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch("http://localhost:8000/trading/wallet", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch("http://localhost:8000/trading/transactions?limit=5", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch("http://localhost:8000/trading/alerts", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setPortfolioData(portfolioData.data);
      }

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWalletData(walletData.data);
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.data.transactions);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.data);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProfitLossColor = (amount) => {
    if (amount > 0) return isDark ? "text-green-400" : "text-green-600";
    if (amount < 0) return isDark ? "text-red-400" : "text-red-600";
    return isDark ? "text-gray-300" : "text-gray-600";
  };

  const getPerformanceLevel = (gainLossPercent) => {
    if (gainLossPercent >= 20)
      return {
        level: "Expert Trader",
        color: "text-purple-500",
        icon: FaTrophy,
      };
    if (gainLossPercent >= 10)
      return { level: "Advanced", color: "text-blue-500", icon: FaChartLine };
    if (gainLossPercent >= 0)
      return { level: "Profitable", color: "text-green-500", icon: FaArrowUp };
    if (gainLossPercent >= -10)
      return { level: "Learning", color: "text-yellow-500", icon: FaUser };
    return { level: "Beginner", color: "text-gray-500", icon: FaArrowDown };
  };

  if (loading) {
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

  const performance = portfolioData
    ? getPerformanceLevel(portfolioData.total_gain_loss_percent)
    : getPerformanceLevel(0);

  return (
    <div
      className={`min-h-screen p-6 pt-20 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {user?.name?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </span>
            </div>
            <div>
              <h1
                className={`text-3xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {user?.name || "User"}
              </h1>
              <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <performance.icon className={`text-sm ${performance.color}`} />
                <span className={`text-sm font-medium ${performance.color}`}>
                  {performance.level}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet & Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Wallet Card */}
              <div
                className={`rounded-lg shadow-sm p-6 ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-purple-900" : "bg-purple-100"
                      }`}
                    >
                      <FaWallet
                        className={`text-lg ${
                          isDark ? "text-purple-400" : "text-purple-600"
                        }`}
                      />
                    </div>
                    <h3
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      QuantZ Wallet
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate("/trading")}
                    className="btn btn-sm btn-primary"
                  >
                    <FaPlus className="mr-1" />
                    Trade
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Available Balance
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isDark ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(walletData?.quantz_balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Portfolio Value Card */}
              <div
                className={`rounded-lg shadow-sm p-6 ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-blue-900" : "bg-blue-100"
                      }`}
                    >
                      <FaChartLine
                        className={`text-lg ${
                          isDark ? "text-blue-400" : "text-blue-600"
                        }`}
                      />
                    </div>
                    <h3
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Portfolio Value
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate("/portfolio")}
                    className="btn btn-sm btn-outline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Total Value
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatCurrency(portfolioData?.total_portfolio_value)}
                    </p>
                  </div>
                  {portfolioData?.total_gain_loss !== undefined && (
                    <div className="flex items-center gap-2">
                      {portfolioData.total_gain_loss >= 0 ? (
                        <FaArrowUp className="text-sm text-green-500" />
                      ) : (
                        <FaArrowDown className="text-sm text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${getProfitLossColor(
                          portfolioData.total_gain_loss
                        )}`}
                      >
                        {formatCurrency(portfolioData.total_gain_loss)} (
                        {portfolioData.total_gain_loss_percent?.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Holdings Overview */}
            {portfolioData?.holdings && portfolioData.holdings.length > 0 && (
              <div
                className={`rounded-lg shadow-sm p-6 ${
                  isDark ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className={`text-lg font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Top Holdings
                  </h3>
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {portfolioData.holdings.length} stocks
                  </span>
                </div>
                <div className="space-y-3">
                  {portfolioData.holdings.slice(0, 3).map((holding) => (
                    <div
                      key={holding.symbol}
                      className="flex items-center justify-between"
                    >
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
                            {holding.quantity} shares
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {formatCurrency(holding.current_value)}
                        </p>
                        <p
                          className={`text-xs ${getProfitLossColor(
                            holding.unrealized_gain_loss
                          )}`}
                        >
                          {holding.unrealized_gain_loss >= 0 ? "+" : ""}
                          {formatCurrency(holding.unrealized_gain_loss)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`text-lg font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Recent Transactions
                </h3>
                <button
                  onClick={() => navigate("/transactions")}
                  className="btn btn-sm btn-ghost"
                >
                  <FaHistory className="mr-1" />
                  View All
                </button>
              </div>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            transaction.transaction_type === "BUY"
                              ? isDark
                                ? "bg-green-900"
                                : "bg-green-100"
                              : isDark
                              ? "bg-red-900"
                              : "bg-red-100"
                          }`}
                        >
                          {transaction.transaction_type === "BUY" ? (
                            <FaArrowUp
                              className={`text-sm ${
                                isDark ? "text-green-400" : "text-green-600"
                              }`}
                            />
                          ) : (
                            <FaArrowDown
                              className={`text-sm ${
                                isDark ? "text-red-400" : "text-red-600"
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-medium ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {transaction.transaction_type} {transaction.symbol}
                          </p>
                          <p
                            className={`text-xs ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {formatDate(transaction.transaction_date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {transaction.quantity} shares
                        </p>
                        <p
                          className={`text-xs ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {formatCurrency(transaction.total_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p
                    className={`${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    No transactions yet
                  </p>
                  <button
                    onClick={() => navigate("/explore")}
                    className="btn btn-primary btn-sm mt-2"
                  >
                    Start Trading
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total Invested
                  </span>
                  <span
                    className={`font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {formatCurrency(portfolioData?.total_invested)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Holdings
                  </span>
                  <span
                    className={`font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {portfolioData?.number_of_holdings || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Diversification
                  </span>
                  <span
                    className={`font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {portfolioData?.diversification_score?.toFixed(0) || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Price Alerts */}
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`text-lg font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Price Alerts
                </h3>
                <button
                  onClick={() => navigate("/alerts")}
                  className="btn btn-sm btn-ghost"
                >
                  <FaBell className="mr-1" />
                  Manage
                </button>
              </div>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {alert.symbol}
                        </p>
                        <p
                          className={`text-xs ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {alert.condition_type}{" "}
                          {formatCurrency(alert.target_value)}
                        </p>
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          alert.is_triggered ? "bg-red-500" : "bg-green-500"
                        }`}
                      ></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    No active alerts
                  </p>
                  <button
                    onClick={() => navigate("/alerts")}
                    className="btn btn-outline btn-xs mt-2"
                  >
                    Create Alert
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div
              className={`rounded-lg shadow-sm p-6 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/explore")}
                  className="btn btn-outline btn-sm w-full justify-start"
                >
                  <FaChartLine className="mr-2" />
                  Explore Stocks
                </button>
                <button
                  onClick={() => navigate("/portfolio")}
                  className="btn btn-outline btn-sm w-full justify-start"
                >
                  <FaWallet className="mr-2" />
                  View Portfolio
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn btn-outline btn-sm w-full justify-start"
                >
                  <FaTrophy className="mr-2" />
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
