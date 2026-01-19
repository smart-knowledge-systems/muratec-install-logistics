"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SpiGauge } from "@/components/evm/spi-gauge";
import { SpiTrendChart } from "@/components/evm/spi-trend-chart";
import {
  SpiTrendArrow,
  calculateTrend,
} from "@/components/evm/spi-trend-arrow";
import { Skeleton } from "@/components/ui/skeleton";

export default function PwbsEvmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectNumber = params.projectNumber as string;
  const pwbsCode = params.pwbsCode as string;

  // Fetch PWBS-level EVM
  const pwbsEvm = useQuery(api.evm.getEvmByPwbs, {
    projectNumber,
    pwbsCode,
  });

  // Fetch work packages for this PWBS
  const workPackages = useQuery(api.evm.getEvmByAllWorkPackages, {
    projectNumber,
  });

  // Fetch trend data (past 30 days)
  const trendData = useQuery(api.evm.getEvmTrend, {
    projectNumber,
    days: 30,
    scope: "pwbs",
    scopeId: pwbsCode,
  });

  // Fetch project details
  const project = useQuery(api.projects.getProjectByNumber, { projectNumber });

  if (pwbsEvm === undefined || workPackages === undefined) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (pwbsEvm === null) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="mt-4 text-lg font-semibold">PWBS Not Found</h2>
          <p className="text-muted-foreground">
            No EVM data available for PWBS {pwbsCode}
          </p>
          <Button
            onClick={() => router.push(`/dashboard/evm/${projectNumber}`)}
            className="mt-4"
          >
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  // Filter work packages to only those in this PWBS category
  const pwbsWorkPackages = workPackages.filter((wp) =>
    wp.scopeId?.includes(pwbsCode),
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/evm/${projectNumber}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="text-sm text-muted-foreground">
            {project?.projectName || projectNumber} / PWBS Category
          </div>
          <h1 className="text-2xl font-bold">{pwbsCode}</h1>
        </div>
      </div>

      {/* PWBS-level EVM metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <SpiGauge spi={pwbsEvm.spi} size={200} />
            {trendData && trendData.length > 0 && (
              <div className="mt-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    30-Day Trend
                  </span>
                  <SpiTrendArrow
                    trend={calculateTrend(trendData.map((d) => d.spi))}
                  />
                </div>
                <SpiTrendChart
                  data={trendData.map((d) => ({
                    date: d.snapshotDate,
                    spi: d.spi,
                  }))}
                  height={60}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Complete</span>
              <span className="text-2xl font-bold">
                {pwbsEvm.percentComplete.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Items Installed
              </span>
              <span className="text-lg font-semibold">
                {pwbsEvm.ev.toLocaleString()} / {pwbsEvm.bac.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-lg font-semibold">
                {pwbsEvm.itemsRemaining.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>EVM Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">BAC</span>
              <span className="font-semibold">
                {pwbsEvm.bac.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">PV</span>
              <span className="font-semibold">
                {pwbsEvm.pv.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">EV</span>
              <span className="font-semibold">
                {pwbsEvm.ev.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">SV</span>
              <span
                className={`font-semibold ${
                  pwbsEvm.sv >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {pwbsEvm.sv >= 0 ? "+" : ""}
                {pwbsEvm.sv.toLocaleString()}
              </span>
            </div>
            {pwbsEvm.eac !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">EAC</span>
                <span className="font-semibold">
                  {pwbsEvm.eac.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Work Packages in this PWBS */}
      <Card>
        <CardHeader>
          <CardTitle>Work Packages in {pwbsCode}</CardTitle>
        </CardHeader>
        <CardContent>
          {pwbsWorkPackages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No work packages found for this PWBS category
            </div>
          ) : (
            <div className="space-y-3">
              {pwbsWorkPackages.map((wpEvm) => {
                const spiColor =
                  wpEvm.spi >= 0.95 && wpEvm.spi <= 1.1
                    ? "text-green-600"
                    : wpEvm.spi >= 0.85
                      ? "text-yellow-600"
                      : "text-red-600";

                return (
                  <div
                    key={wpEvm.scopeId}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() =>
                      router.push(
                        `/dashboard/evm/${projectNumber}/${pwbsCode}/${wpEvm.scopeId}`,
                      )
                    }
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {wpEvm.scopeId}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {wpEvm.ev.toLocaleString()} /{" "}
                        {wpEvm.bac.toLocaleString()} items (
                        {wpEvm.percentComplete.toFixed(1)}%)
                      </div>
                      {wpEvm.issueCount > 0 && (
                        <div className="text-sm text-red-600 font-medium mt-1">
                          {wpEvm.issueCount}{" "}
                          {wpEvm.issueCount === 1 ? "issue" : "issues"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">SPI</div>
                        <div className={`text-xl font-bold ${spiColor}`}>
                          {wpEvm.spi.toFixed(3)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">SV</div>
                        <div
                          className={`text-sm font-semibold ${
                            wpEvm.sv >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {wpEvm.sv >= 0 ? "+" : ""}
                          {wpEvm.sv.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
