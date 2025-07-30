import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

const StockUniversePage = () => {
  const { isDark } = useTheme();
  const [universeData, setUniverseData] = useState(null);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSector, setSelectedSector] = useState("");
  const [sectorStocks, setSectorStocks] = useState([]);

  useEffect(() => {
    loadUniverseData();
  }, []);

  const loadUniverseData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [overviewResponse, historyResponse, sectorsResponse] =
        await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/stock-universe/overview`),
          fetch(`${import.meta.env.VITE_API_URL}/stock-universe/history`),
          fetch("http://localhost:8000/stock-universe/sectors"),
        ]);

      if (overviewResponse.ok) {
        const overview = await overviewResponse.json();
        setUniverseData(overview);
      }

      if (historyResponse.ok) {
        const history = await historyResponse.json();
        setUpdateHistory(history.history || []);
      }

      if (sectorsResponse.ok) {
        const sectorsData = await sectorsResponse.json();
        setSectors(sectorsData.sectors || []);
      }
    } catch (error) {
      console.error("Error loading universe data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceUpdate = async () => {
    try {
      setUpdating(true);

      const response = await fetch(
        "http://localhost:8000/stock-universe/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ force: true }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Update completed: ${result.message}`);
        loadUniverseData(); // Reload data
      } else {
        alert("Update failed. Please try again.");
      }
    } catch (error) {
      console.error("Error updating universe:", error);
      alert("Update failed. Please check the console for details.");
    } finally {
      setUpdating(false);
    }
  };

  const loadSectorStocks = async (sector) => {
    try {
      const response = await fetch(
        `http://localhost:8000/stock-universe/sector/${sector}/stocks`
      );
      if (response.ok) {
        const data = await response.json();
        setSectorStocks(data.stocks || []);
      }
    } catch (error) {
      console.error("Error loading sector stocks:", error);
    }
  };

  const handleSectorChange = (sector) => {
    setSelectedSector(sector);
    if (sector) {
      loadSectorStocks(sector);
    } else {
      setSectorStocks([]);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Loading stock universe data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            } mb-2`}
          >
            📊 Stock Universe Management
          </h1>
          <p
            className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            Learn how our dynamic stock universe keeps your screener up-to-date
            with the latest market data
          </p>
        </div>

        {/* Educational Introduction */}
        <div
          className={`${
            isDark
              ? "bg-blue-900/20 border-blue-700"
              : "bg-blue-50 border-blue-200"
          } border rounded-lg p-6 mb-8`}
        >
          <h2
            className={`text-xl font-semibold ${
              isDark ? "text-blue-300" : "text-blue-800"
            } mb-3`}
          >
            🎓 What is Stock Universe Management?
          </h2>
          <div
            className={`${
              isDark ? "text-blue-200" : "text-blue-700"
            } space-y-2`}
          >
            <p>
              <strong>Stock Universe</strong> refers to the complete set of
              stocks available for screening and analysis. Unlike static lists,
              our dynamic system automatically updates this universe to ensure
              you always have access to:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>
                <strong>New IPOs</strong> - Recently public companies are added
                automatically
              </li>
              <li>
                <strong>Market Changes</strong> - Delisted or inactive stocks
                are removed
              </li>
              <li>
                <strong>Fresh Data</strong> - Company information is kept
                current
              </li>
              <li>
                <strong>Sector Updates</strong> - Companies that change sectors
                are properly categorized
              </li>
            </ul>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", label: "📈 Overview", icon: "📈" },
                { id: "sectors", label: "🏭 Sectors", icon: "🏭" },
                { id: "history", label: "📜 History", icon: "📜" },
                { id: "tutorial", label: "🎓 Tutorial", icon: "🎓" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? isDark
                        ? "border-blue-500 text-blue-400"
                        : "border-blue-500 text-blue-600"
                      : isDark
                      ? "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Stocks */}
              <div
                className={`${
                  isDark ? "bg-gray-800" : "bg-white"
                } rounded-lg p-6 shadow-sm`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {universeData?.total_stocks || 0}
                    </p>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Active Stocks
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Update */}
              <div
                className={`${
                  isDark ? "bg-gray-800" : "bg-white"
                } rounded-lg p-6 shadow-sm`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">🔄</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {universeData?.last_update
                        ? new Date(
                            universeData.last_update.update_date
                          ).toLocaleDateString()
                        : "Never"}
                    </p>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Last Updated
                    </p>
                  </div>
                </div>
              </div>

              {/* Update Frequency */}
              <div
                className={`${
                  isDark ? "bg-gray-800" : "bg-white"
                } rounded-lg p-6 shadow-sm`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">⏰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Every 3 Days
                    </p>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Auto Update
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Control */}
            <div
              className={`${
                isDark ? "bg-gray-800" : "bg-white"
              } rounded-lg p-6 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className={`text-lg font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    } mb-2`}
                  >
                    Manual Update
                  </h3>
                  <p
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Force an immediate update of the stock universe. This will
                    fetch the latest data from multiple sources.
                  </p>
                </div>
                <button
                  onClick={handleForceUpdate}
                  disabled={updating}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    updating
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {updating ? "🔄 Updating..." : "🚀 Update Now"}
                </button>
              </div>
            </div>

            {/* How It Works */}
            <div
              className={`${
                isDark ? "bg-gray-800" : "bg-white"
              } rounded-lg p-6 shadow-sm`}
            >
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                } mb-4`}
              >
                🔧 How Our Dynamic Universe Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4
                    className={`font-medium ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    } mb-2`}
                  >
                    📡 Data Sources
                  </h4>
                  <ul
                    className={`text-sm ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    } space-y-1`}
                  >
                    <li>
                      • <strong>Finnhub API:</strong> Real-time stock listings
                    </li>
                    <li>
                      • <strong>Yahoo Finance:</strong> Company information
                    </li>
                    <li>
                      • <strong>Market Indices:</strong> S&P 500, NASDAQ
                      listings
                    </li>
                  </ul>
                </div>
                <div>
                  <h4
                    className={`font-medium ${
                      isDark ? "text-green-400" : "text-green-600"
                    } mb-2`}
                  >
                    ⚡ Update Process
                  </h4>
                  <ul
                    className={`text-sm ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    } space-y-1`}
                  >
                    <li>
                      • <strong>Fetch:</strong> Get latest stock lists
                    </li>
                    <li>
                      • <strong>Filter:</strong> Remove invalid/delisted stocks
                    </li>
                    <li>
                      • <strong>Categorize:</strong> Assign proper sectors
                    </li>
                    <li>
                      • <strong>Update:</strong> Refresh screener data
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sectors" && (
          <div className="space-y-6">
            <div
              className={`${
                isDark ? "bg-gray-800" : "bg-white"
              } rounded-lg p-6 shadow-sm`}
            >
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                } mb-4`}
              >
                🏭 Stock Distribution by Sector
              </h3>

              {/* Sector Selection */}
              <div className="mb-6">
                <select
                  value={selectedSector}
                  onChange={(e) => handleSectorChange(e.target.value)}
                  className={`w-full md:w-64 px-3 py-2 border rounded-lg ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="">Select a sector to view stocks...</option>
                  {sectors.map((sector) => (
                    <option key={sector.sector} value={sector.sector}>
                      {sector.display_name} ({sector.stock_count} stocks)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sectors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {sectors.map((sector) => (
                  <div
                    key={sector.sector}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSector === sector.sector
                        ? isDark
                          ? "bg-blue-900/30 border-blue-500"
                          : "bg-blue-50 border-blue-300"
                        : isDark
                        ? "border-gray-600 hover:border-gray-500"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleSectorChange(sector.sector)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className={`font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {sector.display_name}
                      </h4>
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: sector.color_code }}
                      ></span>
                    </div>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      } mb-2`}
                    >
                      {sector.description}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isDark ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {sector.stock_count} stocks
                    </p>
                  </div>
                ))}
              </div>

              {/* Selected Sector Stocks */}
              {selectedSector && sectorStocks.length > 0 && (
                <div
                  className={`border-t ${
                    isDark ? "border-gray-700" : "border-gray-200"
                  } pt-6`}
                >
                  <h4
                    className={`font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    } mb-4`}
                  >
                    Stocks in{" "}
                    {
                      sectors.find((s) => s.sector === selectedSector)
                        ?.display_name
                    }
                    :
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {sectorStocks.map((stock) => (
                      <div
                        key={stock}
                        className={`px-3 py-2 rounded-lg text-center text-sm font-mono ${
                          isDark
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {stock}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            <div
              className={`${
                isDark ? "bg-gray-800" : "bg-white"
              } rounded-lg p-6 shadow-sm`}
            >
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                } mb-6`}
              >
                📜 Update History
              </h3>

              {updateHistory.length === 0 ? (
                <p
                  className={`text-center py-8 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  No update history available yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {updateHistory.map((update, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        isDark ? "border-gray-700" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              update.status === "success"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {update.status}
                          </span>
                          <span
                            className={`text-sm ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {new Date(update.update_date).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {update.total_stocks} total stocks
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span
                            className={`text-green-600 dark:text-green-400 font-medium`}
                          >
                            +{update.stocks_added}
                          </span>
                          <span
                            className={`ml-1 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            added
                          </span>
                        </div>
                        <div>
                          <span
                            className={`text-red-600 dark:text-red-400 font-medium`}
                          >
                            -{update.stocks_removed}
                          </span>
                          <span
                            className={`ml-1 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            removed
                          </span>
                        </div>
                      </div>

                      {update.notes && (
                        <p
                          className={`mt-2 text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {update.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tutorial" && (
          <div className="space-y-6">
            <div
              className={`${
                isDark ? "bg-gray-800" : "bg-white"
              } rounded-lg p-6 shadow-sm`}
            >
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                } mb-6`}
              >
                🎓 Stock Universe Tutorial
              </h3>

              <div className="space-y-8">
                {/* Step 1 */}
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                  </div>
                  <div>
                    <h4
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      } mb-2`}
                    >
                      Understanding Stock Universe
                    </h4>
                    <p
                      className={`${
                        isDark ? "text-gray-300" : "text-gray-600"
                      } mb-3`}
                    >
                      The stock universe is the foundation of our screener. It
                      determines which stocks are available for filtering and
                      analysis. Our dynamic system ensures this list stays
                      current with market changes.
                    </p>
                    <div
                      className={`${
                        isDark ? "bg-blue-900/20" : "bg-blue-50"
                      } rounded-lg p-3`}
                    >
                      <p
                        className={`text-sm ${
                          isDark ? "text-blue-200" : "text-blue-700"
                        }`}
                      >
                        💡 <strong>Pro Tip:</strong> A larger, more current
                        universe gives you better screening results and ensures
                        you don't miss newly public companies.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                  </div>
                  <div>
                    <h4
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      } mb-2`}
                    >
                      Automatic Updates
                    </h4>
                    <p
                      className={`${
                        isDark ? "text-gray-300" : "text-gray-600"
                      } mb-3`}
                    >
                      Our system automatically updates the stock universe every
                      3 days by:
                    </p>
                    <ul
                      className={`${
                        isDark ? "text-gray-300" : "text-gray-600"
                      } space-y-1 ml-4`}
                    >
                      <li>
                        • Fetching latest stock listings from multiple APIs
                      </li>
                      <li>• Adding newly public companies (IPOs)</li>
                      <li>• Removing delisted or inactive stocks</li>
                      <li>• Updating sector classifications</li>
                      <li>• Refreshing company information</li>
                    </ul>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                  </div>
                  <div>
                    <h4
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      } mb-2`}
                    >
                      Manual Control
                    </h4>
                    <p
                      className={`${
                        isDark ? "text-gray-300" : "text-gray-600"
                      } mb-3`}
                    >
                      You can force an immediate update using the "Update Now"
                      button in the Overview tab. This is useful when:
                    </p>
                    <ul
                      className={`${
                        isDark ? "text-gray-300" : "text-gray-600"
                      } space-y-1 ml-4`}
                    >
                      <li>• You know of a major IPO or listing</li>
                      <li>• Market conditions have changed significantly</li>
                      <li>• You want the absolute latest data for analysis</li>
                    </ul>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      4
                    </div>
                  </div>
                  <div>
                    <h4
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      } mb-2`}
                    >
                      Monitoring and History
                    </h4>
                    <p
                      className={`${
                        isDark ? "text-gray-300" : "text-gray-600"
                      } mb-3`}
                    >
                      The History tab shows you exactly what changed in each
                      update:
                    </p>
                    <ul
                      className={`${
                        isDark ? "text-gray-300" : "text-gray-600"
                      } space-y-1 ml-4`}
                    >
                      <li>• How many stocks were added or removed</li>
                      <li>• When each update occurred</li>
                      <li>• Success/failure status of updates</li>
                      <li>• Total stocks in the universe over time</li>
                    </ul>
                  </div>
                </div>

                {/* Best Practices */}
                <div
                  className={`${
                    isDark
                      ? "bg-yellow-900/20 border-yellow-700"
                      : "bg-yellow-50 border-yellow-200"
                  } border rounded-lg p-4`}
                >
                  <h4
                    className={`font-semibold ${
                      isDark ? "text-yellow-300" : "text-yellow-800"
                    } mb-2`}
                  >
                    📋 Best Practices
                  </h4>
                  <ul
                    className={`${
                      isDark ? "text-yellow-200" : "text-yellow-700"
                    } space-y-1`}
                  >
                    <li>
                      • Check the Overview tab regularly to see update status
                    </li>
                    <li>
                      • Review the History tab to understand universe changes
                    </li>
                    <li>
                      • Use manual updates sparingly - automatic updates are
                      usually sufficient
                    </li>
                    <li>
                      • Monitor sector distribution to ensure balanced coverage
                    </li>
                    <li>
                      • Be aware that universe changes may affect your saved
                      screener results
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockUniversePage;
