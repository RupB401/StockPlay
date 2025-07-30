import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { getIPOData } from "../services/stockApi";

function IPOsPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [upcomingIPOs, setUpcomingIPOs] = useState([]);
  const [recentIPOs, setRecentIPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIPOData();
  }, []);

  const fetchIPOData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIPOData();

      if (data.upcoming_ipos && data.recent_ipos) {
        setUpcomingIPOs(data.upcoming_ipos);
        setRecentIPOs(data.recent_ipos);
      } else {
        throw new Error("Invalid IPO data format");
      }
    } catch (error) {
      console.error("Error fetching IPO data:", error);
      setError("Failed to load IPO data. Showing sample data.");

      // Fallback to mock data
      setUpcomingIPOs(mockUpcomingIPOs);
      setRecentIPOs(mockRecentIPOs);
    } finally {
      setLoading(false);
    }
  };

  // Mock IPO data - in a real app, this would come from an API
  const mockUpcomingIPOs = [
    {
      company: "TechStart Inc.",
      symbol: "TECH",
      expectedDate: "2025-08-15",
      priceRange: "$18 - $22",
      shares: "10M",
      valuation: "$2.2B",
      sector: "Technology",
      description: "AI-powered software solutions for enterprise clients",
    },
    {
      company: "GreenEnergy Corp",
      symbol: "GREEN",
      expectedDate: "2025-08-22",
      priceRange: "$25 - $30",
      shares: "8M",
      valuation: "$2.4B",
      sector: "Clean Energy",
      description: "Solar panel manufacturing and renewable energy solutions",
    },
    {
      company: "HealthTech Solutions",
      symbol: "HLTH",
      expectedDate: "2025-09-05",
      priceRange: "$15 - $20",
      shares: "12M",
      valuation: "$2.1B",
      sector: "Healthcare",
      description: "Digital health platforms and telemedicine services",
    },
  ];

  const mockRecentIPOs = [
    {
      company: "DataFlow Systems",
      symbol: "DFLOW",
      ipoDate: "2025-07-10",
      ipoPrice: "$20.00",
      currentPrice: "$24.50",
      change: "+22.5%",
      isPositive: true,
      sector: "Technology",
    },
    {
      company: "RetailNext Ltd",
      symbol: "RNXT",
      ipoDate: "2025-07-08",
      ipoPrice: "$16.00",
      currentPrice: "$14.25",
      change: "-10.9%",
      isPositive: false,
      sector: "Retail",
    },
    {
      company: "BioMed Innovations",
      symbol: "BMED",
      ipoDate: "2025-07-01",
      ipoPrice: "$28.00",
      currentPrice: "$32.80",
      change: "+17.1%",
      isPositive: true,
      sector: "Biotechnology",
    },
  ];

  const getSectorColor = (sector) => {
    const colors = {
      Technology: "bg-blue-100 text-blue-800",
      Healthcare: "bg-green-100 text-green-800",
      "Clean Energy": "bg-emerald-100 text-emerald-800",
      "Financial Services": "bg-indigo-100 text-indigo-800",
      Telecommunications: "bg-purple-100 text-purple-800",
      Retail: "bg-orange-100 text-orange-800",
      Biotechnology: "bg-pink-100 text-pink-800",
      Automotive: "bg-red-100 text-red-800",
    };
    return colors[sector] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen p-6 pt-20 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="loading loading-spinner loading-lg"></div>
            <span className={`ml-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Loading IPO data...
            </span>
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Initial Public Offerings (IPOs)
          </h1>
          <p
            className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            Track upcoming and recent IPOs, get insights on new market entries
          </p>
        </div>

        {/* Upcoming IPOs */}
        <div className="mb-8">
          <h2
            className={`text-xl font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Upcoming IPOs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingIPOs.map((ipo, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                  isDark
                    ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3
                        className={`font-bold text-lg ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {ipo.company}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getSectorColor(
                          ipo.sector
                        )}`}
                      >
                        {ipo.sector}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-medium mb-2 ${
                        isDark ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      {ipo.symbol}
                    </p>
                    <p
                      className={`text-xs ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {ipo.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Expected Date
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {new Date(ipo.expectedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Price Range
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {ipo.priceRange}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Shares
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {ipo.shares}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Valuation
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {ipo.valuation}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent IPOs */}
        <div className="mb-8">
          <h2
            className={`text-xl font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Recent IPOs Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentIPOs.map((ipo, index) => (
              <div
                key={index}
                onClick={() => navigate(`/stock/${ipo.symbol}`)}
                className={`p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isDark
                    ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3
                        className={`font-bold text-lg ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {ipo.company}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getSectorColor(
                          ipo.sector
                        )}`}
                      >
                        {ipo.sector}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-medium mb-2 ${
                        isDark ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      {ipo.symbol}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      IPO Date
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {new Date(ipo.ipoDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      IPO Price
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {ipo.ipoPrice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Current Price
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {ipo.currentPrice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Performance
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        ipo.isPositive ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {ipo.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IPO Information */}
        <div
          className={`p-6 rounded-lg border ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-3 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Understanding IPOs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4
                className={`font-medium mb-2 ${
                  isDark ? "text-gray-200" : "text-gray-700"
                }`}
              >
                What is an IPO?
              </h4>
              <p
                className={`text-sm ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                An Initial Public Offering (IPO) is when a private company
                offers shares to the public for the first time. This allows the
                company to raise capital from public investors.
              </p>
            </div>
            <div>
              <h4
                className={`font-medium mb-2 ${
                  isDark ? "text-gray-200" : "text-gray-700"
                }`}
              >
                IPO Investment Considerations
              </h4>
              <ul
                className={`text-sm space-y-1 ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <li>• Company fundamentals and business model</li>
                <li>• Market conditions and timing</li>
                <li>• Lock-up periods and insider selling</li>
                <li>• Valuation and pricing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IPOsPage;
