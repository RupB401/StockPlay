import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTheme } from "../contexts/ThemeContext";

const PortfolioPieChart = ({ data, title = "Portfolio Allocation" }) => {
  const { isDark } = useTheme();

  // Define colors for the pie chart
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#0088fe",
    "#00c49f",
    "#ffbb28",
    "#ff8042",
    "#8dd1e1",
    "#d084d0",
    "#87d068",
    "#ffc0cb",
    "#b19cd9",
    "#ffb347",
    "#ff6b6b",
  ];

  const formatValue = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border ${
            isDark
              ? "bg-gray-800 border-gray-600 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <p className="font-semibold">{data.payload.name}</p>
          <p className="text-sm">
            Value:{" "}
            <span className="font-medium">{formatValue(data.value)}</span>
          </p>
          <p className="text-sm">
            Percentage:{" "}
            <span className="font-medium">
              {data.payload.percentage?.toFixed(2)}%
            </span>
          </p>
          {data.payload.shares && (
            <p className="text-sm">
              Shares: <span className="font-medium">{data.payload.shares}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? "#ffffff" : "#000000"}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
          No portfolio data available
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-lg ${
        isDark ? "bg-gray-800" : "bg-white"
      } shadow-lg`}
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: isDark ? "#ffffff" : "#000000" }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioPieChart;
