"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GanttChart } from "./gantt-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

interface GanttChartContentProps {
  projectNumber: string;
}

export function GanttChartContent({
  projectNumber,
}: GanttChartContentProps) {
  const workPackages = useQuery(api.workPackages.getWorkPackages, {
    projectNumber,
  });

  const dependencies = useQuery(api.pwbsDependencies.getDependencies, {
    projectNumber,
  });

  if (workPackages === undefined || dependencies === undefined) {
    return <GanttChartContentSkeleton />;
  }

  if (!workPackages || workPackages.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Schedule Data</h3>
          <p className="text-muted-foreground">
            This project doesn&apos;t have any work packages scheduled yet.
          </p>
        </div>
      </div>
    );
  }

  // Filter to only work packages that have planned dates
  const scheduledWorkPackages = workPackages.filter(
    (wp) => wp.plannedStart && wp.plannedEnd,
  );

  if (scheduledWorkPackages.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Scheduled Work Packages</h3>
          <p className="text-muted-foreground">
            Work packages exist but haven&apos;t been scheduled yet. Visit the work packages page to set planned dates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Project Schedule</h1>
        <p className="text-muted-foreground">
          Project {projectNumber} • {scheduledWorkPackages.length} of{" "}
          {workPackages.length} work packages scheduled
        </p>
      </div>

      {/* Gantt Chart */}
      <GanttChart
        workPackages={scheduledWorkPackages}
        dependencies={dependencies}
        projectNumber={projectNumber}
      />
    </div>
  );
}

function GanttChartContentSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}
