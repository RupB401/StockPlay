import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { screenerService } from "../services/screenerService";

function ScreenerPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [resultStats, setResultStats] = useState(null);
  const [error, setError] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState(new Set());

  // Pagination state
  const [page, setPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(50);

  // Filter states
  const [filters, setFilters] = useState({
    // Market Cap
    min_market_cap: "",
    max_market_cap: "",
    // Price
    min_price: "",
    max_price: "",
    // Valuation
    min_pe: "",
    max_pe: "",
    min_pb: "",
    max_pb: "",
    // Dividend
    min_dividend_yield: "",
    // Risk
    min_beta: "",
    max_beta: "",
    // Financial Health
    min_roe: "",
    min_revenue_growth: "",
    min_earnings_growth: "",
    // Technical
    min_rsi: "",
    max_rsi: "",
    // General
    sector: "All",
    sort_by: "market_cap",
    sort_order: "desc",
    limit: 50,
    offset: 0,
  });

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    sectors: false,
    index: true,
    marketCap: true,
    closePrice: true,
    valuation: true,
    financial: true,
    technical: true,
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [sectorsData] = await Promise.all([screenerService.getSectors()]);
        setSectors(sectorsData.filter((s) => s !== "All"));
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    };

    loadInitialData();
  }, []);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle sector selection
  const handleSectorToggle = (sector) => {
    const newSelected = new Set(selectedSectors);
    if (newSelected.has(sector)) {
      newSelected.delete(sector);
    } else {
      newSelected.add(sector);
    }
    setSelectedSectors(newSelected);

    // Update filters
    if (newSelected.size === 0) {
      handleFilterChange("sector", "All");
    } else {
      // For simplicity, we'll use the first selected sector
      handleFilterChange("sector", Array.from(newSelected)[0]);
    }
  };

  // Toggle section collapse
  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Update limit/offset when page or resultsPerPage changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      limit: resultsPerPage,
      offset: (page - 1) * resultsPerPage,
    }));
  }, [page, resultsPerPage]);

  // Handle results per page change
  const handleResultsPerPageChange = (e) => {
    setResultsPerPage(Number(e.target.value));
    setPage(1); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Run screen
  const runScreen = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert empty strings to null for API
      const apiFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== "All") {
          if (key === "sector" || key === "sort_by" || key === "sort_order") {
            apiFilters[key] = value;
          } else if (key === "limit" || key === "offset") {
            apiFilters[key] = parseInt(value);
          } else {
            apiFilters[key] = parseFloat(value);
          }
        }
      });

      console.log("API Filters being sent:", apiFilters); // Debug log

      const data = await screenerService.screenStocks(apiFilters);
      setResults(data.stocks);
      setResultStats({
        count: data.count,
        filters_applied: data.filters_applied,
        last_updated: data.last_updated,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run screen when filters, selectedSectors, page, or resultsPerPage change
  useEffect(() => {
    const timer = setTimeout(() => {
      runScreen();
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [filters, selectedSectors, page, resultsPerPage]); // Remove runScreen from dependencies

  // Export results
  const exportResults = () => {
    if (results.length === 0) return;
    screenerService.exportToCSV(results, "stock_screen_results.csv");
  };

  // Range input component
  const RangeInput = ({
    label,
    minValue,
    maxValue,
    onMinChange,
    onMaxChange,
    step = "1",
    suffix = "",
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
        >
          {label}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder="0"
            step={step}
            className={`flex-1 px-2 py-1 text-sm border rounded ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            } focus:ring-1 focus:ring-blue-500 focus:border-transparent`}
          />
          <span
            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            to
          </span>
          <input
            type="number"
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder="∞"
            step={step}
            className={`flex-1 px-2 py-1 text-sm border rounded ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            } focus:ring-1 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        {suffix && (
          <div
            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Values in {suffix}
          </div>
        )}
      </div>
    </div>
  );

  // Section header component
  const SectionHeader = ({ title, isCollapsed, onToggle, children }) => (
    <div
      className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50 transition-colors ${
          isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"
        }`}
      >
        <span
          className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {title}
        </span>
        <span
          className={`transform transition-transform ${
            isCollapsed ? "" : "rotate-180"
          } ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          ▼
        </span>
      </button>
      {!isCollapsed && <div className="p-4 pt-0">{children}</div>}
    </div>
  );

  // Mini chart component (placeholder)
  const MiniChart = ({ trend = "up" }) => (
    <div className="w-20 h-8 flex items-center">
      <svg width="80" height="32" className="overflow-visible">
        <path
          d={
            trend === "up"
              ? "M2,24 Q10,20 18,16 T34,12 T50,8 T66,4 T78,2"
              : "M2,8 Q10,12 18,16 T34,20 T50,24 T66,26 T78,28"
          }
          stroke={trend === "up" ? "#10b981" : "#ef4444"}
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );

  // Stock row component
  const StockRow = ({ stock }) => (
    <tr
      className={`cursor-pointer transition-colors border-b ${
        isDark
          ? "hover:bg-gray-700 border-gray-700"
          : "hover:bg-gray-50 border-gray-100"
      }`}
      onClick={() => navigate(`/stock/${stock.symbol}`)}
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded flex items-center justify-center text-sm font-bold ${
              isDark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
            }`}
          >
            {stock.symbol.substring(0, 2)}
          </div>
          <div>
            <div
              className={`font-medium ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {stock.company_name}
            </div>
            <div
              className={`text-sm ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {stock.symbol}
            </div>
          </div>
        </div>
      </td>
      <td className="p-4">
        <MiniChart trend={Math.random() > 0.5 ? "up" : "down"} />
      </td>
      <td className="p-4">
        <div
          className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {stock.price || stock.current_price
            ? `$${(stock.price || stock.current_price).toFixed(2)}`
            : "N/A"}
        </div>
        <div
          className={`text-sm ${
            Math.random() > 0.5 ? "text-green-500" : "text-red-500"
          }`}
        >
          {Math.random() > 0.5 ? "+" : "-"}
          {(Math.random() * 10).toFixed(2)} ({(Math.random() * 5).toFixed(2)}%)
        </div>
      </td>
      <td className="p-4">
        <div
          className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {stock.pe_ratio ? stock.pe_ratio.toFixed(2) : "N/A"}
        </div>
        <div
          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          {stock.sector || "Unknown"}
        </div>
      </td>
      <td className="p-4">
        <div
          className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
        >
          {screenerService.formatMarketCap(stock.market_cap)}
        </div>
      </td>
      <td className="p-4">
        <button
          className={`p-1 rounded-full ${
            isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
        >
          <span className="text-xl">+</span>
        </button>
      </td>
    </tr>
  );

  if (loading && results.length === 0) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-white"}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="loading loading-spinner loading-lg"></div>
            <p
              className={`text-lg ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Loading stocks...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-white"} pt-16`}
    >
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar - Filters */}
        <div
          className={`w-80 ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          } border-r overflow-y-auto`}
        >
          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search for sectors, sub sectors"
                className="bg-transparent flex-1 text-sm focus:outline-none placeholder-gray-400"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Sectors */}
          <SectionHeader
            title="Sector"
            isCollapsed={collapsedSections.sectors}
            onToggle={() => toggleSection("sectors")}
          >
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sectors.map((sector) => (
                <label
                  key={sector}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedSectors.has(sector)}
                    onChange={() => handleSectorToggle(sector)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {sector}
                  </span>
                  <button className="ml-auto text-xs text-gray-400 hover:text-gray-600">
                    +
                  </button>
                </label>
              ))}
            </div>
          </SectionHeader>

          {/* Index */}
          <SectionHeader
            title="Index"
            isCollapsed={collapsedSections.index}
            onToggle={() => toggleSection("index")}
          >
            <div className="space-y-2">
              {["S&P 500", "NASDAQ 100", "Dow Jones", "Russell 2000"].map(
                (index) => (
                  <label
                    key={index}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {index}
                    </span>
                  </label>
                )
              )}
            </div>
          </SectionHeader>

          {/* Market Cap */}
          <SectionHeader
            title="Market Cap (Cr)"
            isCollapsed={collapsedSections.marketCap}
            onToggle={() => toggleSection("marketCap")}
          >
            <div className="space-y-4">
              {/* Quick Select Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleFilterChange("min_market_cap", "");
                    handleFilterChange("max_market_cap", 2);
                  }}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    isDark
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Small
                </button>
                <button
                  onClick={() => {
                    handleFilterChange("min_market_cap", 2);
                    handleFilterChange("max_market_cap", 10);
                  }}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    isDark
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Mid
                </button>
                <button
                  onClick={() => {
                    handleFilterChange("min_market_cap", 10);
                    handleFilterChange("max_market_cap", "");
                  }}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    isDark
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Large
                </button>
              </div>
              <RangeInput
                label="Range"
                minValue={filters.min_market_cap}
                maxValue={filters.max_market_cap}
                onMinChange={(value) =>
                  handleFilterChange("min_market_cap", value)
                }
                onMaxChange={(value) =>
                  handleFilterChange("max_market_cap", value)
                }
                suffix="Billions"
              />
            </div>
          </SectionHeader>

          {/* Close Price */}
          <SectionHeader
            title="Close Price"
            isCollapsed={collapsedSections.closePrice}
            onToggle={() => toggleSection("closePrice")}
          >
            <RangeInput
              label="Price Range"
              minValue={filters.min_price}
              maxValue={filters.max_price}
              onMinChange={(value) => handleFilterChange("min_price", value)}
              onMaxChange={(value) => handleFilterChange("max_price", value)}
              suffix="USD"
            />
          </SectionHeader>

          {/* Valuation */}
          <SectionHeader
            title="Valuation"
            isCollapsed={collapsedSections.valuation}
            onToggle={() => toggleSection("valuation")}
          >
            <div className="space-y-4">
              <RangeInput
                label="P/E Ratio"
                minValue={filters.min_pe}
                maxValue={filters.max_pe}
                onMinChange={(value) => handleFilterChange("min_pe", value)}
                onMaxChange={(value) => handleFilterChange("max_pe", value)}
                step="0.1"
              />
              <RangeInput
                label="P/B Ratio"
                minValue={filters.min_pb}
                maxValue={filters.max_pb}
                onMinChange={(value) => handleFilterChange("min_pb", value)}
                onMaxChange={(value) => handleFilterChange("max_pb", value)}
                step="0.1"
              />
            </div>
          </SectionHeader>

          {/* Financial Health */}
          <SectionHeader
            title="Financial"
            isCollapsed={collapsedSections.financial}
            onToggle={() => toggleSection("financial")}
          >
            <div className="space-y-4">
              <RangeInput
                label="ROE (%)"
                minValue={filters.min_roe}
                maxValue=""
                onMinChange={(value) => handleFilterChange("min_roe", value)}
                onMaxChange={() => {}}
                step="0.1"
              />
              <RangeInput
                label="Dividend Yield (%)"
                minValue={filters.min_dividend_yield}
                maxValue=""
                onMinChange={(value) =>
                  handleFilterChange("min_dividend_yield", value)
                }
                onMaxChange={() => {}}
                step="0.1"
              />
            </div>
          </SectionHeader>

          {/* Technical */}
          <SectionHeader
            title="Technical"
            isCollapsed={collapsedSections.technical}
            onToggle={() => toggleSection("technical")}
          >
            <div className="space-y-4">
              <RangeInput
                label="RSI"
                minValue={filters.min_rsi}
                maxValue={filters.max_rsi}
                onMinChange={(value) => handleFilterChange("min_rsi", value)}
                onMaxChange={(value) => handleFilterChange("max_rsi", value)}
                step="1"
              />
              <RangeInput
                label="Beta"
                minValue={filters.min_beta}
                maxValue={filters.max_beta}
                onMinChange={(value) => handleFilterChange("min_beta", value)}
                onMaxChange={(value) => handleFilterChange("max_beta", value)}
                step="0.1"
              />
            </div>
          </SectionHeader>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Header */}
          <div
            className={`p-6 border-b ${
              isDark
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1
                  className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Stocks
                </h1>
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  } mt-1`}
                >
                  {resultStats
                    ? `${resultStats.count} results found`
                    : "Loading..."}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm flex items-center gap-2">
                  Results per page:
                  <select
                    value={resultsPerPage}
                    onChange={handleResultsPerPageChange}
                    className={`border rounded px-2 py-1 text-sm ${
                      isDark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
                <button
                  onClick={exportResults}
                  disabled={results.length === 0}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    isDark
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  }`}
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="flex-1 overflow-auto">
            {error ? (
              <div className="p-6 text-center">
                <div className="text-red-500 text-lg mb-2">⚠️</div>
                <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {error}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead
                  className={`sticky top-0 ${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-50 border-gray-200"
                  } border-b`}
                >
                  <tr>
                    <th
                      className={`text-left p-4 font-medium text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      COMPANY
                    </th>
                    <th
                      className={`text-left p-4 font-medium text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      CHART
                    </th>
                    <th
                      className={`text-left p-4 font-medium text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      CURRENT PRICE
                    </th>
                    <th
                      className={`text-left p-4 font-medium text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      P/E RATIO
                    </th>
                    <th
                      className={`text-left p-4 font-medium text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      MARKET CAP (CR)
                    </th>
                    <th
                      className={`text-left p-4 font-medium text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    ></th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? "bg-gray-900" : "bg-white"}`}>
                  {results.map((stock) => (
                    <StockRow key={stock.symbol} stock={stock} />
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {resultStats && (
              <div
                className={`p-4 border-t ${
                  isDark
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-200 bg-gray-50"
                } flex items-center justify-between`}
              >
                <div className="text-sm">
                  Showing {(page - 1) * resultsPerPage + 1} -{" "}
                  {Math.min(page * resultsPerPage, resultStats.count)} of{" "}
                  {resultStats.count} stocks
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`px-4 py-2 rounded ${
                      page === 1
                        ? isDark
                          ? "bg-gray-700 text-gray-500"
                          : "bg-gray-200 text-gray-400"
                        : isDark
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>

                  <span
                    className={`px-3 py-2 ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Page {page} of{" "}
                    {Math.ceil(resultStats.count / resultsPerPage)}
                  </span>

                  <button
                    className={`px-4 py-2 rounded ${
                      page >= Math.ceil(resultStats.count / resultsPerPage)
                        ? isDark
                          ? "bg-gray-700 text-gray-500"
                          : "bg-gray-200 text-gray-400"
                        : isDark
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    onClick={() => handlePageChange(page + 1)}
                    disabled={
                      page >= Math.ceil(resultStats.count / resultsPerPage)
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScreenerPage;
