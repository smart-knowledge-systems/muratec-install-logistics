"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Printer, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpiGauge } from "@/components/evm/spi-gauge";
import { SpiTrendChart } from "@/components/evm/spi-trend-chart";
import type { EvmMetrics } from "@/convex/evm";

export function EvmReportGenerator() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(
    () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());
  const [reportGenerated, setReportGenerated] = useState(false);

  // Fetch all active projects
  const projects = useQuery(api.projects.getProjects, { status: "active" });

  // Fetch current EVM metrics for selected project
  const currentEvmMetrics = useQuery(
    selectedProject ? api.evm.getEvmByProject : ("skip" as never),
    selectedProject ? { projectNumber: selectedProject } : ("skip" as never),
  );

  // Fetch trend data for selected project
  const trendData = useQuery(
    selectedProject && startDate && endDate
      ? api.evm.getEvmTrend
      : ("skip" as never),
    selectedProject && startDate && endDate
      ? {
          projectNumber: selectedProject,
          days: Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
          ),
        }
      : ("skip" as never),
  );

  // Get project details
  const projectDetails = projects?.find(
    (p) => p.projectNumber === selectedProject,
  );

  const handleGenerateReport = () => {
    if (selectedProject && startDate && endDate) {
      setReportGenerated(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!currentEvmMetrics || !trendData) return;

    // Create CSV content
    const headers = [
      "Date",
      "Project Number",
      "BAC",
      "PV",
      "EV",
      "SV",
      "SPI",
      "Percent Complete",
      "Items Remaining",
      "EAC",
      "VAC",
    ];

    const rows = [
      // Current snapshot
      [
        format(new Date(), "yyyy-MM-dd"),
        selectedProject,
        currentEvmMetrics.bac,
        currentEvmMetrics.pv,
        currentEvmMetrics.ev,
        currentEvmMetrics.sv,
        currentEvmMetrics.spi.toFixed(3),
        currentEvmMetrics.percentComplete.toFixed(2),
        currentEvmMetrics.itemsRemaining,
        currentEvmMetrics.eac?.toFixed(0) ?? "",
        currentEvmMetrics.vac?.toFixed(0) ?? "",
      ].join(","),
      // Historical data
      ...trendData.map((snapshot) =>
        [
          format(new Date(snapshot.snapshotDate), "yyyy-MM-dd"),
          selectedProject,
          snapshot.bac,
          snapshot.pv,
          snapshot.ev,
          snapshot.sv,
          snapshot.spi.toFixed(3),
          snapshot.percentComplete.toFixed(2),
          snapshot.itemsRemaining,
          snapshot.eac?.toFixed(0) ?? "",
          "",
        ].join(","),
      ),
    ];

    const csvContent = [headers.join(","), ...rows].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evm-report-${selectedProject}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Control Panel - Hidden when printing */}
      <div className="print:hidden p-4 md:p-8 space-y-6 bg-muted/30">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            EVM Report Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and export Earned Value Management reports
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Selector */}
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project._id} value={project.projectNumber}>
                      {project.projectNumber} - {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedProject || !startDate || !endDate}
              >
                Generate Report
              </Button>
              {reportGenerated && currentEvmMetrics && (
                <>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" onClick={handleExportCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Content */}
      {reportGenerated && currentEvmMetrics && (
        <EvmReportContent
          projectNumber={selectedProject}
          projectName={projectDetails?.projectName}
          currentMetrics={currentEvmMetrics}
          trendData={trendData ?? []}
          startDate={startDate!}
          endDate={endDate!}
        />
      )}
    </div>
  );
}

interface EvmReportContentProps {
  projectNumber: string;
  projectName?: string;
  currentMetrics: EvmMetrics;
  trendData: Array<{
    snapshotDate: number;
    bac: number;
    pv: number;
    ev: number;
    sv: number;
    spi: number;
    percentComplete: number;
    itemsRemaining: number;
    eac?: number | null;
  }>;
  startDate: Date;
  endDate: Date;
}

function EvmReportContent({
  projectNumber,
  projectName,
  currentMetrics,
  trendData,
  startDate,
  endDate,
}: EvmReportContentProps) {
  const reportDate = format(new Date(), "MMMM d, yyyy");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 print:p-4">
      {/* Report Header */}
      <div className="text-center space-y-2 border-b pb-6 print:border-black">
        <h1 className="text-3xl font-bold">Earned Value Management Report</h1>
        <div className="text-lg">
          Project {projectNumber}
          {projectName && ` - ${projectName}`}
        </div>
        <div className="text-sm text-muted-foreground print:text-gray-600">
          Report Period: {format(startDate, "MMM d, yyyy")} -{" "}
          {format(endDate, "MMM d, yyyy")}
        </div>
        <div className="text-sm text-muted-foreground print:text-gray-600">
          Generated: {reportDate}
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="print:border-black print:shadow-none">
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* SPI Gauge */}
            <div className="flex-shrink-0">
              <SpiGauge spi={currentMetrics.spi} size={200} />
            </div>

            {/* Key Metrics */}
            <div className="flex-1 grid grid-cols-2 gap-6">
              <MetricDisplay
                label="Schedule Performance Index"
                value={currentMetrics.spi.toFixed(3)}
                status={getSpiStatusText(currentMetrics.spi)}
              />
              <MetricDisplay
                label="Percent Complete"
                value={`${currentMetrics.percentComplete.toFixed(1)}%`}
              />
              <MetricDisplay
                label="Items Installed"
                value={`${currentMetrics.bac - currentMetrics.itemsRemaining} / ${currentMetrics.bac}`}
              />
              <MetricDisplay
                label="Items Remaining"
                value={currentMetrics.itemsRemaining.toString()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card className="print:border-black print:shadow-none">
        <CardHeader>
          <CardTitle>EVM Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetricDisplay
              label="Budget at Completion (BAC)"
              value={currentMetrics.bac.toString()}
              description="Total items in scope"
            />
            <MetricDisplay
              label="Planned Value (PV)"
              value={currentMetrics.pv.toString()}
              description="Items scheduled by date"
            />
            <MetricDisplay
              label="Earned Value (EV)"
              value={currentMetrics.ev.toString()}
              description="Items actually installed"
            />
            <MetricDisplay
              label="Schedule Variance (SV)"
              value={currentMetrics.sv.toString()}
              description="EV - PV"
              isVariance
            />
            <MetricDisplay
              label="Schedule Performance Index (SPI)"
              value={currentMetrics.spi.toFixed(3)}
              description="EV / PV"
            />
            <MetricDisplay
              label="Estimate at Completion (EAC)"
              value={currentMetrics.eac?.toFixed(0) ?? "N/A"}
              description="BAC / SPI (projected)"
            />
            <MetricDisplay
              label="Variance at Completion (VAC)"
              value={currentMetrics.vac?.toFixed(0) ?? "N/A"}
              description="BAC - EAC"
              isVariance
            />
            <MetricDisplay
              label="Items Remaining"
              value={currentMetrics.itemsRemaining.toString()}
              description="BAC - EV"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card className="print:border-black print:shadow-none print:break-inside-avoid">
          <CardHeader>
            <CardTitle>SPI Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <SpiTrendChart
                data={trendData.map((d) => ({
                  date: d.snapshotDate,
                  spi: d.spi,
                }))}
                width={800}
                height={250}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-4 print:text-gray-600">
              This chart shows the Schedule Performance Index trend over the
              selected date range. Values above 1.0 indicate ahead of schedule;
              below 1.0 indicates behind schedule.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Risk Items */}
      <Card className="print:border-black print:shadow-none print:break-inside-avoid">
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Breakdown */}
          <div>
            <h3 className="font-semibold mb-2">
              Installation Status Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatusMetric
                label="Not Started"
                value={currentMetrics.notStartedCount}
                total={currentMetrics.bac}
              />
              <StatusMetric
                label="In Progress"
                value={currentMetrics.inProgressCount}
                total={currentMetrics.bac}
              />
              <StatusMetric
                label="Installed"
                value={currentMetrics.installedCount}
                total={currentMetrics.bac}
              />
              <StatusMetric
                label="Issues"
                value={currentMetrics.issueCount}
                total={currentMetrics.bac}
                highlight={currentMetrics.issueCount > 0}
              />
            </div>
          </div>

          {/* Risk Analysis */}
          <div>
            <h3 className="font-semibold mb-2">Risk Indicators</h3>
            <ul className="space-y-2 text-sm">
              {currentMetrics.spi < 0.85 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-600 print:text-red-700 mt-0.5">
                    ⚠
                  </span>
                  <span>
                    <strong>Critical schedule risk:</strong> SPI of{" "}
                    {currentMetrics.spi.toFixed(2)} indicates project is
                    significantly behind schedule. Immediate corrective action
                    recommended.
                  </span>
                </li>
              )}
              {currentMetrics.spi >= 0.85 && currentMetrics.spi < 0.95 && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 print:text-yellow-700 mt-0.5">
                    ⚠
                  </span>
                  <span>
                    <strong>Moderate schedule risk:</strong> SPI of{" "}
                    {currentMetrics.spi.toFixed(2)} indicates project is
                    slightly behind schedule. Monitor closely and consider
                    mitigation strategies.
                  </span>
                </li>
              )}
              {currentMetrics.issueCount > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 print:text-yellow-700 mt-0.5">
                    ⚠
                  </span>
                  <span>
                    <strong>Installation issues detected:</strong>{" "}
                    {currentMetrics.issueCount} items have reported issues
                    requiring resolution.
                  </span>
                </li>
              )}
              {currentMetrics.spi >= 0.95 &&
                currentMetrics.issueCount === 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 print:text-green-700 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong>Project on track:</strong> SPI of{" "}
                      {currentMetrics.spi.toFixed(2)} indicates project is
                      meeting or exceeding schedule expectations.
                    </span>
                  </li>
                )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground print:text-gray-600 pt-6 border-t print:border-black">
        <p>
          This report was automatically generated by the Muratec Install
          Logistics system.
        </p>
        <p>EVM calculations based on item count methodology.</p>
      </div>
    </div>
  );
}

function MetricDisplay({
  label,
  value,
  description,
  status,
  isVariance,
}: {
  label: string;
  value: string;
  description?: string;
  status?: string;
  isVariance?: boolean;
}) {
  const numValue = parseFloat(value);
  const isNegative = isVariance && !isNaN(numValue) && numValue < 0;

  return (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground print:text-gray-600">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-bold",
          isNegative && "text-red-600 print:text-red-700",
        )}
      >
        {value}
      </div>
      {description && (
        <div className="text-xs text-muted-foreground print:text-gray-500">
          {description}
        </div>
      )}
      {status && (
        <div className="text-sm font-medium text-muted-foreground print:text-gray-700">
          {status}
        </div>
      )}
    </div>
  );
}

function StatusMetric({
  label,
  value,
  total,
  highlight,
}: {
  label: string;
  value: number;
  total: number;
  highlight?: boolean;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground print:text-gray-600">
        {label}
      </div>
      <div
        className={cn(
          "text-xl font-bold",
          highlight && "text-yellow-600 print:text-yellow-700",
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground print:text-gray-500">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

function getSpiStatusText(spi: number): string {
  if (spi >= 0.95) return "On Track";
  if (spi >= 0.85) return "At Risk";
  return "Behind Schedule";
}
