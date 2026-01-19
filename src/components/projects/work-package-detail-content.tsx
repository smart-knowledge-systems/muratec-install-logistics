"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Package } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkPackageDetailContentProps {
  projectNumber: string;
  plNumber: string;
}

export function WorkPackageDetailContent({
  projectNumber,
  plNumber,
}: WorkPackageDetailContentProps) {
  const router = useRouter();
  const workPackageData = useQuery(api.workPackages.getWorkPackageByPlNumber, {
    projectNumber,
    plNumber,
  });

  if (workPackageData === undefined) {
    return <WorkPackageDetailSkeleton />;
  }

  if (!workPackageData || !workPackageData.workPackage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Work Package Not Found</h3>
          <p className="text-muted-foreground">
            The work package {plNumber} was not found for project{" "}
            {projectNumber}.
          </p>
          <Button
            onClick={() =>
              router.push(`/projects/${projectNumber}/work-packages`)
            }
            className="mt-4"
          >
            Back to Work Packages
          </Button>
        </div>
      </div>
    );
  }

  const { workPackage, items } = workPackageData;

  const getReadinessBadgeVariant = (
    status: "ready" | "partial" | "blocked",
  ): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "ready":
        return "default";
      case "partial":
        return "secondary";
      case "blocked":
        return "destructive";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`/projects/${projectNumber}/work-packages`)
          }
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Work Packages
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Work Package: {workPackage.plNumber}
            </h1>
            {workPackage.plName && (
              <p className="text-muted-foreground">{workPackage.plName}</p>
            )}
          </div>
          <Badge
            variant={getReadinessBadgeVariant(workPackage.readinessStatus)}
          >
            {workPackage.readinessStatus}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="p-4 border rounded-lg">
          <dt className="text-sm text-muted-foreground mb-1">Items</dt>
          <dd className="text-2xl font-bold">{workPackage.itemCount}</dd>
        </div>
        <div className="p-4 border rounded-lg">
          <dt className="text-sm text-muted-foreground mb-1">Total Quantity</dt>
          <dd className="text-2xl font-bold">{workPackage.totalQuantity}</dd>
        </div>
        <div className="p-4 border rounded-lg">
          <dt className="text-sm text-muted-foreground mb-1">Total Weight</dt>
          <dd className="text-2xl font-bold">
            {workPackage.totalWeightKg.toFixed(1)} kg
          </dd>
        </div>
        <div className="p-4 border rounded-lg">
          <dt className="text-sm text-muted-foreground mb-1">
            Schedule Status
          </dt>
          <dd className="text-sm font-medium capitalize">
            {workPackage.scheduleStatus.replace("_", " ")}
          </dd>
        </div>
      </div>

      {/* PWBS Categories */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">PWBS Categories</h3>
        <div className="flex flex-wrap gap-2">
          {workPackage.pwbsCategories.map((pwbs) => (
            <Badge key={pwbs} variant="outline">
              {pwbs}
            </Badge>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Items ({items.length})</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Number</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>PWBS</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No items found for this work package.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">
                        {item.itemNumber || "—"}
                      </TableCell>
                      <TableCell>{item.partNumber || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.pwbs}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.caseNumber ? (
                          <Badge variant="outline" className="text-xs">
                            {item.caseNumber}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.weightKg ? item.weightKg.toFixed(2) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkPackageDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-40 mb-4" />
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-6 w-48 mb-2" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
