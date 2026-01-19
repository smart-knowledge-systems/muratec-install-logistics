"use client";

import { Card } from "@/components/ui/card";
import { SpiGauge } from "./spi-gauge";
import { SpiTrendChart } from "./spi-trend-chart";
import { SpiTrendArrow, calculateTrend } from "./spi-trend-arrow";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendDataPoint {
  date: number;
  spi: number;
}

interface EvmDashboardCardProps {
  projectNumber: string;
  projectName?: string;
  currentSpi: number;
  trendData: TrendDataPoint[];
  itemsComplete: number;
  itemsTotal: number;
  className?: string;
  onClick?: () => void;
}

/**
 * EVM Dashboard Card
 *
 * Displays project health with SPI gauge, trend chart, and key metrics
 */
export function EvmDashboardCard({
  projectNumber,
  projectName,
  currentSpi,
  trendData,
  itemsComplete,
  itemsTotal,
  className = "",
  onClick,
}: EvmDashboardCardProps) {
  const percentComplete =
    itemsTotal > 0 ? (itemsComplete / itemsTotal) * 100 : 0;
  const itemsRemaining = itemsTotal - itemsComplete;

  // Calculate trend direction
  const trendDirection = calculateTrend(trendData.map((d) => d.spi));

  return (
    <Card
      className={`p-6 hover:shadow-lg transition-shadow ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">{projectNumber}</div>
        <div className="text-lg font-semibold">
          {projectName || projectNumber}
        </div>
      </div>

      {/* Main content: Gauge and Metrics */}
      <div className="flex items-center gap-6 mb-4">
        {/* SPI Gauge */}
        <div className="flex-shrink-0">
          <SpiGauge spi={currentSpi} size={160} />
        </div>

        {/* Metrics */}
        <div className="flex-1 space-y-3">
          {/* Progress */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Progress</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {percentComplete.toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground">
                ({itemsComplete} / {itemsTotal} items)
              </span>
            </div>
          </div>

          {/* Items Remaining */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Remaining</div>
            <div className="text-xl font-semibold">{itemsRemaining} items</div>
          </div>
        </div>
      </div>

      {/* Trend Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            4-Week Trend
          </div>
          <SpiTrendArrow trend={trendDirection} size={18} />
        </div>
        <SpiTrendChart data={trendData} width={350} height={80} />
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for EVM Dashboard Card
 */
export function EvmDashboardCardSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Main content */}
      <div className="flex items-center gap-6 mb-4">
        {/* Gauge skeleton */}
        <Skeleton className="h-32 w-32 rounded-full" />

        {/* Metrics skeleton */}
        <div className="flex-1 space-y-3">
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>

      {/* Trend skeleton */}
      <div className="border-t pt-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-20 w-full" />
      </div>
    </Card>
  );
}
