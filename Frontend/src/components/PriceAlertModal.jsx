import React, { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  FaTimes,
  FaPlus,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";

const PriceAlertModal = ({ isOpen, onClose, stock = null }) => {
  const { isDark } = useTheme();
  const { addPriceAlert, priceAlerts, removePriceAlert, togglePriceAlert } =
    useNotifications();
  const [formData, setFormData] = useState({
    symbol: stock?.symbol || "",
    name: stock?.name || "",
    type: "above",
    price: "",
    currentPrice: stock?.price || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.symbol && formData.price) {
      addPriceAlert({
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        type: formData.type,
        price: formData.price,
        currentPrice: formData.currentPrice,
      });
      setFormData({
        symbol: "",
        name: "",
        type: "above",
        price: "",
        currentPrice: "",
      });
      onClose();
    }
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`w-full max-w-md mx-4 rounded-lg shadow-xl ${
          isDark ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-xl font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Price Alerts
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-100 ${
                isDark ? "hover:bg-gray-700 text-gray-400" : "text-gray-500"
              }`}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Add New Alert Form */}
        <div className="p-6">
          <h3
            className={`text-lg font-medium mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Create New Alert
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Stock Symbol
              </label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="e.g., AAPL"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Company Name (Optional)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Apple Inc."
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Alert Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="above">Price goes above</option>
                <option value="below">Price goes below</option>
              </select>
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Target Price ($)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              <FaPlus className="inline mr-2" />
              Create Alert
            </button>
          </form>
        </div>

        {/* Existing Alerts */}
        {priceAlerts.length > 0 && (
          <div
            className={`p-6 border-t ${
              isDark ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h3
              className={`text-lg font-medium mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Active Alerts ({priceAlerts.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {priceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    isDark
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {alert.symbol}
                        </span>
                        <span
                          className={`text-sm ${
                            alert.type === "above"
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {alert.type === "above" ? "↗" : "↘"} ${alert.price}
                        </span>
                      </div>
                      {alert.name && (
                        <p
                          className={`text-sm ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {alert.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePriceAlert(alert.id)}
                        className={`p-1 ${
                          alert.active ? "text-green-500" : "text-gray-400"
                        }`}
                        title={alert.active ? "Active" : "Inactive"}
                      >
                        {alert.active ? <FaToggleOn /> : <FaToggleOff />}
                      </button>
                      <button
                        onClick={() => removePriceAlert(alert.id)}
                        className={`p-1 text-red-500 hover:text-red-700`}
                        title="Delete Alert"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceAlertModal;
