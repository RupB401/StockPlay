import React, { useState } from "react";
import { FaWallet, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { useTheme } from "../contexts/ThemeContext";

const WalletBalance = ({ className = "" }) => {
  const { data: walletData, isLoading, error } = useWalletBalance();
  const { isDark } = useTheme();
  const [showPanel, setShowPanel] = useState(false);

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

  const handleWalletClick = () => {
    setShowPanel(!showPanel);
  };

  const handleClosePanel = () => {
    setShowPanel(false);
  };

  if (error) {
    return (
      <div className="relative">
        <button
          className={`btn btn-ghost btn-circle ${className}`}
          onClick={handleWalletClick}
          title="Wallet Error - Click for details"
        >
          <FaExclamationTriangle className="text-red-500 text-lg" />
        </button>

        {showPanel && (
          <div
            className={`absolute top-full right-0 mt-2 w-64 p-4 rounded-lg shadow-lg border z-50 ${
              isDark
                ? "bg-gray-800 text-white border-gray-600"
                : "bg-white text-gray-800 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-red-500">Wallet Error</h3>
              <button
                onClick={handleClosePanel}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <p className="text-sm text-red-500">{error.message}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className={`btn btn-ghost btn-circle ${className}`}
        onClick={handleWalletClick}
        title="Wallet"
      >
        <FaWallet className="text-lg" />
      </button>

      {showPanel && (
        <div
          className={`absolute top-full right-0 mt-2 w-72 p-4 rounded-lg shadow-lg border z-50 ${
            isDark
              ? "bg-gray-800 text-white border-gray-600"
              : "bg-white text-gray-800 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FaWallet className="text-blue-500" />
              <h3 className="font-semibold">Wallet Overview</h3>
            </div>
            <button
              onClick={handleClosePanel}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes />
            </button>
          </div>

          {isLoading && !walletData ? (
            <div className="text-center py-4">
              <div className="animate-spin mb-2">
                <FaWallet className="text-gray-400 mx-auto" />
              </div>
              <p className="text-sm text-gray-400">Loading wallet data...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg ${
                  isDark ? "bg-gray-700" : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Available Balance</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(walletData?.balance)}
                  </span>
                </div>
              </div>

              {walletData?.total_invested !== undefined && (
                <div
                  className={`p-3 rounded-lg ${
                    isDark ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Invested</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(walletData.total_invested)}
                    </span>
                  </div>
                </div>
              )}

              {walletData?.portfolio_value !== undefined && (
                <div
                  className={`p-3 rounded-lg ${
                    isDark ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Portfolio Value</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(walletData.portfolio_value)}
                    </span>
                  </div>
                </div>
              )}

              {walletData?.total_invested !== undefined &&
                walletData?.portfolio_value !== undefined && (
                  <div
                    className={`p-3 rounded-lg ${
                      isDark ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Gain/Loss</span>
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
                          walletData.portfolio_value - walletData.total_invested
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-center mt-1">
                      <span
                        className={`${
                          walletData.portfolio_value -
                            walletData.total_invested >=
                          0
                            ? "text-green-500"
                            : "text-red-500"
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
                      </span>
                    </div>
                  </div>
                )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 text-center">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletBalance;
