"use client";

import { format } from "date-fns";

interface TrendDataPoint {
  date: number;
  spi: number;
}

interface SpiTrendChartProps {
  data: TrendDataPoint[];
  width?: number;
  height?: number;
  className?: string;
  showLabels?: boolean;
}

/**
 * SPI Trend Sparkline Chart
 *
 * Displays SPI trend over time as a line chart with color-coded zones
 * Green zone: 0.95-1.1 (on schedule)
 * Yellow zone: 0.85-0.95, 1.1-1.2 (caution)
 * Red zone: <0.85, >1.2 (critical)
 */
export function SpiTrendChart({
  data,
  width = 300,
  height = 100,
  className = "",
  showLabels = false,
}: SpiTrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}
        style={{ width, height }}
      >
        No trend data available
      </div>
    );
  }

  // Chart dimensions
  const padding = showLabels
    ? { top: 10, right: 10, bottom: 20, left: 30 }
    : { top: 5, right: 5, bottom: 5, left: 5 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Y-axis scale (0 to 1.5 for SPI)
  const minY = 0;
  const maxY = 1.5;
  const yRange = maxY - minY;

  // Zone thresholds for background
  const zones = [
    { min: 0, max: 0.85, color: "hsl(0, 84%, 60%)", opacity: 0.1 }, // red
    { min: 0.85, max: 0.95, color: "hsl(45, 93%, 47%)", opacity: 0.1 }, // yellow
    { min: 0.95, max: 1.1, color: "hsl(142, 71%, 45%)", opacity: 0.1 }, // green
    { min: 1.1, max: 1.2, color: "hsl(45, 93%, 47%)", opacity: 0.1 }, // yellow
    { min: 1.2, max: 1.5, color: "hsl(0, 84%, 60%)", opacity: 0.1 }, // red
  ];

  // Calculate x-axis positions
  const xScale = (index: number) => {
    return (index / (data.length - 1)) * chartWidth;
  };

  // Calculate y-axis positions
  const yScale = (value: number) => {
    const clampedValue = Math.max(minY, Math.min(maxY, value));
    return chartHeight - ((clampedValue - minY) / yRange) * chartHeight;
  };

  // Create line path
  const linePath = data
    .map((point, idx) => {
      const x = xScale(idx);
      const y = yScale(point.spi);
      return idx === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Create area path (for fill under line)
  const areaPath =
    linePath +
    ` L ${xScale(data.length - 1)} ${chartHeight} L ${xScale(0)} ${chartHeight} Z`;

  // Get color for SPI value
  const getColor = (spi: number) => {
    if (spi >= 0.95 && spi <= 1.1) return "hsl(142, 71%, 45%)"; // green
    if ((spi >= 0.85 && spi < 0.95) || (spi > 1.1 && spi <= 1.2))
      return "hsl(45, 93%, 47%)"; // yellow
    return "hsl(0, 84%, 60%)"; // red
  };

  // Get latest SPI for line color
  const latestSpi = data[data.length - 1]?.spi ?? 1.0;
  const lineColor = getColor(latestSpi);

  return (
    <div className={`inline-block ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Background zone colors */}
          {zones.map((zone, idx) => {
            const zoneTop = yScale(zone.max);
            const zoneBottom = yScale(zone.min);
            const zoneHeight = zoneBottom - zoneTop;

            return (
              <rect
                key={idx}
                x={0}
                y={zoneTop}
                width={chartWidth}
                height={zoneHeight}
                fill={zone.color}
                opacity={zone.opacity}
              />
            );
          })}

          {/* Grid lines */}
          {showLabels && (
            <>
              {/* Horizontal grid lines at key thresholds */}
              {[0.85, 0.95, 1.0, 1.1, 1.2].map((value) => (
                <line
                  key={value}
                  x1={0}
                  y1={yScale(value)}
                  x2={chartWidth}
                  y2={yScale(value)}
                  stroke="hsl(var(--border))"
                  strokeWidth={value === 1.0 ? 1.5 : 0.5}
                  strokeDasharray={value === 1.0 ? "none" : "2 2"}
                  opacity={0.5}
                />
              ))}
            </>
          )}

          {/* Area fill under line */}
          <path d={areaPath} fill={lineColor} opacity={0.1} />

          {/* Trend line */}
          <path
            d={linePath}
            stroke={lineColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((point, idx) => (
            <circle
              key={idx}
              cx={xScale(idx)}
              cy={yScale(point.spi)}
              r={3}
              fill={getColor(point.spi)}
              stroke="hsl(var(--background))"
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {showLabels && (
            <>
              {[0.85, 1.0, 1.2].map((value) => (
                <text
                  key={value}
                  x={-5}
                  y={yScale(value)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-muted-foreground"
                >
                  {value.toFixed(2)}
                </text>
              ))}
            </>
          )}

          {/* X-axis labels (first and last date) */}
          {showLabels && data.length > 1 && (
            <>
              <text
                x={0}
                y={chartHeight + 15}
                textAnchor="start"
                className="text-xs fill-muted-foreground"
              >
                {format(new Date(data[0].date), "MMM d")}
              </text>
              <text
                x={chartWidth}
                y={chartHeight + 15}
                textAnchor="end"
                className="text-xs fill-muted-foreground"
              >
                {format(new Date(data[data.length - 1].date), "MMM d")}
              </text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
