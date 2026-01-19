"use client";

import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";

interface SpiTrendArrowProps {
  trend: "up" | "down" | "stable";
  className?: string;
  size?: number;
}

/**
 * SPI Trend Arrow Indicator
 *
 * Shows the direction of SPI trend with color coding:
 * - Up (green): SPI is improving
 * - Down (red): SPI is declining
 * - Stable (gray): SPI is relatively unchanged
 */
export function SpiTrendArrow({
  trend,
  className = "",
  size = 24,
}: SpiTrendArrowProps) {
  const getIcon = () => {
    switch (trend) {
      case "up":
        return <ArrowUp size={size} />;
      case "down":
        return <ArrowDown size={size} />;
      case "stable":
        return <ArrowRight size={size} />;
    }
  };

  const getColor = () => {
    switch (trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      case "stable":
        return "text-muted-foreground";
    }
  };

  const getLabel = () => {
    switch (trend) {
      case "up":
        return "Improving";
      case "down":
        return "Declining";
      case "stable":
        return "Stable";
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1 ${getColor()} ${className}`}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getLabel()}</span>
    </div>
  );
}

/**
 * Calculate trend direction from data points
 *
 * @param data Array of SPI values (oldest to newest)
 * @param threshold Minimum change to consider as trend (default 0.02)
 * @returns Trend direction
 */
export function calculateTrend(
  data: number[],
  threshold: number = 0.02,
): "up" | "down" | "stable" {
  if (data.length < 2) return "stable";

  // Compare recent values (last 3 data points if available)
  const recentData = data.slice(-3);
  const oldest = recentData[0];
  const newest = recentData[recentData.length - 1];

  const change = newest - oldest;

  if (Math.abs(change) < threshold) {
    return "stable";
  }

  return change > 0 ? "up" : "down";
}
