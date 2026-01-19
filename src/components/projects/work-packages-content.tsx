"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WorkPackageCard } from "./work-package-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

interface WorkPackagesContentProps {
  projectNumber: string;
}

export function WorkPackagesContent({
  projectNumber,
}: WorkPackagesContentProps) {
  const workPackages = useQuery(api.workPackages.getWorkPackages, {
    projectNumber,
  });

  if (workPackages === undefined) {
    return <WorkPackagesContentSkeleton />;
  }

  if (!workPackages || workPackages.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Work Packages Found</h3>
          <p className="text-muted-foreground">
            This project doesn&apos;t have any work packages yet.
          </p>
        </div>
      </div>
    );
  }

  // Group work packages by PWBS category
  const groupedWorkPackages = groupByPwbsCategory(workPackages);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Work Packages</h1>
        <p className="text-muted-foreground">
          Project {projectNumber} • {workPackages.length} work packages
        </p>
      </div>

      {/* Work Packages Grouped by PWBS */}
      <div className="space-y-6">
        {groupedWorkPackages.map(({ pwbsCategory, workPackages: wps }) => (
          <div key={pwbsCategory}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-sm">
                {pwbsCategory}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {wps.length} work package{wps.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {wps.map((wp) => (
                <WorkPackageCard
                  key={wp._id}
                  workPackage={wp}
                  projectNumber={projectNumber}
                  showItems={false}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkPackagesContentSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-48" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to group work packages by PWBS category
function groupByPwbsCategory(
  workPackages: Doc<"workPackageSchedule">[],
): Array<{
  pwbsCategory: string;
  workPackages: Doc<"workPackageSchedule">[];
}> {
  const groups = new Map<string, Doc<"workPackageSchedule">[]>();

  for (const wp of workPackages) {
    for (const pwbs of wp.pwbsCategories) {
      if (!groups.has(pwbs)) {
        groups.set(pwbs, []);
      }
      groups.get(pwbs)!.push(wp);
    }
  }

  // Convert to array and sort by PWBS category name
  return Array.from(groups.entries())
    .map(([pwbsCategory, workPackages]) => ({
      pwbsCategory,
      workPackages: workPackages.sort((a, b) =>
        a.plNumber.localeCompare(b.plNumber),
      ),
    }))
    .sort((a, b) => a.pwbsCategory.localeCompare(b.pwbsCategory));
}
