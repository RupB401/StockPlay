import React, { useState } from "react";
import StockPlayLogo from "../Logo/StockPlayIcon-removebg-preview.png";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaCog, FaShieldAlt, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import Theme from "./Theme";
import WalletBalance from "./WalletBalance";
import PriceAlertModal from "./PriceAlertModal";
import { searchStocks, checkHealth } from "../services/stockApi";

function Nav() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [backendStatus, setBackendStatus] = useState("unknown"); // "connected", "disconnected", "unknown"
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/"); // Navigate to landing page after logout
  };

  // Check backend connection on component mount
  React.useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const result = await checkHealth();
        setBackendStatus(result.status);
        if (result.status === "disconnected") {
          console.error("Backend connection failed:", result.error);
        }
      } catch (error) {
        setBackendStatus("disconnected");
        console.error("Backend connection failed:", error);
      }
    };

    checkBackendConnection();

    // Set up periodic health checks (every 30 seconds)
    const interval = setInterval(checkBackendConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  // Only update the input value and reset highlight on change, do not trigger search
  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(-1);
    setShowResults(false);
    setSearchResults([]);
  };

  // Function to trigger search immediately (for Enter key and magnifying glass click)
  const triggerSearch = async () => {
    if (!searchQuery || searchQuery.length < 1) return;

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    setShowResults(true);
    setIsSearching(true);

    try {
      const results = await searchStocks(searchQuery);

      // Ensure results is always an array
      const safeResults = Array.isArray(results) ? results : [];
      setSearchResults(safeResults);

      // If we got results, auto-highlight the first one
      if (safeResults.length > 0) {
        setHighlightedIndex(0);
      }
    } catch (error) {
      console.error("Immediate search error:", error);
      // Still show empty results rather than crash
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle key press events
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnterPress();
    } else if (e.key === "Escape") {
      setShowResults(false);
      setSearchQuery("");
      setHighlightedIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      // Navigate down the search results
      setHighlightedIndex((prevIndex) =>
        prevIndex < searchResults.length - 1 ? prevIndex + 1 : prevIndex
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      // Navigate up the search results
      setHighlightedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
    }
  };

  // Handle Enter key press - navigate to stock page with better error handling
  const handleEnterPress = async () => {
    if (!searchQuery || searchQuery.trim().length === 0) return;

    const trimmedQuery = searchQuery.trim().toUpperCase();

    try {
      // If there's a highlighted result, use that
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        const selectedStock = searchResults[highlightedIndex];
        handleSelectStock(selectedStock.symbol);
        return;
      }

      // If there are search results and user hasn't highlighted any, use first result
      if (searchResults.length > 0) {
        handleSelectStock(searchResults[0].symbol);
        return;
      }

      // If no search results, try to trigger a new search first
      if (searchResults.length === 0) {
        setIsSearching(true);
        try {
          const results = await searchStocks(trimmedQuery);
          if (results && results.length > 0) {
            handleSelectStock(results[0].symbol);
            return;
          }
        } catch (error) {
          console.error("Search failed during enter press:", error);
        } finally {
          setIsSearching(false);
        }
      }

      // If all else fails, try to navigate directly with the search query
      // This handles cases where user types exact ticker symbol
      const cleanedSymbol = trimmedQuery.replace(/[^A-Z0-9.-]/g, "");
      if (cleanedSymbol.length > 0) {
        handleSelectStock(cleanedSymbol);
      }
    } catch (error) {
      console.error("Error during search navigation:", error);
      // Still try to navigate with cleaned symbol as last resort
      const cleanedSymbol = trimmedQuery.replace(/[^A-Z0-9.-]/g, "");
      if (cleanedSymbol.length > 0) {
        handleSelectStock(cleanedSymbol);
      }
    }
  };

  const handleSelectStock = (symbol) => {
    navigate(`/stock/${symbol}`);
    setShowResults(false);
    setSearchQuery("");
    setSearchResults([]);
    setHighlightedIndex(-1);
  };

  // Close search results when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowResults(false);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      // Clean up search timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className="navbar bg-base-100 shadow-sm fixed top-0 left-0 w-full z-50">
      <div className="flex-1 navbar-start">
        <Link className="btn btn-ghost text-xl ml-5" to="/">
          <img
            src={StockPlayLogo}
            alt="StockPlay Logo"
            style={{
              width: "64px",
              height: "64px",
              marginRight: "12px",
              verticalAlign: "middle",
            }}
          />
          StockPlay
          {backendStatus === "connected" && (
            <div
              className="badge badge-xs badge-success ml-2"
              title="Backend Connected"
            ></div>
          )}
          {backendStatus === "disconnected" && (
            <div
              className="badge badge-xs badge-error ml-2"
              title="Backend Disconnected"
            ></div>
          )}
        </Link>
      </div>
      <div className="navbar-center">
        <ul className="menu menu-horizontal">
          <li className="font-bold">
            <Link to="/explore">Explore</Link>
          </li>
          <li className="font-bold">
            <Link to="/indices">Indices</Link>
          </li>
          <li className="font-bold">
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li className="dropdown dropdown-hover">
            <div tabIndex={0} role="button" className="font-bold">
              Portfolio
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
            >
              <li>
                <Link to="/portfolio">Holdings</Link>
              </li>
              <li>
                <Link to="/portfolio/analytics">Analytics</Link>
              </li>
            </ul>
          </li>
        </ul>
      </div>
      <div className="navbar-end flex items-center gap-4">
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnterPress();
            }}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search stocks (press Enter or click search)"
                className="input input-bordered w-64 md:w-80 pr-10"
                value={searchQuery}
                onChange={handleInputChange}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyPress}
                autoComplete="off"
                title="Type your query, then press Enter or click the search icon."
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <button
                  type="button"
                  className="p-1.5 hover:bg-base-200 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                  title="Search (Press Enter or click here)"
                  disabled={
                    !searchQuery || searchQuery.length < 1 || isSearching
                  }
                  onClick={triggerSearch}
                  style={{ position: "relative" }}
                >
                  <svg
                    className={`w-4 h-4 transition-colors ${
                      !searchQuery || searchQuery.length < 1
                        ? "text-base-content/30"
                        : "text-base-content/50 hover:text-primary"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {isSearching && (
                    <span
                      className="loading loading-spinner loading-xs absolute right-0 top-0 mt-[-2px] mr-[-2px]"
                      style={{ right: 0, top: 0 }}
                    ></span>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Search results dropdown */}
          {showResults && (
            <div className="absolute top-full mt-1 w-full min-w-[300px] bg-base-100 shadow-lg rounded-md z-50 max-h-64 overflow-y-auto border border-base-300">
              {searchResults.length > 0 ? (
                <ul>
                  {searchResults.map((stock, index) => (
                    <li
                      key={stock.symbol}
                      className={`p-3 cursor-pointer border-b border-base-300 last:border-b-0 transition-colors ${
                        highlightedIndex === index
                          ? "bg-base-200"
                          : "hover:bg-base-200"
                      }`}
                      onClick={() => handleSelectStock(stock.symbol)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-bold text-base-content">
                            {stock.symbol}
                          </div>
                          <div className="text-sm text-base-content/70 truncate">
                            {stock.name}
                          </div>
                          <div className="text-xs text-base-content/50 flex items-center gap-2 mt-1 flex-wrap">
                            <span>{stock.region}</span>
                            <span>•</span>
                            <span>{stock.type}</span>
                            {stock.sector && (
                              <>
                                <span>•</span>
                                <span className="badge badge-xs badge-secondary">
                                  {stock.sector}
                                </span>
                              </>
                            )}
                            {stock.source && (
                              <>
                                <span>•</span>
                                <span className="badge badge-xs badge-success">
                                  {stock.source}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="ml-2">
                          <svg
                            className="w-4 h-4 text-base-content/50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : searchQuery.length > 0 && isSearching ? (
                <div className="p-3 text-center text-base-content/70">
                  <div className="flex items-center justify-center gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span className="text-sm">Searching stocks...</span>
                  </div>
                </div>
              ) : searchQuery.length > 1 && !isSearching ? (
                <div className="p-3 text-center text-base-content/70">
                  <div className="text-sm">
                    No results found for "{searchQuery}"
                  </div>
                  <div className="text-xs mt-1 text-base-content/50">
                    Press Enter to search directly or try a different symbol
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
        <WalletBalance />
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </span>
              </div>
            </div>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li className="menu-title px-4 py-2">
              <span className="text-xs text-gray-500">Signed in as</span>
              <span className="font-semibold truncate">{user?.email}</span>
            </li>
            <div className="divider my-1"></div>
            <li>
              <Link to="/profile" className="flex items-center gap-2">
                <FaUser className="text-sm" />
                Profile
              </Link>
            </li>
            <li>
              <Link to="/settings" className="flex items-center gap-2">
                <FaCog className="text-sm" />
                Settings
              </Link>
            </li>
            <div className="divider my-1"></div>
            <li>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 flex items-center gap-2"
              >
                <FaSignOutAlt className="text-sm" />
                Sign Out
              </button>
            </li>
          </ul>
        </div>
        <Theme />
      </div>

      {/* Price Alert Modal */}
      <PriceAlertModal
        isOpen={showPriceAlertModal}
        onClose={() => setShowPriceAlertModal(false)}
      />
    </div>
  );
}

export default Nav;
