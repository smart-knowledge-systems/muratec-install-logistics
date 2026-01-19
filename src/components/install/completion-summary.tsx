"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Package,
} from "lucide-react";

interface CompletionSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectNumber: string;
  plNumber: string;
}

export function CompletionSummary({
  open,
  onOpenChange,
  projectNumber,
  plNumber,
}: CompletionSummaryProps) {
  const items = useQuery(api.installation.getInstallationStatusByWorkPackage, {
    projectNumber,
    plNumber,
  });

  const progress = useQuery(
    api.installation.getWorkPackageInstallationProgress,
    {
      projectNumber,
      plNumber,
    },
  );

  // Calculate daily summary (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  const todayItems =
    items?.filter(
      (item) => item.installedAt && item.installedAt >= todayTimestamp,
    ) || [];

  // Calculate weekly summary (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  const weekAgoTimestamp = weekAgo.getTime();

  const weekItems =
    items?.filter(
      (item) => item.installedAt && item.installedAt >= weekAgoTimestamp,
    ) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Completion Summary
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-6 h-[calc(85vh-100px)]">
          <div className="space-y-6">
            {/* Overall Progress */}
            {progress && (
              <Card className="p-4">
                <h3 className="mb-3 font-semibold">Overall Progress</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {progress.installedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Items Installed
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {progress.percentComplete}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Complete
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {progress.inProgressCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      In Progress
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {progress.issueCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Issues</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Today's Summary */}
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Today</h3>
                <Badge variant="default">
                  <Calendar className="mr-1 h-3 w-3" />
                  {new Date().toLocaleDateString()}
                </Badge>
              </div>

              {todayItems.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  <p>No items installed today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {todayItems.length} items completed
                  </div>
                  <div className="space-y-2">
                    {todayItems.map((item) => (
                      <div
                        key={item.supplyItemId}
                        className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        <div className="flex-1">
                          <div className="font-mono font-semibold">
                            {item.itemNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.installedAt &&
                              new Date(item.installedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* This Week's Summary */}
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">This Week</h3>
                <Badge variant="outline">Last 7 days</Badge>
              </div>

              {weekItems.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  <p>No items installed this week</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {weekItems.length} items completed
                  </div>

                  {/* Group by day */}
                  {(() => {
                    const dayGroups: {
                      [key: string]: typeof weekItems;
                    } = {};

                    weekItems.forEach((item) => {
                      if (item.installedAt) {
                        const day = new Date(item.installedAt);
                        day.setHours(0, 0, 0, 0);
                        const key = day.toLocaleDateString();
                        if (!dayGroups[key]) {
                          dayGroups[key] = [];
                        }
                        dayGroups[key].push(item);
                      }
                    });

                    return Object.entries(dayGroups)
                      .sort(([a], [b]) => {
                        return new Date(b).getTime() - new Date(a).getTime();
                      })
                      .map(([day, dayItems]) => (
                        <div key={day} className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">
                            {day} ({dayItems.length} items)
                          </div>
                          <div className="ml-4 space-y-1">
                            {dayItems.map((item) => (
                              <div key={item.supplyItemId} className="text-xs">
                                • {item.itemNumber}
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              )}
            </Card>

            {/* Open Issues */}
            {items &&
              items.filter((i) => i.installationStatus === "issue").length >
                0 && (
                <Card className="border-destructive p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="font-semibold">Open Issues</h3>
                  </div>

                  <div className="space-y-2">
                    {items
                      .filter((i) => i.installationStatus === "issue")
                      .map((item) => (
                        <div
                          key={item.supplyItemId}
                          className="rounded-md bg-destructive/10 p-2 text-sm"
                        >
                          <div className="font-mono font-semibold">
                            {item.itemNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.issueType?.replace(/_/g, " ")}
                          </div>
                          {item.issueNotes && (
                            <div className="mt-1 text-xs">
                              {item.issueNotes}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </Card>
              )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
