"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { SpiGauge } from "@/components/evm/spi-gauge";
import { SpiTrendChart } from "@/components/evm/spi-trend-chart";
import {
  SpiTrendArrow,
  calculateTrend,
} from "@/components/evm/spi-trend-arrow";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectEvmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectNumber = params.projectNumber as string;

  // Fetch project-level EVM
  const projectEvm = useQuery(api.evm.getEvmByProject, { projectNumber });

  // Fetch PWBS breakdown
  const pwbsEvmList = useQuery(api.evm.getEvmByAllPwbs, { projectNumber });

  // Fetch trend data (past 30 days)
  const trendData = useQuery(api.evm.getEvmTrend, {
    projectNumber,
    days: 30,
    scope: "project",
  });

  // Fetch project details
  const project = useQuery(api.projects.getProjectByNumber, { projectNumber });

  // Fetch work packages with issues
  const workPackagesWithIssues = useQuery(
    api.workPackages.getWorkPackagesWithIssues,
    { projectNumber },
  );

  if (projectEvm === undefined || pwbsEvmList === undefined) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (projectEvm === null) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Project Not Found</h2>
          <p className="text-muted-foreground">
            No EVM data available for project {projectNumber}
          </p>
          <Button
            onClick={() => router.push("/dashboard/evm")}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/evm")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="text-sm text-muted-foreground">EVM Dashboard</div>
          <h1 className="text-2xl font-bold">
            {project?.projectName || projectNumber}
          </h1>
        </div>
      </div>

      {/* Project-level EVM metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <SpiGauge spi={projectEvm.spi} size={200} />
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
                {projectEvm.percentComplete.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Items Installed
              </span>
              <span className="text-lg font-semibold">
                {projectEvm.ev.toLocaleString()} /{" "}
                {projectEvm.bac.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-lg font-semibold">
                {projectEvm.itemsRemaining.toLocaleString()}
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
                {projectEvm.bac.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">PV</span>
              <span className="font-semibold">
                {projectEvm.pv.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">EV</span>
              <span className="font-semibold">
                {projectEvm.ev.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">SV</span>
              <span
                className={`font-semibold ${
                  projectEvm.sv >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {projectEvm.sv >= 0 ? "+" : ""}
                {projectEvm.sv.toLocaleString()}
              </span>
            </div>
            {projectEvm.eac !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">EAC</span>
                <span className="font-semibold">
                  {projectEvm.eac.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Blockers section */}
      {workPackagesWithIssues && workPackagesWithIssues.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Work Packages with Issues ({workPackagesWithIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workPackagesWithIssues.map((wp) => (
                <div
                  key={wp._id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100 hover:border-red-200 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/evm/${projectNumber}/${wp.plNumber}`,
                    )
                  }
                >
                  <div>
                    <div className="font-medium">{wp.plNumber}</div>
                    {wp.plName && (
                      <div className="text-sm text-muted-foreground">
                        {wp.plName}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-red-600 font-medium">
                      {wp.issueCount} {wp.issueCount === 1 ? "issue" : "issues"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PWBS Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown by PWBS Category</CardTitle>
        </CardHeader>
        <CardContent>
          {pwbsEvmList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No PWBS categories found
            </div>
          ) : (
            <div className="space-y-3">
              {pwbsEvmList.map((pwbsEvm) => {
                const spiColor =
                  pwbsEvm.spi >= 0.95 && pwbsEvm.spi <= 1.1
                    ? "text-green-600"
                    : pwbsEvm.spi >= 0.85
                      ? "text-yellow-600"
                      : "text-red-600";

                return (
                  <div
                    key={pwbsEvm.scopeId}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() =>
                      router.push(
                        `/dashboard/evm/${projectNumber}/${pwbsEvm.scopeId}`,
                      )
                    }
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {pwbsEvm.scopeId}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pwbsEvm.ev.toLocaleString()} /{" "}
                        {pwbsEvm.bac.toLocaleString()} items (
                        {pwbsEvm.percentComplete.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">SPI</div>
                        <div className={`text-xl font-bold ${spiColor}`}>
                          {pwbsEvm.spi.toFixed(3)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">SV</div>
                        <div
                          className={`text-sm font-semibold ${
                            pwbsEvm.sv >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {pwbsEvm.sv >= 0 ? "+" : ""}
                          {pwbsEvm.sv.toLocaleString()}
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
