import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useTheme } from "../contexts/ThemeContext";

const PortfolioLineChart = ({
  data,
  title = "Portfolio Value Over Time",
  type = "line", // "line" or "area"
  dataKeys = ["portfolioValue"],
}) => {
  const { isDark } = useTheme();

  const colors = {
    portfolioValue: "#3b82f6",
    totalInvested: "#f59e0b",
    gainLoss: "#10b981",
    cashBalance: "#8b5cf6",
    totalValue: "#06b6d4",
    returns: "#ef4444",
  };

  const formatValue = (value) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            isDark
              ? "bg-gray-800 border-gray-600 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <p className="font-semibold mb-2">{formatDate(label)}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span>
                {entry.dataKey
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
                :{" "}
              </span>
              <span className="font-medium">{formatValue(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getDotFill = (value, dataKey) => {
    if (dataKey === "gainLoss" || dataKey === "returns") {
      return value >= 0 ? "#10b981" : "#ef4444";
    }
    return colors[dataKey] || "#8b5cf6";
  };

  if (!data || data.length === 0) {
    return (
      <div
        className={`p-6 rounded-lg ${
          isDark ? "bg-gray-800" : "bg-white"
        } shadow-lg`}
      >
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No time series data available
        </div>
      </div>
    );
  }

  const ChartComponent = type === "area" ? AreaChart : LineChart;

  return (
    <div
      className={`p-6 rounded-lg ${
        isDark ? "bg-gray-800" : "bg-white"
      } shadow-lg`}
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#374151" : "#e5e7eb"}
          />
          <XAxis
            dataKey="date"
            stroke={isDark ? "#9ca3af" : "#6b7280"}
            fontSize={12}
            tickFormatter={formatDate}
          />
          <YAxis
            stroke={isDark ? "#9ca3af" : "#6b7280"}
            fontSize={12}
            tickFormatter={formatValue}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: isDark ? "#ffffff" : "#000000" }}>
                {value
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </span>
            )}
          />
          {dataKeys.map((key) => {
            if (type === "area") {
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[key] || "#8b5cf6"}
                  fill={colors[key] || "#8b5cf6"}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ fill: colors[key] || "#8b5cf6", strokeWidth: 2, r: 4 }}
                  activeDot={{
                    r: 6,
                    stroke: colors[key] || "#8b5cf6",
                    strokeWidth: 2,
                  }}
                />
              );
            } else {
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[key] || "#8b5cf6"}
                  strokeWidth={2}
                  dot={{ fill: colors[key] || "#8b5cf6", strokeWidth: 2, r: 4 }}
                  activeDot={{
                    r: 6,
                    stroke: colors[key] || "#8b5cf6",
                    strokeWidth: 2,
                  }}
                />
              );
            }
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioLineChart;
