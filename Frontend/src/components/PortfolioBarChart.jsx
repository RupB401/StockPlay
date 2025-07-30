import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../contexts/ThemeContext";

const PortfolioBarChart = ({
  data,
  title = "Portfolio Performance",
  type = "value",
}) => {
  const { isDark } = useTheme();

  const formatValue = (value) => {
    if (type === "percentage") {
      return `${value.toFixed(2)}%`;
    }
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
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
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span>{entry.dataKey}: </span>
              <span className="font-medium">{formatValue(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (dataKey) => {
    switch (dataKey) {
      case "gainLoss":
      case "gain_loss":
      case "change":
        return "#10b981"; // Green for gains
      case "value":
      case "currentValue":
      case "current_value":
        return "#3b82f6"; // Blue for current value
      case "invested":
      case "investedAmount":
      case "invested_amount":
        return "#f59e0b"; // Amber for invested amount
      default:
        return "#8b5cf6"; // Purple as default
    }
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
          No performance data available
        </div>
      </div>
    );
  }

  // Determine which keys to display as bars
  const sampleData = data[0];
  const barKeys = Object.keys(sampleData).filter(
    (key) =>
      key !== "name" && key !== "symbol" && typeof sampleData[key] === "number"
  );

  return (
    <div
      className={`p-6 rounded-lg ${
        isDark ? "bg-gray-800" : "bg-white"
      } shadow-lg`}
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
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
            dataKey="name"
            stroke={isDark ? "#9ca3af" : "#6b7280"}
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
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
          {barKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={getBarColor(key)}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioBarChart;
