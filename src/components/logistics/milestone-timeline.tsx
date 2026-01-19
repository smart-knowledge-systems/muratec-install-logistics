"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

interface MilestoneTimelineProps {
  shipment: Doc<"shipments">;
  onMilestoneClick: (milestone: string, currentDate?: number) => void;
}

interface Milestone {
  id: string;
  label: string;
  dateField: keyof Doc<"shipments">;
  expectedDateField?: keyof Doc<"shipments">;
}

const MILESTONES: Milestone[] = [
  {
    id: "factory_out",
    label: "Factory Out",
    dateField: "factoryOutDate",
  },
  {
    id: "etd",
    label: "ETD",
    dateField: "etd",
  },
  {
    id: "atd",
    label: "ATD",
    dateField: "atd",
    expectedDateField: "etd",
  },
  {
    id: "eta",
    label: "ETA",
    dateField: "eta",
  },
  {
    id: "ata",
    label: "ATA",
    dateField: "ata",
    expectedDateField: "eta",
  },
  {
    id: "customs",
    label: "Customs",
    dateField: "customsClearedDate",
  },
  {
    id: "delivered",
    label: "Delivered",
    dateField: "deliveredDate",
  },
];

export function MilestoneTimeline({
  shipment,
  onMilestoneClick,
}: MilestoneTimelineProps) {
  return (
    <div className="py-8">
      {/* Desktop horizontal timeline */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-border" />

          {/* Milestones */}
          <div className="relative flex justify-between">
            {MILESTONES.map((milestone) => {
              const actualDate = shipment[milestone.dateField] as
                | number
                | undefined;
              const expectedDate = milestone.expectedDateField
                ? (shipment[milestone.expectedDateField] as number | undefined)
                : undefined;
              const isCompleted = actualDate !== undefined;

              return (
                <div key={milestone.id} className="flex flex-col items-center">
                  {/* Milestone node */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "relative z-10 rounded-full w-16 h-16 transition-all",
                      isCompleted
                        ? "bg-green-100 hover:bg-green-200 text-green-700"
                        : "bg-background hover:bg-muted border-2 border-border",
                    )}
                    onClick={() =>
                      onMilestoneClick(
                        milestone.dateField as string,
                        actualDate,
                      )
                    }
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-8 w-8" />
                    ) : (
                      <Circle className="h-8 w-8" />
                    )}
                  </Button>

                  {/* Milestone label */}
                  <div className="mt-4 text-center min-w-[100px]">
                    <div className="text-sm font-medium mb-1">
                      {milestone.label}
                    </div>

                    {/* Actual date */}
                    {actualDate && (
                      <div className="text-xs font-semibold text-green-700">
                        {formatDate(new Date(actualDate))}
                      </div>
                    )}

                    {/* Expected date (if different from actual) */}
                    {expectedDate && !actualDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Expected: {formatDate(new Date(expectedDate))}
                      </div>
                    )}

                    {/* Show variance if actual differs from expected */}
                    {actualDate &&
                      expectedDate &&
                      actualDate !== expectedDate && (
                        <div
                          className={cn(
                            "text-xs mt-1",
                            actualDate > expectedDate
                              ? "text-red-600"
                              : "text-blue-600",
                          )}
                        >
                          {actualDate > expectedDate ? "Late" : "Early"}:{" "}
                          {formatDate(new Date(expectedDate))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile vertical timeline */}
      <div className="md:hidden space-y-4">
        {MILESTONES.map((milestone, index) => {
          const actualDate = shipment[milestone.dateField] as
            | number
            | undefined;
          const expectedDate = milestone.expectedDateField
            ? (shipment[milestone.expectedDateField] as number | undefined)
            : undefined;
          const isCompleted = actualDate !== undefined;
          const isLast = index === MILESTONES.length - 1;

          return (
            <div key={milestone.id} className="flex gap-4">
              {/* Timeline node and line */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full w-12 h-12 flex-shrink-0",
                    isCompleted
                      ? "bg-green-100 text-green-700"
                      : "bg-background border-2 border-border",
                  )}
                  onClick={() =>
                    onMilestoneClick(milestone.dateField as string, actualDate)
                  }
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </Button>
                {!isLast && (
                  <div className="w-0.5 h-16 bg-border mt-2 flex-shrink-0" />
                )}
              </div>

              {/* Milestone content */}
              <div className="flex-1 pb-4">
                <div className="font-medium mb-1">{milestone.label}</div>

                {/* Actual date */}
                {actualDate && (
                  <div className="text-sm font-semibold text-green-700">
                    {formatDate(new Date(actualDate))}
                  </div>
                )}

                {/* Expected date */}
                {expectedDate && !actualDate && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Expected: {formatDate(new Date(expectedDate))}
                  </div>
                )}

                {/* Variance */}
                {actualDate && expectedDate && actualDate !== expectedDate && (
                  <div
                    className={cn(
                      "text-sm mt-1",
                      actualDate > expectedDate
                        ? "text-red-600"
                        : "text-blue-600",
                    )}
                  >
                    {actualDate > expectedDate ? "Late" : "Early"}:{" "}
                    {formatDate(new Date(expectedDate))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
