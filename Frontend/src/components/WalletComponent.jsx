import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaWallet,
  FaCoins,
  FaArrowUp,
  FaArrowDown,
  FaChartLine,
  FaChartBar,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { apiEndpoints } from "../utils/apiInterceptor";

const WalletComponent = ({ onClick, className = "" }) => {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { isDark } = useTheme();
  const { user, loading: authLoading } = useAuth();

  // Refs for cleanup and preventing memory leaks
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);
  const isComponentMountedRef = useRef(true);
  const userRef = useRef(user);
  const loadingRef = useRef(loading);
  const retryCountRef = useRef(retryCount);
  const lastFetchTimeRef = useRef(0);

  // Constants for error handling
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 1000;
  const REQUEST_TIMEOUT = 10000;
  const MIN_FETCH_INTERVAL = 5000;

  // Cleanup effect
  useEffect(() => {
    isComponentMountedRef.current = true;

    return () => {
      isComponentMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Update refs when values change
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  // Enhanced fetch function with comprehensive error handling
  const fetchWalletDataWithHandling = useCallback(async () => {
    if (!userRef.current || authLoading) {
      console.log("Skipping wallet fetch - no user or auth loading");
      return;
    }

    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      console.warn("Fetch request throttled - too soon after last request");
      return;
    }

    if (loadingRef.current) {
      console.warn("Request already in progress");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      lastFetchTimeRef.current = now;

      console.log(
        "Starting wallet fetch for user:",
        userRef.current?.email || userRef.current?.id
      );

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error("Request timeout - server may be overloaded"));
        }, REQUEST_TIMEOUT);
      });

      const fetchPromise = apiEndpoints.wallet();
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!isComponentMountedRef.current) {
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed - please login again");
        } else if (response.status === 403) {
          throw new Error("Access denied - insufficient permissions");
        } else if (response.status === 404) {
          throw new Error("Wallet service not found");
        } else if (response.status >= 500) {
          throw new Error("Server error - please try again later");
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format from server");
      }

      if (!data.data) {
        throw new Error("Missing wallet data in response");
      }

      console.log("Wallet data fetched successfully:", data.data);
      setWalletData(data.data);
      setRetryCount(0);
    } catch (error) {
      console.error("Wallet fetch error:", error);

      if (!isComponentMountedRef.current) {
        return;
      }

      if (error.name === "AbortError") {
        console.log("Request was cancelled");
        return;
      }

      if (
        error.message.includes("NetworkError") ||
        error.message.includes("Failed to fetch")
      ) {
        setError("Network connection error - check your internet connection");
      } else if (error.message.includes("timeout")) {
        setError("Request timed out - server may be busy");
      } else {
        setError(error.message || "Failed to load wallet data");
      }

      if (
        retryCountRef.current < MAX_RETRY_ATTEMPTS &&
        !error.message.includes("Authentication") &&
        !error.message.includes("token")
      ) {
        const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current);
        console.log(
          `Retrying in ${delay}ms (attempt ${
            retryCountRef.current + 1
          }/${MAX_RETRY_ATTEMPTS})`
        );

        timeoutRef.current = setTimeout(() => {
          if (isComponentMountedRef.current) {
            setRetryCount((prev) => prev + 1);
            fetchWalletDataWithHandling();
          }
        }, delay);
      } else {
        console.log("Max retries reached or auth error - stopping retries");
      }
    } finally {
      if (isComponentMountedRef.current) {
        setLoading(false);
      }
    }
  }, [authLoading]);

  // Reset error state when user changes
  useEffect(() => {
    if (user && !authLoading && !walletData) {
      console.log("User logged in and no wallet data - fetching...");
      setError(null);
      setRetryCount(0);
      fetchWalletDataWithHandling();
    } else if (!user) {
      console.log("User logged out - clearing wallet data");
      setWalletData(null);
      setError(null);
    }
  }, [user, authLoading, fetchWalletDataWithHandling, walletData]);

  // Auto-retry effect when retryCount changes
  useEffect(() => {
    if (
      retryCount > 0 &&
      retryCount <= MAX_RETRY_ATTEMPTS &&
      user &&
      !authLoading
    ) {
      console.log(`Auto-retry attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}`);
      const delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
      timeoutRef.current = setTimeout(() => {
        if (isComponentMountedRef.current) {
          fetchWalletDataWithHandling();
        }
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [retryCount, user, authLoading, fetchWalletDataWithHandling]);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (onClick) {
      onClick(e);
    }
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

  const getBalanceIcon = () => {
    if (
      !walletData ||
      walletData.balance === null ||
      walletData.balance === undefined
    ) {
      return <FaWallet className="text-gray-400" />;
    }
    if (walletData.balance > 0) {
      return <FaCoins className="text-yellow-500" />;
    }
    return <FaWallet className="text-gray-400" />;
  };

  const getBalanceColor = () => {
    if (
      !walletData ||
      walletData.balance === null ||
      walletData.balance === undefined
    ) {
      return "text-gray-400";
    }
    if (walletData.balance >= 1000) {
      return "text-green-600";
    } else if (walletData.balance >= 100) {
      return "text-yellow-600";
    } else if (walletData.balance > 0) {
      return "text-orange-600";
    }
    return "text-red-600";
  };

  if (!user) {
    return null;
  }

  if (loading && !walletData) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin">
          <FaWallet className="text-gray-400" />
        </div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center space-x-2 cursor-pointer ${className}`}
        onClick={handleClick}
        title={`Error: ${error}`}
      >
        <FaExclamationTriangle className="text-red-500" />
        <span className="text-sm text-red-500">Wallet Error</span>
        {retryCount > 0 && (
          <span className="text-xs text-gray-400">
            (Retry {retryCount}/{MAX_RETRY_ATTEMPTS})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`flex items-center space-x-2 cursor-pointer transition-colors duration-200 hover:bg-opacity-20 hover:bg-gray-300 p-2 rounded ${className}`}
        onClick={handleClick}
        title="View wallet details"
      >
        {getBalanceIcon()}
        <span className={`text-sm font-medium ${getBalanceColor()}`}>
          {formatCurrency(walletData?.balance)}
        </span>
        {loading && (
          <div className="animate-spin">
            <FaChartLine className="text-xs text-gray-400" />
          </div>
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute top-full right-0 mt-2 w-80 ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          } border rounded-lg shadow-lg z-50 p-4`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Wallet Overview</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {walletData && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center space-x-2">
                    <FaCoins className="text-yellow-500" />
                    <span className="text-sm font-medium">
                      Available Balance
                    </span>
                  </div>
                  <span className={`font-bold ${getBalanceColor()}`}>
                    {formatCurrency(walletData.balance)}
                  </span>
                </div>

                {walletData.total_invested !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center space-x-2">
                      <FaChartBar className="text-blue-500" />
                      <span className="text-sm font-medium">
                        Total Invested
                      </span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(walletData.total_invested)}
                    </span>
                  </div>
                )}

                {walletData.total_invested !== undefined &&
                  walletData.balance !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        <FaChartBar
                          className={`${
                            walletData.balance +
                              (walletData.portfolio_value || 0) -
                              walletData.total_invested >=
                            0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          Net Profit/Loss
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold ${
                            walletData.balance +
                              (walletData.portfolio_value || 0) -
                              walletData.total_invested >=
                            0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {walletData.balance +
                            (walletData.portfolio_value || 0) -
                            walletData.total_invested >=
                          0
                            ? "+"
                            : ""}
                          {formatCurrency(
                            walletData.balance +
                              (walletData.portfolio_value || 0) -
                              walletData.total_invested
                          )}
                        </span>
                        <div
                          className={`text-xs ${
                            walletData.balance +
                              (walletData.portfolio_value || 0) -
                              walletData.total_invested >=
                            0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          (
                          {walletData.total_invested > 0
                            ? (
                                ((walletData.balance +
                                  (walletData.portfolio_value || 0) -
                                  walletData.total_invested) /
                                  walletData.total_invested) *
                                100
                              ).toFixed(2)
                            : "0.00"}
                          %)
                        </div>
                      </div>
                    </div>
                  )}

                {walletData.portfolio_value !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center space-x-2">
                      <FaChartLine className="text-green-500" />
                      <span className="text-sm font-medium">
                        Portfolio Value
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-600">
                        {formatCurrency(walletData.portfolio_value)}
                      </span>
                      {walletData.portfolio_change !== undefined && (
                        <div
                          className={`text-xs flex items-center ${
                            walletData.portfolio_change >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {walletData.portfolio_change >= 0 ? (
                            <FaArrowUp />
                          ) : (
                            <FaArrowDown />
                          )}
                          <span className="ml-1">
                            {formatCurrency(
                              Math.abs(walletData.portfolio_change)
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {walletData.total_invested !== undefined &&
                  walletData.portfolio_value !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        <FaChartBar
                          className={`${
                            walletData.portfolio_value -
                              walletData.total_invested >=
                            0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          Net Gain/Loss
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold ${
                            walletData.portfolio_value -
                              walletData.total_invested >=
                            0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {walletData.portfolio_value -
                            walletData.total_invested >=
                          0
                            ? "+"
                            : ""}
                          {formatCurrency(
                            walletData.portfolio_value -
                              walletData.total_invested
                          )}
                        </span>
                        <div
                          className={`text-xs ${
                            walletData.portfolio_value -
                              walletData.total_invested >=
                            0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          (
                          {walletData.total_invested > 0
                            ? (
                                ((walletData.portfolio_value -
                                  walletData.total_invested) /
                                  walletData.total_invested) *
                                100
                              ).toFixed(2)
                            : "0.00"}
                          %)
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  setError(null);
                  setRetryCount(0);
                  fetchWalletDataWithHandling();
                }}
                disabled={loading}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Refreshing..." : "Refresh Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletComponent;
