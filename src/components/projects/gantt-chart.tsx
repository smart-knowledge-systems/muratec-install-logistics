"use client";

import { useState, useMemo } from "react";
import {
  format,
  addDays,
  startOfDay,
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ZoomLevel = "day" | "week" | "month";

interface GanttChartProps {
  workPackages: Doc<"workPackageSchedule">[];
  dependencies: Doc<"pwbsDependencies">[];
  projectNumber: string;
}

// Note: dependencies parameter is provided for future use in showing PWBS-level dependencies
// Currently, work package-level predecessors are used for dependency arrows

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  pwbsCategories: string[];
  readinessStatus: "ready" | "partial" | "blocked";
  scheduleStatus: string;
  predecessors: string[];
}

interface DownstreamUpdate {
  id: string;
  plNumber: string;
  newStart: number;
}

interface DragState {
  taskId: string;
  originalStart: number;
  originalEnd: number;
  currentStart: number;
  currentEnd: number;
}

export function GanttChart({ workPackages }: GanttChartProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [downstreamDialog, setDownstreamDialog] = useState<{
    isOpen: boolean;
    updates: DownstreamUpdate[];
    originalWorkPackage: string;
  }>({ isOpen: false, updates: [], originalWorkPackage: "" });

  const scheduleWorkPackage = useMutation(
    api.workPackageScheduling.scheduleWorkPackage,
  );
  const applyDownstreamUpdates = useMutation(
    api.workPackageScheduling.applyDownstreamUpdates,
  );

  // Handle drag start
  const handleDragStart = (task: GanttTask, _e: React.MouseEvent) => {
    setDragState({
      taskId: task.id,
      originalStart: task.start.getTime(),
      originalEnd: task.end.getTime(),
      currentStart: task.start.getTime(),
      currentEnd: task.end.getTime(),
    });
  };

  // Handle drag move
  const handleDragMove = (e: React.MouseEvent, task: GanttTask) => {
    if (!dragState || dragState.taskId !== task.id) return;

    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Calculate new start date based on mouse position
    const dayOffset = Math.round((x / TIMELINE_WIDTH) * totalDays);
    const newStartTime = addDays(timelineStart, dayOffset).getTime();
    const duration = dragState.originalEnd - dragState.originalStart;
    const newEndTime = newStartTime + duration;

    setDragState({
      ...dragState,
      currentStart: newStartTime,
      currentEnd: newEndTime,
    });
  };

  // Handle drag end
  const handleDragEnd = async (task: GanttTask) => {
    if (!dragState || dragState.taskId !== task.id) return;

    // Check if dates actually changed
    if (
      dragState.currentStart === dragState.originalStart &&
      dragState.currentEnd === dragState.originalEnd
    ) {
      setDragState(null);
      return;
    }

    try {
      // Call schedule mutation with cascadeDownstream = true
      const result = await scheduleWorkPackage({
        projectNumber: workPackages[0]?.projectNumber || "",
        plNumber: task.id,
        plannedStart: dragState.currentStart,
        plannedEnd: dragState.currentEnd,
        cascadeDownstream: true,
      });

      // Show warnings if any
      if (result.validation.warnings.length > 0) {
        toast.warning("Dependency Warnings", {
          description: result.validation.warnings.join("\n"),
        });
      }

      // Show downstream updates dialog if any
      if (result.downstreamUpdates.length > 0) {
        setDownstreamDialog({
          isOpen: true,
          updates: result.downstreamUpdates,
          originalWorkPackage: task.id,
        });
      } else {
        toast.success("Work package rescheduled");
      }
    } catch (error) {
      toast.error("Failed to reschedule", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }

    setDragState(null);
  };

  // Handle applying downstream updates
  const handleApplyDownstreamUpdates = async (apply: boolean) => {
    if (apply && downstreamDialog.updates.length > 0) {
      try {
        await applyDownstreamUpdates({
          updates: downstreamDialog.updates.map((u) => ({
            id: u.id as Id<"workPackageSchedule">,
            newStart: u.newStart,
          })),
        });
        toast.success(
          `Updated ${downstreamDialog.updates.length} downstream work packages`,
        );
      } catch (error) {
        toast.error("Failed to update downstream work packages", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    setDownstreamDialog({
      isOpen: false,
      updates: [],
      originalWorkPackage: "",
    });
  };

  // Convert work packages to Gantt tasks
  const tasks = useMemo<GanttTask[]>(() => {
    return workPackages
      .filter((wp) => wp.plannedStart && wp.plannedEnd)
      .map((wp) => ({
        id: wp.plNumber,
        name: wp.plName || wp.plNumber,
        start: new Date(wp.plannedStart!),
        end: new Date(wp.plannedEnd!),
        pwbsCategories: wp.pwbsCategories,
        readinessStatus: wp.readinessStatus,
        scheduleStatus: wp.scheduleStatus,
        predecessors: wp.predecessors || [],
      }));
  }, [workPackages]);

  // Calculate timeline bounds
  const { timelineStart, timelineEnd } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        timelineStart: startOfDay(now),
        timelineEnd: startOfDay(addDays(now, 30)),
      };
    }

    const starts = tasks.map((t) => t.start.getTime());
    const ends = tasks.map((t) => t.end.getTime());
    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));

    // Add padding
    return {
      timelineStart: startOfDay(addDays(minStart, -7)),
      timelineEnd: startOfDay(addDays(maxEnd, 7)),
    };
  }, [tasks]);

  // Calculate timeline intervals based on zoom
  // React Compiler handles memoization - manual useMemo removed to avoid compiler conflicts
  const timelineIntervals = (() => {
    switch (zoomLevel) {
      case "day":
        return eachDayOfInterval({ start: timelineStart, end: timelineEnd });
      case "week":
        return eachWeekOfInterval({ start: timelineStart, end: timelineEnd });
      case "month":
        return eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
    }
  })();

  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, timelineStart);

  // Dimensions
  const ROW_HEIGHT = 50;
  const HEADER_HEIGHT = 60;
  const TASK_NAME_WIDTH = 250;
  const TIMELINE_WIDTH = Math.max(
    1000,
    timelineIntervals.length * getIntervalWidth(zoomLevel),
  );
  const CHART_HEIGHT = tasks.length * ROW_HEIGHT;

  // Calculate dependency arrows
  // React Compiler handles memoization - manual useMemo removed to avoid compiler conflicts
  const dependencyArrows = (() => {
    const arrows: Array<{
      fromTask: string;
      toTask: string;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }> = [];

    tasks.forEach((task, taskIdx) => {
      if (task.predecessors && task.predecessors.length > 0) {
        task.predecessors.forEach((predId) => {
          const predTask = tasks.find((t) => t.id === predId);
          if (!predTask) return;

          const predIdx = tasks.indexOf(predTask);

          // Calculate positions
          const predEnd = differenceInDays(predTask.end, timelineStart);
          const taskStart = differenceInDays(task.start, timelineStart);

          const fromX = (predEnd / totalDays) * TIMELINE_WIDTH;
          const fromY = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toX = (taskStart / totalDays) * TIMELINE_WIDTH;
          const toY = taskIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

          arrows.push({
            fromTask: predTask.id,
            toTask: task.id,
            fromX,
            fromY,
            toX,
            toY,
          });
        });
      }
    });

    return arrows;
  })();

  return (
    <Card className="p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Zoom:</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={zoomLevel === "day" ? "default" : "outline"}
              onClick={() => setZoomLevel("day")}
            >
              Day
            </Button>
            <Button
              size="sm"
              variant={zoomLevel === "week" ? "default" : "outline"}
              onClick={() => setZoomLevel("week")}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={zoomLevel === "month" ? "default" : "outline"}
              onClick={() => setZoomLevel("month")}
            >
              Month
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>K Series</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>F Series</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded" />
            <span>H Series</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded" />
            <span>Other</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto border rounded-lg">
        <div style={{ minWidth: TASK_NAME_WIDTH + TIMELINE_WIDTH }}>
          {/* Header */}
          <div className="flex border-b bg-muted/50">
            <div
              className="flex-shrink-0 border-r p-3 font-semibold"
              style={{ width: TASK_NAME_WIDTH }}
            >
              Work Package
            </div>
            <div className="flex-1 relative" style={{ height: HEADER_HEIGHT }}>
              <svg width={TIMELINE_WIDTH} height={HEADER_HEIGHT}>
                {/* Timeline intervals */}
                {timelineIntervals.map((date, idx) => {
                  const x = (idx * TIMELINE_WIDTH) / timelineIntervals.length;
                  const width = TIMELINE_WIDTH / timelineIntervals.length;

                  return (
                    <g key={date.toISOString()}>
                      <line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={HEADER_HEIGHT}
                        stroke="hsl(var(--border))"
                        strokeWidth={1}
                      />
                      <text
                        x={x + width / 2}
                        y={HEADER_HEIGHT / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs fill-foreground"
                      >
                        {formatIntervalLabel(date, zoomLevel)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Task rows */}
          {tasks.map((task) => {
            // Use drag state if this task is being dragged
            const isDragging = dragState?.taskId === task.id;
            const displayStart = isDragging
              ? new Date(dragState.currentStart)
              : task.start;
            const displayEnd = isDragging
              ? new Date(dragState.currentEnd)
              : task.end;

            const taskStart = Math.max(
              0,
              differenceInDays(displayStart, timelineStart),
            );
            const taskEnd = differenceInDays(displayEnd, timelineStart);
            const taskDuration = taskEnd - taskStart;

            const barX = (taskStart / totalDays) * TIMELINE_WIDTH;
            const barWidth = Math.max(
              10,
              (taskDuration / totalDays) * TIMELINE_WIDTH,
            );

            return (
              <div key={task.id} className="flex border-b hover:bg-muted/30">
                <div
                  className="flex-shrink-0 border-r p-3 flex items-center gap-2"
                  style={{ width: TASK_NAME_WIDTH }}
                >
                  <span className="font-medium text-sm truncate">
                    {task.id}
                  </span>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {task.pwbsCategories[0]}
                  </Badge>
                  {getReadinessBadge(task.readinessStatus)}
                </div>
                <div className="flex-1 relative" style={{ height: ROW_HEIGHT }}>
                  <svg
                    width={TIMELINE_WIDTH}
                    height={ROW_HEIGHT}
                    onMouseMove={(e) => handleDragMove(e, task)}
                    onMouseUp={() => handleDragEnd(task)}
                  >
                    {/* Grid lines */}
                    {timelineIntervals.map((_, intervalIdx) => {
                      const x =
                        (intervalIdx * TIMELINE_WIDTH) /
                        timelineIntervals.length;
                      return (
                        <line
                          key={intervalIdx}
                          x1={x}
                          y1={0}
                          x2={x}
                          y2={ROW_HEIGHT}
                          stroke="hsl(var(--border))"
                          strokeWidth={0.5}
                          opacity={0.3}
                        />
                      );
                    })}

                    {/* Today marker */}
                    {todayOffset >= 0 && todayOffset <= totalDays && (
                      <line
                        x1={(todayOffset / totalDays) * TIMELINE_WIDTH}
                        y1={0}
                        x2={(todayOffset / totalDays) * TIMELINE_WIDTH}
                        y2={ROW_HEIGHT}
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Task bar */}
                    <rect
                      x={barX}
                      y={ROW_HEIGHT / 2 - 15}
                      width={barWidth}
                      height={30}
                      fill={getPwbsColor(task.pwbsCategories[0])}
                      opacity={
                        isDragging
                          ? 0.5
                          : getReadinessOpacity(task.readinessStatus)
                      }
                      stroke={
                        isDragging
                          ? "hsl(var(--primary))"
                          : getPwbsColor(task.pwbsCategories[0])
                      }
                      strokeWidth={isDragging ? 3 : 2}
                      rx={4}
                      className="cursor-move hover:opacity-80 transition-opacity"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDragStart(task, e);
                      }}
                    />

                    {/* Readiness pattern overlay */}
                    {task.readinessStatus !== "ready" && (
                      <pattern
                        id={`pattern-${task.id}`}
                        patternUnits="userSpaceOnUse"
                        width="8"
                        height="8"
                        patternTransform="rotate(45)"
                      >
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          stroke="white"
                          strokeWidth="2"
                        />
                      </pattern>
                    )}
                    {task.readinessStatus === "partial" && (
                      <rect
                        x={barX}
                        y={ROW_HEIGHT / 2 - 15}
                        width={barWidth}
                        height={30}
                        fill={`url(#pattern-${task.id})`}
                        rx={4}
                      />
                    )}
                    {task.readinessStatus === "blocked" && (
                      <rect
                        x={barX}
                        y={ROW_HEIGHT / 2 - 15}
                        width={barWidth}
                        height={30}
                        fill="none"
                        stroke={getPwbsColor(task.pwbsCategories[0])}
                        strokeWidth={2}
                        rx={4}
                      />
                    )}

                    {/* Task label */}
                    <text
                      x={barX + 8}
                      y={ROW_HEIGHT / 2}
                      dominantBaseline="middle"
                      className="text-xs fill-white font-medium pointer-events-none"
                    >
                      {task.name.length > 20
                        ? task.name.substring(0, 20) + "..."
                        : task.name}
                    </text>
                  </svg>
                </div>
              </div>
            );
          })}

          {/* Dependency arrows overlay */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: TASK_NAME_WIDTH,
              top: HEADER_HEIGHT,
              width: TIMELINE_WIDTH,
              height: CHART_HEIGHT,
            }}
          >
            <svg
              width={TIMELINE_WIDTH}
              height={CHART_HEIGHT}
              className="absolute top-0 left-0"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3, 0 6"
                    fill="hsl(var(--muted-foreground))"
                  />
                </marker>
              </defs>
              {dependencyArrows.map((arrow) => {
                // Create a path with right angles
                const midX = (arrow.fromX + arrow.toX) / 2;
                const path = `M ${arrow.fromX} ${arrow.fromY}
                             L ${midX} ${arrow.fromY}
                             L ${midX} ${arrow.toY}
                             L ${arrow.toX} ${arrow.toY}`;

                return (
                  <path
                    key={`${arrow.fromTask}-${arrow.toTask}`}
                    d={path}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    opacity={0.5}
                  />
                );
              })}
            </svg>
          </div>

          {/* Today marker in header */}
          {todayOffset >= 0 && todayOffset <= totalDays && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left:
                  TASK_NAME_WIDTH + (todayOffset / totalDays) * TIMELINE_WIDTH,
                width: 2,
              }}
            >
              <div className="w-full h-full bg-destructive opacity-50" />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
                Today
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Readiness Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium">Readiness:</span>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 bg-blue-500 rounded" />
          <span>Ready (solid)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 bg-blue-500 rounded relative overflow-hidden">
            <div
              className="absolute inset-0 bg-white opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 3px, white 3px, white 6px)",
              }}
            />
          </div>
          <span>Partial (striped)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 border-2 border-blue-500 rounded" />
          <span>Blocked (hollow)</span>
        </div>
      </div>

      {/* Downstream Updates Dialog */}
      <Dialog
        open={downstreamDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) handleApplyDownstreamUpdates(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Downstream Work Packages?</DialogTitle>
            <DialogDescription>
              Moving work package {downstreamDialog.originalWorkPackage} will
              affect {downstreamDialog.updates.length} downstream work
              package(s) based on dependencies.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">Affected work packages:</p>
            <ul className="space-y-2">
              {downstreamDialog.updates.map((update) => (
                <li key={update.id} className="text-sm">
                  <span className="font-medium">{update.plNumber}</span> will
                  start on {format(new Date(update.newStart), "MMM d, yyyy")}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleApplyDownstreamUpdates(false)}
            >
              No, Keep Current
            </Button>
            <Button onClick={() => handleApplyDownstreamUpdates(true)}>
              Yes, Auto-Adjust
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Helper functions
function getIntervalWidth(zoom: ZoomLevel): number {
  switch (zoom) {
    case "day":
      return 80;
    case "week":
      return 120;
    case "month":
      return 150;
  }
}

function formatIntervalLabel(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case "day":
      return format(date, "MMM d");
    case "week":
      return format(date, "MMM d");
    case "month":
      return format(date, "MMM yyyy");
  }
}

function getPwbsColor(pwbs: string): string {
  const prefix = pwbs.charAt(0).toUpperCase();
  switch (prefix) {
    case "K":
      return "hsl(217, 91%, 60%)"; // blue-500
    case "F":
      return "hsl(142, 71%, 45%)"; // green-500
    case "H":
      return "hsl(25, 95%, 53%)"; // orange-500
    default:
      return "hsl(215, 14%, 34%)"; // gray-500
  }
}

function getReadinessOpacity(
  readiness: "ready" | "partial" | "blocked",
): number {
  switch (readiness) {
    case "ready":
      return 0.9;
    case "partial":
      return 0.7;
    case "blocked":
      return 0.3;
  }
}

function getReadinessBadge(readiness: "ready" | "partial" | "blocked") {
  switch (readiness) {
    case "ready":
      return (
        <Badge variant="default" className="bg-green-500 text-white text-xs">
          Ready
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="default" className="bg-yellow-500 text-white text-xs">
          Partial
        </Badge>
      );
    case "blocked":
      return (
        <Badge variant="default" className="bg-red-500 text-white text-xs">
          Blocked
        </Badge>
      );
  }
}
