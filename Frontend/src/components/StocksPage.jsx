import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularStocks, addStockToDashboard } from "../services/api";
import { FaPlus } from "react-icons/fa";

function StocksPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  const fetchStocks = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
        setError(null);
      }

      const stocksData = await getPopularStocks(15);

      // Validate the data
      if (!Array.isArray(stocksData) || stocksData.length === 0) {
        throw new Error("No stock data received");
      }

      setStocks(stocksData);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Error fetching stocks:", error);
      setError(error.message || "Failed to load stock data");

      // Auto-retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          fetchStocks(true);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleRetry = () => {
    setRetryCount(0);
    fetchStocks();
  };

  const handleAddToDashboard = async (symbol) => {
    try {
      await addStockToDashboard(symbol);
      // Show success message (you can add a toast notification here)
      console.log(`Added ${symbol} to dashboard`);
    } catch (error) {
      console.error("Error adding to dashboard:", error);
    }
  };

  const getLogoUrl = (symbol) => {
    const logoMap = {
      AAPL: "https://logo.clearbit.com/apple.com",
      MSFT: "https://logo.clearbit.com/microsoft.com",
      GOOGL: "https://logo.clearbit.com/google.com",
      AMZN: "https://logo.clearbit.com/amazon.com",
      TSLA: "https://logo.clearbit.com/tesla.com",
      META: "https://logo.clearbit.com/meta.com",
      NVDA: "https://logo.clearbit.com/nvidia.com",
      NFLX: "https://logo.clearbit.com/netflix.com",
    };
    return logoMap[symbol] || `https://via.placeholder.com/40?text=${symbol}`;
  };

  if (loading) {
    return (
      <div className="p-4 pt-20">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>Loading stocks...</div>
          {retryCount > 0 && (
            <div className="text-sm text-gray-500 mt-2">
              Retry attempt {retryCount}/3
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && stocks.length === 0) {
    return (
      <div className="p-4 pt-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Popular Stocks</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-500 hover:text-blue-700"
          >
            ← Back
          </button>
        </div>

        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg
              className="w-12 h-12 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to Load Stocks</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Popular Stocks</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-500 hover:text-blue-700"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
            onClick={() => navigate(`/stock/${stock.symbol}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={getLogoUrl(stock.symbol)}
                  alt={stock.name}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/40?text=${stock.symbol}`;
                  }}
                />
                <div>
                  <div className="font-medium text-sm">{stock.name}</div>
                  <div className="text-xs text-gray-500">{stock.symbol}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  handleAddToDashboard(stock.symbol);
                }}
                className="p-1 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                title="Add to Dashboard"
              >
                <FaPlus className="w-3 h-3 text-gray-600" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold">{stock.price}</div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    stock.isNegative ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {stock.change} ({stock.percent}%)
                </span>
              </div>
            </div>

            {/* Mini chart placeholder */}
            <div className="mt-3 h-8 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">Chart</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StocksPage;
