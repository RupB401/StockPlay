import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaShoppingCart,
  FaTags,
  FaChartLine,
  FaWallet,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { apiEndpoints } from "../utils/apiInterceptor";

const TradingPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [stockData, setStockData] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState("BUY"); // 'BUY' or 'SELL'
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userHolding, setUserHolding] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchStockData();
      fetchWalletData();
      fetchUserHolding();
    }
  }, [symbol]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.stockDetail(symbol);

      if (response.ok) {
        const data = await response.json();
        setStockData(data);
      } else {
        throw new Error("Failed to fetch stock data");
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
      setError("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      setWalletLoading(true);
      const response = await apiEndpoints.wallet();

      if (response.ok) {
        const data = await response.json();
        setWalletData(data.data);
      } else {
        throw new Error("Failed to fetch wallet data");
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchUserHolding = async () => {
    try {
      const response = await apiEndpoints.holdings(symbol);

      if (response.ok) {
        const data = await response.json();
        setUserHolding(data.data);
      } else if (response.status === 404) {
        // User doesn't own this stock, which is fine
        setUserHolding(null);
      }
    } catch (error) {
      // User doesn't own this stock, which is fine
      console.log("User does not own this stock");
      setUserHolding(null);
    }
  };

  const executeTrade = async () => {
    if (!stockData || !walletData || !quantity || quantity <= 0) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const currentPrice = getNumericPrice();

      // Validation
      if (currentPrice <= 0) {
        setError("Unable to fetch current stock price. Please try again.");
        return;
      }

      const totalCost = currentPrice * quantity;
      if (orderType === "BUY" && totalCost > walletData.quantz_balance) {
        setError(
          `Insufficient balance. Required: ${formatCurrency(
            totalCost
          )}, Available: ${formatCurrency(walletData.quantz_balance)}`
        );
        return;
      }

      const tradeData = {
        symbol: symbol,
        quantity: parseInt(quantity),
        current_price: currentPrice,
      };

      const response =
        orderType === "BUY"
          ? await apiEndpoints.buy(tradeData)
          : await apiEndpoints.sell(tradeData);

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message);
        // Refresh data
        await fetchWalletData();
        await fetchUserHolding();
        setQuantity(1);
      } else {
        setError(
          data.message || data.detail || "Transaction failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Error executing trade:", error);
      setError("Failed to execute trade. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    // Handle string prices from API (like "$123.45")
    if (typeof amount === "string") {
      // Remove currency symbols and parse
      const numericValue = parseFloat(amount.replace(/[^0-9.-]/g, ""));
      if (isNaN(numericValue)) return "$0.00";
      amount = numericValue;
    }

    // Handle null, undefined, or NaN values
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

  // Helper function to get numeric price value
  const getNumericPrice = () => {
    if (!stockData) return 0;

    // Check if we have current_price field
    if (stockData.current_price !== undefined) {
      return typeof stockData.current_price === "string"
        ? parseFloat(stockData.current_price.replace(/[^0-9.-]/g, "")) || 0
        : stockData.current_price || 0;
    }

    // Fallback to price field from API
    if (stockData.price !== undefined) {
      return typeof stockData.price === "string"
        ? parseFloat(stockData.price.replace(/[^0-9.-]/g, "")) || 0
        : stockData.price || 0;
    }

    return 0;
  };

  const calculateTotal = () => {
    const price = getNumericPrice();
    if (!price || !quantity) return 0;
    return price * quantity;
  };

  const canExecuteTrade = () => {
    const currentPrice = getNumericPrice();

    // Basic validation
    if (
      !stockData ||
      !walletData ||
      !quantity ||
      quantity <= 0 ||
      currentPrice <= 0
    ) {
      return false;
    }

    if (orderType === "BUY") {
      // For buy orders, just check if they have some balance (allow partial purchases)
      return (
        walletData.quantz_balance > 0 &&
        calculateTotal() <= walletData.quantz_balance
      );
    } else {
      // For sell orders, check if they have enough shares
      return userHolding && quantity <= userHolding.quantity;
    }
  };

  const getMaxQuantity = () => {
    if (orderType === "SELL" && userHolding) {
      return userHolding.quantity;
    }
    // No max limit for buy orders - user can enter any amount
    return 0; // 0 means no limit
  };

  if (loading && !stockData) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2
              className={`text-2xl font-bold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Stock Not Found
            </h2>
            <button
              onClick={() => navigate("/explore")}
              className="btn btn-primary"
            >
              Back to Explore
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
      <div className="max-w-4xl mx-auto">
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
          <h1
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Trade {symbol}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Info */}
          <div
            className={`rounded-lg shadow-sm p-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div
                className={`p-3 rounded-lg ${
                  isDark ? "bg-blue-900" : "bg-blue-100"
                }`}
              >
                <FaChartLine
                  className={`text-xl ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}
                />
              </div>
              <div>
                <h2
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {stockData.name || symbol}
                </h2>
                <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {symbol}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span
                  className={`${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Current Price
                </span>
                <span
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatCurrency(getNumericPrice())}
                </span>
              </div>

              {stockData.change && (
                <div className="flex justify-between items-center">
                  <span
                    className={`${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Day Change
                  </span>
                  <span
                    className={`font-semibold ${
                      stockData.isNegative
                        ? isDark
                          ? "text-red-400"
                          : "text-red-600"
                        : isDark
                        ? "text-green-400"
                        : "text-green-600"
                    }`}
                  >
                    {stockData.change} ({stockData.percent})
                  </span>
                </div>
              )}

              {userHolding && (
                <div
                  className={`mt-6 p-4 rounded-lg ${
                    isDark ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <h3
                    className={`font-semibold mb-2 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Your Holdings
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Shares Owned
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {userHolding.quantity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Average Price
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {formatCurrency(userHolding.average_price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Current Value
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {formatCurrency(userHolding.current_value)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trading Panel */}
          <div
            className={`rounded-lg shadow-sm p-6 ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div
                className={`p-3 rounded-lg ${
                  isDark ? "bg-purple-900" : "bg-purple-100"
                }`}
              >
                <FaShoppingCart
                  className={`text-xl ${
                    isDark ? "text-purple-400" : "text-purple-600"
                  }`}
                />
              </div>
              <h2
                className={`text-xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Place Order
              </h2>
            </div>

            {/* Wallet Info */}
            {walletLoading ? (
              <div className="flex justify-center py-4">
                <div className="loading loading-spinner loading-md"></div>
              </div>
            ) : (
              walletData && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    isDark ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FaWallet
                      className={`${
                        isDark ? "text-purple-400" : "text-purple-600"
                      }`}
                    />
                    <span
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      QuantZ Balance
                    </span>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      isDark ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(walletData.quantz_balance)}
                  </p>
                </div>
              )
            )}

            {/* Order Type Selection */}
            <div className="mb-6">
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Order Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderType("BUY")}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    orderType === "BUY"
                      ? "bg-green-600 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setOrderType("SELL")}
                  disabled={!userHolding}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    orderType === "SELL"
                      ? "bg-red-600 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                  }`}
                >
                  Sell
                </button>
              </div>
              {orderType === "SELL" && !userHolding && (
                <p
                  className={`text-xs mt-2 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  You don't own any shares of this stock
                </p>
              )}
            </div>

            {/* Quantity Input */}
            <div className="mb-6">
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Quantity
              </label>
              <div className="flex gap-2">
                <div className="flex items-center border rounded-lg overflow-hidden flex-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className={`px-3 py-2 ${
                      isDark
                        ? "bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:opacity-50"
                    } transition-colors`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty input for editing
                      if (value === "") {
                        setQuantity("");
                        return;
                      }
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue >= 1) {
                        const maxQty = getMaxQuantity();
                        setQuantity(
                          maxQty > 0 ? Math.min(numValue, maxQty) : numValue
                        );
                      }
                    }}
                    onBlur={() => {
                      // Ensure we have a valid number when focus leaves
                      if (quantity === "" || quantity < 1) {
                        setQuantity(1);
                      }
                    }}
                    className={`flex-1 px-3 py-2 text-center border-0 ${
                      isDark
                        ? "bg-gray-700 text-white"
                        : "bg-white text-gray-900"
                    } focus:outline-none focus:ring-0`}
                  />
                  <button
                    onClick={() => {
                      const maxQty = getMaxQuantity();
                      if (maxQty > 0) {
                        setQuantity(Math.min(quantity + 1, maxQty));
                      } else {
                        setQuantity(quantity + 1);
                      }
                    }}
                    className={`px-3 py-2 ${
                      isDark
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    } transition-colors`}
                  >
                    +
                  </button>
                </div>
                {getMaxQuantity() > 0 && (
                  <button
                    onClick={() => setQuantity(getMaxQuantity())}
                    className="btn btn-outline btn-sm"
                    disabled={quantity === getMaxQuantity()}
                  >
                    Max
                  </button>
                )}
              </div>
              {getMaxQuantity() > 0 && (
                <p
                  className={`text-xs mt-1 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Max: {getMaxQuantity()} shares
                </p>
              )}
            </div>

            {/* Order Summary */}
            <div
              className={`mb-6 p-4 rounded-lg ${
                isDark ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <h3
                className={`font-semibold mb-3 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Order Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Price per share
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {formatCurrency(getNumericPrice())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Quantity
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {quantity}
                  </span>
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="flex justify-between">
                    <span
                      className={`font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Total {orderType === "BUY" ? "Cost" : "Proceeds"}
                    </span>
                    <span
                      className={`font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {getNumericPrice() <= 0 && stockData && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                  isDark
                    ? "bg-red-500/20 border border-red-500/30 text-red-100"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <FaExclamationTriangle />
                Unable to fetch current stock price. Trading is temporarily
                disabled.
              </div>
            )}

            {error && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                  isDark
                    ? "bg-red-500/20 border border-red-500/30 text-red-100"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <FaExclamationTriangle />
                {error}
              </div>
            )}

            {success && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  isDark
                    ? "bg-green-500/20 border border-green-500/30 text-green-100"
                    : "bg-green-50 border border-green-200 text-green-800"
                }`}
              >
                {success}
              </div>
            )}

            {/* Validation Warnings */}
            {!canExecuteTrade() && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                  isDark
                    ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-100"
                    : "bg-yellow-50 border border-yellow-200 text-yellow-800"
                }`}
              >
                <FaExclamationTriangle />
                {orderType === "BUY"
                  ? "Insufficient QuantZ balance for this order"
                  : "Not enough shares to sell"}
              </div>
            )}

            {/* Execute Trade Button */}
            <button
              onClick={executeTrade}
              disabled={loading || !canExecuteTrade() || !stockData}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                orderType === "BUY"
                  ? "bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                  : "bg-red-600 hover:bg-red-700 disabled:bg-gray-600"
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="loading loading-spinner loading-sm"></div>
                  Processing...
                </div>
              ) : (
                `${orderType} ${quantity} shares for ${formatCurrency(
                  calculateTotal()
                )}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingPage;
