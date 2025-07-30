import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { browseAllStocks, getCompanyLogo } from "../services/stockApi";
import { FaArrowLeft, FaArrowRight, FaFilter, FaSearch } from "react-icons/fa";

function StocksBrowse() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({});
  const [stockLogos, setStockLogos] = useState({});

  // URL parameters
  const currentPage = parseInt(searchParams.get("page")) || 1;
  const selectedSector = searchParams.get("sector") || "";
  const selectedMarketCap = searchParams.get("market_cap") || "";
  const searchTerm = searchParams.get("search") || "";

  // Load data when URL parameters change
  useEffect(() => {
    fetchStocks();
  }, [currentPage, selectedSector, selectedMarketCap]);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const response = await browseAllStocks(
        currentPage,
        40, // Show 40 stocks per page
        selectedSector || null,
        selectedMarketCap || null
      );

      setStocks(response.stocks || []);
      setPagination(response.pagination || {});
      setFilters(response.filters || {});

      // Preload logos for better UX
      const logoPromises = response.stocks.map(async (stock) => {
        if (stock?.symbol && !stockLogos[stock.symbol]) {
          try {
            const logoUrl = await getCompanyLogo(stock.symbol, stock.name);
            if (logoUrl && !logoUrl.startsWith("data:image/svg+xml")) {
              return { symbol: stock.symbol, logoUrl };
            }
          } catch (error) {
            // Swallow error, fallback will be used
          }
        }
        return null;
      });

      const logoResults = await Promise.all(logoPromises);
      const newLogos = {};
      logoResults.forEach((result) => {
        if (result?.symbol && result?.logoUrl) {
          newLogos[result.symbol] = result.logoUrl;
        }
      });
      setStockLogos((prev) => ({ ...prev, ...newLogos }));
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update URL parameters
  const updateFilters = (newFilters) => {
    const params = new URLSearchParams();
    params.set("page", "1"); // Reset to first page when filtering

    if (newFilters.sector) params.set("sector", newFilters.sector);
    if (newFilters.market_cap) params.set("market_cap", newFilters.market_cap);
    if (searchTerm) params.set("search", searchTerm);

    setSearchParams(params);
  };

  const changePage = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  };

  // Filter stocks by search term locally
  const filteredStocks = stocks.filter((stock) => {
    if (!searchTerm) return true;
    return (
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.sector.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const generateFallbackLogo = (symbol) => {
    const color = `hsl(${(symbol.charCodeAt(0) * 137.508) % 360}, 70%, 50%)`;
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="${color}"/>
        <text x="20" y="28" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
          ${symbol.charAt(0)}
        </text>
      </svg>
    `)}`;
  };

  const getLogoUrlSync = (symbol) => {
    return stockLogos[symbol] || generateFallbackLogo(symbol);
  };

  const formatMarketCap = (marketCap) => {
    if (!marketCap) return "N/A";
    const billions = marketCap / 1000000000;
    if (billions >= 1) {
      return `$${billions.toFixed(1)}B`;
    }
    const millions = marketCap / 1000000;
    return `$${millions.toFixed(0)}M`;
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <div
        className={`border-b ${
          isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
        } sticky top-0 z-10`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className={`flex items-center gap-2 ${
                  isDark
                    ? "text-blue-400 hover:text-blue-300"
                    : "text-blue-600 hover:text-blue-500"
                }`}
              >
                <FaArrowLeft className="w-4 h-4" />
                Back to Explore
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Browse All Stocks</h1>
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {pagination.total !== undefined
                    ? `${pagination.total} stocks available in database`
                    : "Loading..."}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <FaSearch
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value) {
                      params.set("search", e.target.value);
                    } else {
                      params.delete("search");
                    }
                    params.set("page", "1");
                    setSearchParams(params);
                  }}
                  className={`pl-10 pr-4 py-2 rounded-lg border ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:border-blue-500`}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <FaFilter
              className={`${isDark ? "text-gray-400" : "text-gray-500"}`}
            />

            {/* Sector Filter */}
            <select
              value={selectedSector}
              onChange={(e) =>
                updateFilters({
                  sector: e.target.value,
                  market_cap: selectedMarketCap,
                })
              }
              className={`px-3 py-1 rounded border ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:border-blue-500`}
            >
              <option value="">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Financial">Financial</option>
              <option value="Energy">Energy</option>
              <option value="Consumer Cyclical">Consumer Cyclical</option>
              <option value="Consumer Defensive">Consumer Defensive</option>
              <option value="Industrial">Industrial</option>
              <option value="Communication Services">Communication</option>
              <option value="Automotive">Automotive</option>
            </select>

            {/* Market Cap Filter */}
            <select
              value={selectedMarketCap}
              onChange={(e) =>
                updateFilters({
                  sector: selectedSector,
                  market_cap: e.target.value,
                })
              }
              className={`px-3 py-1 rounded border ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:border-blue-500`}
            >
              <option value="">All Market Caps</option>
              <option value="Large">Large Cap (&gt;$10B)</option>
              <option value="Mid">Mid Cap ($2B-$10B)</option>
              <option value="Small">Small Cap ($300M-$2B)</option>
            </select>

            {/* Clear Filters */}
            {(selectedSector || selectedMarketCap || searchTerm) && (
              <button
                onClick={() => {
                  setSearchParams({ page: "1" });
                }}
                className={`px-3 py-1 text-xs rounded ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div>Loading stocks...</div>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-center py-12">
            <div
              className={`text-6xl mb-4 ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              📈
            </div>
            <h3 className="text-xl font-semibold mb-2">No stocks found</h3>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <>
            {/* Stock Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
              {filteredStocks.map((stock, index) => (
                <div
                  key={`${stock.symbol}-${index}`}
                  className={`group relative border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    isDark
                      ? "bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-700"
                      : "bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                  title={`View ${stock.name} details`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${
                        isDark ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <img
                        src={getLogoUrlSync(stock.symbol)}
                        alt={stock.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          if (!e.target.src.startsWith("data:image/svg+xml")) {
                            e.target.src = generateFallbackLogo(stock.symbol);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium text-sm truncate ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {stock.name}
                      </div>
                      <div
                        className={`text-xs ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {stock.symbol}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {stock.price}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          stock.isNegative ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {stock.change} ({stock.percent})
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div
                        className={`${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        <span className="font-medium">Sector:</span>{" "}
                        {stock.sector}
                      </div>
                      <div
                        className={`${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        <span className="font-medium">Market Cap:</span>{" "}
                        {formatMarketCap(stock.marketCap)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    !pagination.hasPrev
                      ? isDark
                        ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                      : isDark
                      ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                      : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <FaArrowLeft className="w-3 h-3" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      const pageNum = currentPage - 2 + i;
                      if (pageNum < 1 || pageNum > pagination.totalPages)
                        return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => changePage(pageNum)}
                          className={`w-10 h-10 rounded-lg ${
                            pageNum === currentPage
                              ? "bg-blue-500 text-white"
                              : isDark
                              ? "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    !pagination.hasNext
                      ? isDark
                        ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                      : isDark
                      ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                      : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Next
                  <FaArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Page Info */}
            <div
              className={`text-center mt-4 text-sm ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Showing {Math.min((currentPage - 1) * 40 + 1, pagination.total)}{" "}
              to {Math.min(currentPage * 40, pagination.total)} of{" "}
              {pagination.total} stocks
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StocksBrowse;
