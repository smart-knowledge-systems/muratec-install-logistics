"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  ClipboardCheck,
  ListChecks,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { subDays } from "date-fns";

interface SummaryCardProps {
  title: string;
  icon: React.ReactNode;
  value: number;
  total: number;
  percentComplete: number;
  status: "success" | "warning" | "error" | "info";
  details?: { label: string; value: number; color?: string }[];
}

function SummaryCard({
  title,
  icon,
  value,
  total,
  percentComplete,
  status,
  details,
}: SummaryCardProps) {
  const statusColors = {
    success: "text-green-600",
    warning: "text-yellow-600",
    error: "text-red-600",
    info: "text-blue-600",
  };

  const statusBgColors = {
    success: "bg-green-50 dark:bg-green-950",
    warning: "bg-yellow-50 dark:bg-yellow-950",
    error: "bg-red-50 dark:bg-red-950",
    info: "bg-blue-50 dark:bg-blue-950",
  };

  return (
    <Card className={statusBgColors[status]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={statusColors[status]}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value} / {total}
        </div>
        <Progress value={percentComplete} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {percentComplete}% complete
        </p>
        {details && details.length > 0 && (
          <div className="mt-4 space-y-1">
            {details.map((detail, idx) => (
              <div
                key={idx}
                className="flex justify-between text-xs text-muted-foreground"
              >
                <span className={detail.color}>{detail.label}</span>
                <span className={detail.color}>{detail.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PendingActionProps {
  type: "move_in" | "inventory" | "picking" | "discrepancy";
  count: number;
  description: string;
  priority: "high" | "medium" | "low";
  onNavigate?: () => void;
}

function PendingAction({
  type,
  description,
  priority,
  onNavigate,
}: PendingActionProps) {
  const priorityColors = {
    high: "text-red-600",
    medium: "text-yellow-600",
    low: "text-blue-600",
  };

  const priorityBadgeColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  } as const;

  const typeIcons = {
    move_in: <Package className="h-4 w-4" />,
    inventory: <ClipboardCheck className="h-4 w-4" />,
    picking: <ListChecks className="h-4 w-4" />,
    discrepancy: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={priorityColors[priority]}>{typeIcons[type]}</div>
        <div>
          <p className="text-sm font-medium">{description}</p>
          <Badge
            variant={priorityBadgeColors[priority]}
            className="mt-1 text-xs"
          >
            {priority.toUpperCase()}
          </Badge>
        </div>
      </div>
      {onNavigate && (
        <Button variant="ghost" size="sm" onClick={onNavigate}>
          View
        </Button>
      )}
    </div>
  );
}

interface DiscrepancyItemProps {
  caseNumber: string;
  status: "missing" | "damaged" | "extra";
  itemNumber?: string;
  partNumber?: string;
  description?: string;
  expectedQuantity: number;
  actualQuantity?: number;
  notes?: string;
}

function DiscrepancyItem({
  caseNumber,
  status,
  itemNumber,
  partNumber,
  description,
  expectedQuantity,
  actualQuantity,
  notes,
}: DiscrepancyItemProps) {
  const statusConfig = {
    missing: {
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      label: "Missing",
      color: "text-red-600",
    },
    damaged: {
      icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      label: "Damaged",
      color: "text-yellow-600",
    },
    extra: {
      icon: <AlertCircle className="h-4 w-4 text-blue-600" />,
      label: "Extra",
      color: "text-blue-600",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">
                {caseNumber}
              </span>
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {itemNumber && <span className="font-mono">{itemNumber}</span>}
              {partNumber && (
                <span className="font-mono ml-2">({partNumber})</span>
              )}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Expected: {expectedQuantity}</p>
          {actualQuantity !== undefined && (
            <p className={config.color}>Actual: {actualQuantity}</p>
          )}
        </div>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      )}
      {notes && (
        <div className="mt-2 p-2 bg-muted rounded text-xs">
          <span className="font-medium">Note: </span>
          {notes}
        </div>
      )}
    </div>
  );
}

export function FieldDashboardContent() {
  // TODO: Add project selector when multi-project support is needed
  const selectedProject = "92364";

  // Helper to compute date range params - called during event handlers only
  const computeDateRangeParams = (
    range: "7d" | "30d" | "90d" | "all",
  ): { startDate?: number; endDate?: number } => {
    const now = Date.now();
    switch (range) {
      case "7d":
        return { startDate: subDays(now, 7).getTime(), endDate: now };
      case "30d":
        return { startDate: subDays(now, 30).getTime(), endDate: now };
      case "90d":
        return { startDate: subDays(now, 90).getTime(), endDate: now };
      case "all":
      default:
        return {};
    }
  };

  // Date range state - store both the selection and computed params together
  // Initialize with default of 30d, computed at first render via lazy initializer
  const [dateRangeState, setDateRangeState] = useState<{
    selection: "7d" | "30d" | "90d" | "all";
    params: { startDate?: number; endDate?: number };
  }>(() => ({
    selection: "30d",
    params: computeDateRangeParams("30d"),
  }));

  const handleDateRangeChange = (value: "7d" | "30d" | "90d" | "all") => {
    setDateRangeState({
      selection: value,
      params: computeDateRangeParams(value),
    });
  };

  // Queries
  const dashboardData = useQuery(api.fieldDashboard.getFieldDashboard, {
    projectNumber: selectedProject,
    ...dateRangeState.params,
  });

  const discrepancyReport = useQuery(api.fieldDashboard.getDiscrepancyReport, {
    projectNumber: selectedProject,
  });

  if (!dashboardData) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Field Operations Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Project {dashboardData.projectNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={dateRangeState.selection}
            onValueChange={(value) =>
              handleDateRangeChange(value as "7d" | "30d" | "90d" | "all")
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Move-in Progress"
          icon={<Package className="h-4 w-4" />}
          value={dashboardData.summary.moveIn.arrivedCases}
          total={dashboardData.summary.moveIn.totalCases}
          percentComplete={dashboardData.summary.moveIn.percentComplete}
          status={
            dashboardData.summary.moveIn.overdueCases > 0 ? "error" : "success"
          }
          details={[
            {
              label: "Expected",
              value: dashboardData.summary.moveIn.expectedCases,
            },
            {
              label: "Overdue",
              value: dashboardData.summary.moveIn.overdueCases,
              color:
                dashboardData.summary.moveIn.overdueCases > 0
                  ? "text-red-600"
                  : undefined,
            },
            {
              label: "Damaged",
              value: dashboardData.summary.moveIn.damagedCases,
              color:
                dashboardData.summary.moveIn.damagedCases > 0
                  ? "text-yellow-600"
                  : undefined,
            },
          ]}
        />

        <SummaryCard
          title="Inventory Progress"
          icon={<ClipboardCheck className="h-4 w-4" />}
          value={dashboardData.summary.inventory.completedCases}
          total={dashboardData.summary.inventory.totalCases}
          percentComplete={dashboardData.summary.inventory.percentComplete}
          status={
            dashboardData.summary.inventory.discrepancyCases > 0
              ? "warning"
              : "success"
          }
          details={[
            {
              label: "In Progress",
              value: dashboardData.summary.inventory.inProgressCases,
            },
            {
              label: "Pending",
              value: dashboardData.summary.inventory.pendingCases,
            },
            {
              label: "Discrepancies",
              value: dashboardData.summary.inventory.discrepancyCases,
              color:
                dashboardData.summary.inventory.discrepancyCases > 0
                  ? "text-yellow-600"
                  : undefined,
            },
          ]}
        />

        <SummaryCard
          title="Picking Queue"
          icon={<ListChecks className="h-4 w-4" />}
          value={dashboardData.summary.picking.completedWorkPackages}
          total={dashboardData.summary.picking.totalWorkPackages}
          percentComplete={dashboardData.summary.picking.percentComplete}
          status="info"
          details={[
            {
              label: "In Progress",
              value: dashboardData.summary.picking.inProgressWorkPackages,
            },
            {
              label: "Pending",
              value: dashboardData.summary.picking.pendingWorkPackages,
            },
          ]}
        />
      </div>

      {/* Pending Actions */}
      {dashboardData.pendingActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {dashboardData.pendingActions.map((action, idx) => (
                  <PendingAction
                    key={idx}
                    type={action.type}
                    count={action.count}
                    description={action.description}
                    priority={action.priority}
                    onNavigate={() => {
                      // Navigate to appropriate page based on action type
                      const routes = {
                        move_in: "/supply-list/move-in",
                        inventory: "/supply-list/inventory",
                        picking: "/supply-list/picking",
                        discrepancy: "#discrepancies",
                      };
                      if (action.type === "discrepancy") {
                        // Scroll to discrepancies section
                        document
                          .getElementById("discrepancies")
                          ?.scrollIntoView({ behavior: "smooth" });
                      } else {
                        window.location.href = routes[action.type];
                      }
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Discrepancy Report */}
      {discrepancyReport && discrepancyReport.length > 0 && (
        <Card id="discrepancies">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Discrepancy Report
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {dashboardData.discrepancies.totalItems} item
              {dashboardData.discrepancies.totalItems !== 1 ? "s" : ""} with
              discrepancies
              {dashboardData.discrepancies.missingItems > 0 &&
                ` (${dashboardData.discrepancies.missingItems} missing`}
              {dashboardData.discrepancies.damagedItems > 0 &&
                `, ${dashboardData.discrepancies.damagedItems} damaged`}
              {dashboardData.discrepancies.extraItems > 0 &&
                `, ${dashboardData.discrepancies.extraItems} extra`}
              )
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {discrepancyReport.map((item) => (
                  <DiscrepancyItem
                    key={item.inventoryItemId}
                    caseNumber={item.caseNumber}
                    status={item.status as "missing" | "damaged" | "extra"}
                    itemNumber={item.supplyItem.itemNumber}
                    partNumber={item.supplyItem.partNumber}
                    description={item.supplyItem.description}
                    expectedQuantity={item.expectedQuantity}
                    actualQuantity={item.actualQuantity}
                    notes={item.notes}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty state if no discrepancies */}
      {discrepancyReport && discrepancyReport.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Discrepancies</h3>
            <p className="text-sm text-muted-foreground text-center">
              All inventory verifications are complete with no issues reported.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
