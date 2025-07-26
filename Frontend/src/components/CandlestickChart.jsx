import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

const CandlestickChart = ({ data, width, height }) => {
  const { isDark } = useTheme();
  const containerRef = useRef(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 800,
    height: 320,
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setContainerDimensions({
          width: offsetWidth || 800,
          height: height || 320,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [height]);

  console.log("CandlestickChart called with:", {
    dataLength: data?.length,
    containerDimensions,
  });
  console.log("Sample data:", data?.[0]);

  if (!data || data.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center text-gray-500"
      >
        No candlestick data available
      </div>
    );
  }

  // Validate data has required OHLC fields
  const firstItem = data[0];
  if (
    !firstItem ||
    typeof firstItem.open === "undefined" ||
    typeof firstItem.high === "undefined" ||
    typeof firstItem.low === "undefined" ||
    typeof firstItem.close === "undefined"
  ) {
    console.log("Invalid data format:", firstItem);
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center text-gray-500"
      >
        Invalid candlestick data format
      </div>
    );
  }

  const actualWidth = containerDimensions.width;
  const actualHeight = containerDimensions.height;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = actualWidth - margin.left - margin.right;
  const chartHeight = actualHeight - margin.top - margin.bottom;

  // Calculate min and max values for scaling
  const allValues = data.flatMap((d) => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;

  // Add 5% padding
  const paddedMin = minValue - range * 0.05;
  const paddedMax = maxValue + range * 0.05;
  const paddedRange = paddedMax - paddedMin;

  // Scale functions
  const scaleY = (value) =>
    chartHeight - ((value - paddedMin) / paddedRange) * chartHeight;
  const scaleX = (index) => (index / (data.length - 1)) * chartWidth;

  const candleWidth = Math.max(2, (chartWidth / data.length) * 0.8);

  // Theme-aware colors
  const gridColor = isDark ? "#374151" : "#e5e5e5";
  const textColor = isDark ? "#9CA3AF" : "#666";
  const bgColor = isDark ? "#1F2937" : "#f0f0f0";

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        width={actualWidth}
        height={actualHeight}
        className="candlestick-chart w-full h-full"
        viewBox={`0 0 ${actualWidth} ${actualHeight}`}
      >
        {/* Chart area background */}
        <rect
          x={margin.left}
          y={margin.top}
          width={chartWidth}
          height={chartHeight}
          fill="transparent"
          stroke={gridColor}
          strokeWidth={1}
        />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = margin.top + ratio * chartHeight;
          const value = paddedMax - ratio * paddedRange;
          return (
            <g key={ratio}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
                stroke={isDark ? "#374151" : "#f0f0f0"}
                strokeWidth={1}
              />
              <text
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill={textColor}
              >
                ${value.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Candlesticks */}
        {data.map((candle, index) => {
          const x = margin.left + scaleX(index);
          const openY = scaleY(candle.open) + margin.top;
          const closeY = scaleY(candle.close) + margin.top;
          const highY = scaleY(candle.high) + margin.top;
          const lowY = scaleY(candle.low) + margin.top;

          const isGreen = candle.close >= candle.open;
          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          return (
            <g key={index}>
              {/* High-Low line (wick) */}
              <line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={isGreen ? "#00D4AA" : "#FF6B6B"}
                strokeWidth={1}
              />

              {/* Open-Close body */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isGreen ? "#00D4AA" : "#FF6B6B"}
                stroke={isGreen ? "#00D4AA" : "#FF6B6B"}
                strokeWidth={1}
                opacity={isGreen ? 0.8 : 1}
              />

              {/* Hollow body for green candles */}
              {isGreen && bodyHeight > 2 && (
                <rect
                  x={x - candleWidth / 2 + 1}
                  y={bodyTop + 1}
                  width={candleWidth - 2}
                  height={bodyHeight - 2}
                  fill="white"
                  opacity={0.3}
                />
              )}
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={margin.left + chartWidth}
          y2={margin.top + chartHeight}
          stroke={gridColor}
          strokeWidth={1}
        />

        {/* Y-axis */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + chartHeight}
          stroke={gridColor}
          strokeWidth={1}
        />

        {/* X-axis labels */}
        {data.map((candle, index) => {
          if (index % Math.ceil(data.length / 6) === 0) {
            const x = margin.left + scaleX(index);
            const date = new Date(candle.date);
            const label = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            return (
              <text
                key={index}
                x={x}
                y={margin.top + chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill={textColor}
              >
                {label}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
};

export default CandlestickChart;
