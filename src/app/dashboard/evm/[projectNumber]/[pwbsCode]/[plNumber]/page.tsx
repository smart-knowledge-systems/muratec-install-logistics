"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { SpiGauge } from "@/components/evm/spi-gauge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function WorkPackageEvmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectNumber = params.projectNumber as string;
  const pwbsCode = params.pwbsCode as string;
  const plNumber = params.plNumber as string;

  // Fetch work package-level EVM
  const wpEvm = useQuery(api.evm.getEvmByWorkPackage, {
    projectNumber,
    plNumber,
  });

  // Fetch work package details with items
  const workPackageData = useQuery(api.workPackages.getWorkPackageByPlNumber, {
    projectNumber,
    plNumber,
  });

  // Fetch installation status for all items in this work package
  const installationStatuses = useQuery(
    api.installation.getStatusByWorkPackage,
    {
      projectNumber,
      plNumber,
    },
  );

  // Fetch project details
  const project = useQuery(api.projects.getProjectByNumber, { projectNumber });

  if (
    wpEvm === undefined ||
    workPackageData === undefined ||
    installationStatuses === undefined
  ) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (wpEvm === null || workPackageData === null) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="mt-4 text-lg font-semibold">Work Package Not Found</h2>
          <p className="text-muted-foreground">
            No EVM data available for work package {plNumber}
          </p>
          <Button
            onClick={() =>
              router.push(`/dashboard/evm/${projectNumber}/${pwbsCode}`)
            }
            className="mt-4"
          >
            Back to PWBS
          </Button>
        </div>
      </div>
    );
  }

  const { workPackage, items } = workPackageData;

  // Create a map of supply item ID to installation status
  const statusMap = new Map(
    installationStatuses.map((s) => [s.supplyItemId, s]),
  );

  // Combine items with their status
  const itemsWithStatus = items.map((item) => ({
    ...item,
    installStatus: statusMap.get(item._id),
  }));

  // Group items by status for summary
  const statusCounts = {
    not_started: itemsWithStatus.filter(
      (i) => !i.installStatus || i.installStatus.status === "not_started",
    ).length,
    in_progress: itemsWithStatus.filter(
      (i) => i.installStatus?.status === "in_progress",
    ).length,
    installed: itemsWithStatus.filter(
      (i) => i.installStatus?.status === "installed",
    ).length,
    issue: itemsWithStatus.filter((i) => i.installStatus?.status === "issue")
      .length,
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "installed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Installed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "issue":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Issue
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            Not Started
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            router.push(`/dashboard/evm/${projectNumber}/${pwbsCode}`)
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="text-sm text-muted-foreground">
            {project?.projectName || projectNumber} / {pwbsCode} / Work Package
          </div>
          <h1 className="text-2xl font-bold">{plNumber}</h1>
          {workPackage.plName && (
            <p className="text-muted-foreground">{workPackage.plName}</p>
          )}
        </div>
      </div>

      {/* Work Package-level EVM metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Schedule Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <SpiGauge spi={wpEvm.spi} size={120} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">
              {wpEvm.percentComplete.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {wpEvm.ev.toLocaleString()} / {wpEvm.bac.toLocaleString()} items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Schedule Variance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div
              className={`text-3xl font-bold ${
                wpEvm.sv >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {wpEvm.sv >= 0 ? "+" : ""}
              {wpEvm.sv.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              PV: {wpEvm.pv.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Not Started</span>
              <span className="font-semibold">{statusCounts.not_started}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-semibold">{statusCounts.in_progress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Installed</span>
              <span className="font-semibold">{statusCounts.installed}</span>
            </div>
            {statusCounts.issue > 0 && (
              <div className="flex justify-between">
                <span className="text-red-600">Issues</span>
                <span className="font-semibold text-red-600">
                  {statusCounts.issue}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items with Installation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Item Number</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsWithStatus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                itemsWithStatus.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      {getStatusBadge(item.installStatus?.status)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.itemNumber}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.partNumber}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.caseNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.installStatus?.status === "issue" &&
                      item.installStatus.issueType ? (
                        <div className="text-red-600">
                          {item.installStatus.issueType.replace(/_/g, " ")}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Issues section (if any) */}
      {statusCounts.issue > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Installation Issues ({statusCounts.issue})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {itemsWithStatus
                .filter((i) => i.installStatus?.status === "issue")
                .map((item) => (
                  <div
                    key={item._id}
                    className="p-3 bg-white rounded-lg border border-red-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm font-semibold">
                          {item.itemNumber} - {item.partNumber}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </div>
                        {item.installStatus?.issueType && (
                          <Badge
                            variant="outline"
                            className="mt-2 border-red-200"
                          >
                            {item.installStatus.issueType.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {item.installStatus?.issueNotes && (
                          <div className="mt-2 text-sm">
                            {item.installStatus.issueNotes}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        Case {item.caseNumber}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
