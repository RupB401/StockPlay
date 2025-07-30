import React from "react";
import PortfolioPieChart from "./PortfolioPieChart";
import PortfolioBarChart from "./PortfolioBarChart";
import PortfolioLineChart from "./PortfolioLineChart";

const ChartDemo = () => {
  // Sample data for demonstration
  const allocationData = [
    { name: "AAPL", value: 15000, shares: 100, percentage: 30 },
    { name: "GOOGL", value: 12000, shares: 50, percentage: 24 },
    { name: "MSFT", value: 10000, shares: 40, percentage: 20 },
    { name: "TSLA", value: 8000, shares: 25, percentage: 16 },
    { name: "AMZN", value: 5000, shares: 15, percentage: 10 },
  ];

  const performanceData = [
    {
      name: "AAPL",
      currentValue: 15000,
      invested: 12000,
      gainLoss: 3000,
      gainLossPercentage: 25,
    },
    {
      name: "GOOGL",
      currentValue: 12000,
      invested: 11000,
      gainLoss: 1000,
      gainLossPercentage: 9.09,
    },
    {
      name: "MSFT",
      currentValue: 10000,
      invested: 9500,
      gainLoss: 500,
      gainLossPercentage: 5.26,
    },
    {
      name: "TSLA",
      currentValue: 8000,
      invested: 9000,
      gainLoss: -1000,
      gainLossPercentage: -11.11,
    },
    {
      name: "AMZN",
      currentValue: 5000,
      invested: 5500,
      gainLoss: -500,
      gainLossPercentage: -9.09,
    },
  ];

  const timelineData = [
    {
      date: "2024-01-01",
      portfolioValue: 45000,
      totalInvested: 47000,
      gainLoss: -2000,
    },
    {
      date: "2024-02-01",
      portfolioValue: 46500,
      totalInvested: 47000,
      gainLoss: -500,
    },
    {
      date: "2024-03-01",
      portfolioValue: 48000,
      totalInvested: 47000,
      gainLoss: 1000,
    },
    {
      date: "2024-04-01",
      portfolioValue: 49500,
      totalInvested: 47000,
      gainLoss: 2500,
    },
    {
      date: "2024-05-01",
      portfolioValue: 48500,
      totalInvested: 47000,
      gainLoss: 1500,
    },
    {
      date: "2024-06-01",
      portfolioValue: 51000,
      totalInvested: 47000,
      gainLoss: 4000,
    },
    {
      date: "2024-07-01",
      portfolioValue: 50000,
      totalInvested: 47000,
      gainLoss: 3000,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Portfolio Chart Demo</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Demonstration of different chart types for portfolio visualization
        </p>
      </div>

      {/* Pie Chart */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Portfolio Allocation (Pie Chart)
        </h2>
        <PortfolioPieChart
          data={allocationData}
          title="Portfolio Allocation by Stock"
        />
      </div>

      {/* Bar Chart */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Performance Analysis (Bar Chart)
        </h2>
        <PortfolioBarChart
          data={performanceData}
          title="Individual Stock Performance"
        />
      </div>

      {/* Line Chart */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Timeline Performance (Line Chart)
        </h2>
        <PortfolioLineChart
          data={timelineData}
          title="Portfolio Value Over Time"
          type="line"
          dataKeys={["portfolioValue", "totalInvested", "gainLoss"]}
        />
      </div>

      {/* Area Chart */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Timeline Performance (Area Chart)
        </h2>
        <PortfolioLineChart
          data={timelineData}
          title="Portfolio Value Trend (Area)"
          type="area"
          dataKeys={["portfolioValue", "totalInvested"]}
        />
      </div>
    </div>
  );
};

export default ChartDemo;
