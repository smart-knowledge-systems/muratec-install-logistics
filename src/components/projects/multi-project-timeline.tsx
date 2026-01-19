"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMemo, useState } from "react";

interface MultiProjectTimelineProps {
  project: Doc<"projects">;
  isExpanded: boolean;
}

export function MultiProjectTimeline({
  project,
  isExpanded,
}: MultiProjectTimelineProps) {
  // Use lazy state initializer for Date.now() to maintain render purity
  const [today] = useState(() => Date.now());

  const workPackages = useQuery(
    api.workPackages.getWorkPackages,
    isExpanded ? { projectNumber: project.projectNumber } : "skip",
  );

  // Calculate timeline boundaries
  const timelineBounds = useMemo(() => {
    if (!project.plannedStart || !project.plannedEnd) {
      return null;
    }

    let minDate = project.plannedStart;
    let maxDate = project.plannedEnd;

    // If expanded and we have work packages, use their dates too
    if (isExpanded && workPackages) {
      const scheduledWPs = workPackages.filter(
        (wp) => wp.plannedStart && wp.plannedEnd,
      );
      if (scheduledWPs.length > 0) {
        const wpDates = scheduledWPs.flatMap((wp) => [
          wp.plannedStart!,
          wp.plannedEnd!,
        ]);
        minDate = Math.min(minDate, ...wpDates);
        maxDate = Math.max(maxDate, ...wpDates);
      }
    }

    const totalDuration = maxDate - minDate;
    return { minDate, maxDate, totalDuration };
  }, [project, workPackages, isExpanded]);

  if (!timelineBounds) {
    return (
      <div className="text-sm text-muted-foreground">
        No timeline data available
      </div>
    );
  }

  const { minDate, maxDate, totalDuration } = timelineBounds;

  // Helper to calculate position percentage
  const getPosition = (date: number) => {
    return ((date - minDate) / totalDuration) * 100;
  };

  // Helper to get color for PWBS category
  const getPwbsColor = (pwbs: string) => {
    if (pwbs.startsWith("K")) return "bg-blue-500";
    if (pwbs.startsWith("F")) return "bg-green-500";
    if (pwbs.startsWith("H")) return "bg-orange-500";
    return "bg-gray-500";
  };

  // Helper to get readiness fill style
  const getReadinessFill = (readiness: string) => {
    switch (readiness) {
      case "ready":
        return "bg-current"; // solid
      case "partial":
        return "bg-gradient-to-r from-current to-transparent"; // striped effect
      case "blocked":
        return "border-2 border-current bg-transparent"; // hollow
      default:
        return "bg-current";
    }
  };

  const todayPosition =
    today >= minDate && today <= maxDate ? getPosition(today) : null;

  return (
    <div className="space-y-2">
      {/* Timeline Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>{new Date(minDate).toLocaleDateString()}</span>
        <span>{new Date(maxDate).toLocaleDateString()}</span>
      </div>

      {/* Collapsed View: Just Project Bar */}
      {!isExpanded && (
        <div className="relative h-8 bg-muted rounded">
          {/* Today Marker */}
          {todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${todayPosition}%` }}
              title="Today"
            />
          )}

          {/* Project Bar */}
          <div
            className="absolute top-1 bottom-1 bg-primary rounded"
            style={{
              left: `${getPosition(project.plannedStart!)}%`,
              right: `${100 - getPosition(project.plannedEnd!)}%`,
            }}
            title={`${project.projectName ?? project.projectNumber}: ${new Date(project.plannedStart!).toLocaleDateString()} - ${new Date(project.plannedEnd!).toLocaleDateString()}`}
          />
        </div>
      )}

      {/* Expanded View: Work Package Swimlanes */}
      {isExpanded && workPackages && (
        <div className="space-y-1">
          {workPackages
            .filter((wp) => wp.plannedStart && wp.plannedEnd)
            .map((wp) => {
              // Determine primary PWBS category (first in list)
              const primaryPwbs = wp.pwbsCategories[0] ?? "";
              const color = getPwbsColor(primaryPwbs);
              const readinessFill = getReadinessFill(wp.readinessStatus);

              return (
                <div key={wp._id} className="flex items-center gap-2">
                  <div className="w-32 text-xs truncate" title={wp.plNumber}>
                    {wp.plNumber}
                  </div>
                  <div className="flex-1 relative h-6 bg-muted rounded">
                    {/* Today Marker */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: `${todayPosition}%` }}
                      />
                    )}

                    {/* Work Package Bar */}
                    <div
                      className={`absolute top-1 bottom-1 rounded ${color}`}
                      style={{
                        left: `${getPosition(wp.plannedStart!)}%`,
                        right: `${100 - getPosition(wp.plannedEnd!)}%`,
                      }}
                      title={`${wp.plNumber}: ${wp.readinessStatus}\n${new Date(wp.plannedStart!).toLocaleDateString()} - ${new Date(wp.plannedEnd!).toLocaleDateString()}`}
                    >
                      <div
                        className={`h-full w-full rounded ${readinessFill}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          {workPackages.filter((wp) => wp.plannedStart && wp.plannedEnd)
            .length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              No work packages scheduled yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
