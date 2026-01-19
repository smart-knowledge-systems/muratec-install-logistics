"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  Package,
  Hash,
  Wrench,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { IssueReportDialog } from "./issue-report-dialog";
import { CompletionSummary } from "./completion-summary";

type InstallStatus = "not_started" | "in_progress" | "installed" | "issue";
type PickStatus = "pending" | "picked" | "partial" | "unavailable";

interface InstallationItem {
  supplyItemId: Id<"supplyItems">;
  itemNumber: string;
  partNumber: string;
  description: string;
  quantity: number;
  caseNumber?: string | null;
  installationStatus: InstallStatus;
  startedAt?: number;
  installedAt?: number;
  installedBy?: Id<"users">;
  issueType?:
    | "missing_part"
    | "damaged_part"
    | "wrong_part"
    | "site_condition"
    | "other";
  issueNotes?: string;
  issuePhotos?: string[];
  issueReportedAt?: number;
  issueReportedBy?: Id<"users">;
  issueResolvedAt?: number;
  pickingStatus: PickStatus;
  pickedAt?: number;
}

interface InstallerContentProps {
  projectNumber: string;
  plNumber: string;
}

export function InstallerContent({
  projectNumber,
  plNumber,
}: InstallerContentProps) {
  const { user } = useAuth();

  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedItemForIssue, setSelectedItemForIssue] =
    useState<InstallationItem | null>(null);

  const [summarySheetOpen, setSummarySheetOpen] = useState(false);

  // Loading states to prevent double-click
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());

  // Mount guard to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Queries
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

  // Mutations
  const updateStatus = useMutation(api.installation.updateInstallationStatus);

  // Handle marking item as installed
  const handleMarkInstalled = async (item: InstallationItem) => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const itemId = item.supplyItemId.toString();

    // Prevent double-click
    if (loadingItems.has(itemId)) return;

    // Check if item was picked
    if (item.pickingStatus !== "picked") {
      toast.warning(
        `Item has not been picked yet (status: ${item.pickingStatus}). Proceeding anyway.`,
        {
          duration: 5000,
        },
      );
    }

    // Set loading state
    setLoadingItems((prev) => new Set(prev).add(itemId));

    try {
      const result = await updateStatus({
        supplyItemId: item.supplyItemId,
        projectNumber,
        plNumber,
        status: "installed",
        userId: user._id,
      });

      // Check if component is still mounted
      if (!isMountedRef.current) return;

      if (result.warning) {
        toast.warning(result.warning, { duration: 5000 });
      }

      // Vibration feedback if available
      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }

      toast.success("Item marked as installed", {
        description: `${item.itemNumber} completed`,
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.error(`Failed to update installation status: ${error}`);
    } finally {
      if (isMountedRef.current) {
        setLoadingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    }
  };

  // Handle opening issue dialog
  const handleOpenIssueDialog = (item: InstallationItem) => {
    setSelectedItemForIssue(item);
    setIssueDialogOpen(true);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: InstallStatus }) => {
    switch (status) {
      case "installed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Installed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Wrench className="mr-1 h-3 w-3" />
            In Progress
          </Badge>
        );
      case "issue":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Issue
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Package className="mr-1 h-3 w-3" />
            Not Started
          </Badge>
        );
    }
  };

  // Filter items to show only those picked (ready for installation)
  // Also filter out items with missing required fields and cast to InstallationItem type
  const pickedItems: InstallationItem[] =
    items
      ?.filter(
        (
          item,
        ): item is typeof item & {
          itemNumber: string;
          partNumber: string;
          description: string;
          quantity: number;
        } =>
          item.pickingStatus === "picked" &&
          item.itemNumber !== undefined &&
          item.partNumber !== undefined &&
          item.description !== undefined &&
          item.quantity !== undefined,
      )
      .map((item) => ({
        ...item,
        itemNumber: item.itemNumber,
        partNumber: item.partNumber,
        description: item.description,
        quantity: item.quantity,
      })) || [];

  // Calculate progress percentage
  const progressPercent = progress?.percentComplete || 0;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Installation</h1>
            <p className="text-sm text-muted-foreground">
              Project {projectNumber} • WP {plNumber}
            </p>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Wrench className="h-8 w-8 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSummarySheetOpen(true)}
              className="text-xs"
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              Summary
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {progress && (
        <div className="border-b bg-background px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Installation Progress</span>
            <div className="flex gap-2">
              <Badge variant="outline">
                {progress.installedCount} / {progress.totalItems} items
              </Badge>
              {progress.issueCount > 0 && (
                <Badge variant="destructive">
                  {progress.issueCount} issues
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{progressPercent}% complete</span>
            <span>
              {progress.notStartedCount + progress.inProgressCount} remaining
            </span>
          </div>
        </div>
      )}

      {/* Item List */}
      <ScrollArea className="flex-1 px-4">
        {!items && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Loading items...</p>
            </div>
          </div>
        )}

        {items && pickedItems.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Package className="mx-auto mb-2 h-12 w-12" />
              <p className="font-medium">No items ready for installation</p>
              <p className="mt-1 text-sm">Items must be picked first</p>
            </div>
          </div>
        )}

        {items && pickedItems.length > 0 && (
          <div className="space-y-3 py-4">
            {pickedItems.map((item) => {
              const _isPending = item.installationStatus === "not_started";
              const isIssue = item.installationStatus === "issue";
              const isInstalled = item.installationStatus === "installed";

              return (
                <Card
                  key={item.supplyItemId}
                  className={`p-4 transition-colors ${
                    isInstalled
                      ? "opacity-50 hover:opacity-75"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold">
                          {item.itemNumber}
                        </span>
                        <StatusBadge status={item.installationStatus} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Hash className="mr-1 inline h-3 w-3" />
                        Part: {item.partNumber}
                      </div>
                    </div>
                  </div>

                  <p className="mb-3 text-sm">{item.description}</p>

                  <div className="mb-3 flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Qty:</span>{" "}
                      <span className="font-semibold">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Case:</span>{" "}
                      <span className="font-medium">
                        {item.caseNumber || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Issue details */}
                  {isIssue && item.issueNotes && (
                    <div className="mb-3 rounded-md bg-red-50 p-3 text-sm dark:bg-red-950">
                      <div className="mb-1 font-semibold text-red-800 dark:text-red-300">
                        Issue: {item.issueType?.replace(/_/g, " ")}
                      </div>
                      <div className="text-red-700 dark:text-red-400">
                        {item.issueNotes}
                      </div>
                    </div>
                  )}

                  {/* Installed timestamp */}
                  {isInstalled && item.installedAt && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Installed: {new Date(item.installedAt).toLocaleString()}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isInstalled && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleMarkInstalled(item)}
                        variant="default"
                        className="h-14 bg-green-500 hover:bg-green-600"
                        size="lg"
                        disabled={loadingItems.has(
                          item.supplyItemId.toString(),
                        )}
                      >
                        {loadingItems.has(item.supplyItemId.toString()) ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                        )}
                        Installed
                      </Button>
                      <Button
                        onClick={() => handleOpenIssueDialog(item)}
                        variant="destructive"
                        className="h-14"
                        size="lg"
                      >
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Issue
                      </Button>
                    </div>
                  )}

                  {isInstalled && (
                    <div className="text-center text-sm text-green-600 dark:text-green-400">
                      ✓ Installation complete
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Issue Report Dialog */}
      {selectedItemForIssue && (
        <IssueReportDialog
          open={issueDialogOpen}
          onOpenChange={setIssueDialogOpen}
          item={selectedItemForIssue}
          projectNumber={projectNumber}
          plNumber={plNumber}
          userId={user?._id}
        />
      )}

      {/* Completion Summary Sheet */}
      <CompletionSummary
        open={summarySheetOpen}
        onOpenChange={setSummarySheetOpen}
        projectNumber={projectNumber}
        plNumber={plNumber}
      />
    </div>
  );
}
