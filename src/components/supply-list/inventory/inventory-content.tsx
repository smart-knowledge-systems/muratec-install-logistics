"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PhotoCapture } from "@/components/photos/photo-capture";
import { toast } from "sonner";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Hash,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

type InventoryStatus = "pending" | "verified" | "missing" | "damaged" | "extra";

interface InventoryItem {
  supplyItemId: Id<"supplyItems">;
  status: InventoryStatus;
  expectedQuantity: number;
  actualQuantity?: number;
  notes?: string;
}

export function InventoryContent() {
  const { user } = useAuth();
  const selectedProject = "92364";

  const [caseInput, setCaseInput] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [inventoryMap, setInventoryMap] = useState<Map<string, InventoryItem>>(
    new Map(),
  );

  // Sheet states for discrepancy reporting
  const [discrepancySheetOpen, setDiscrepancySheetOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] =
    useState<Id<"supplyItems"> | null>(null);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [discrepancyPhotos, setDiscrepancyPhotos] = useState<string[]>([]);
  const [actualQuantity, setActualQuantity] = useState("");

  // Queries
  const expectedContents = useQuery(
    api.fieldOperations.getExpectedContents,
    selectedCase
      ? {
          projectNumber: selectedProject,
          caseNumber: selectedCase,
        }
      : "skip",
  );

  const caseTracking = useQuery(
    api.caseTracking.getCaseByNumber,
    selectedCase
      ? {
          projectNumber: selectedProject,
          caseNumber: selectedCase,
        }
      : "skip",
  );

  // Mutations
  const updateItemStatus = useMutation(api.fieldOperations.updateItemStatus);
  const addDiscrepancyDetails = useMutation(
    api.fieldOperations.addDiscrepancyDetails,
  );
  const getCaseProgress = useMutation(
    api.fieldOperations.getCaseInventoryProgress,
  );

  // Handle case scan/input
  const handleCaseScan = async (scannedCase: string) => {
    const trimmedCase = scannedCase.trim();
    if (!trimmedCase) return;

    setSelectedCase(trimmedCase);
    setCaseInput(trimmedCase);
    setInventoryMap(new Map());
  };

  // Handle item verification status update
  const handleUpdateStatus = async (
    supplyItemId: Id<"supplyItems">,
    status: InventoryStatus,
    quantity: number,
  ) => {
    if (!selectedCase || !user) return;

    try {
      await updateItemStatus({
        projectNumber: selectedProject,
        caseNumber: selectedCase,
        supplyItemId,
        status,
        expectedQuantity: quantity,
        actualQuantity: status === "verified" ? quantity : undefined,
        userId: user._id,
      });

      // Update local state
      setInventoryMap((prev) => {
        const next = new Map(prev);
        next.set(supplyItemId, {
          supplyItemId,
          status,
          expectedQuantity: quantity,
          actualQuantity: status === "verified" ? quantity : undefined,
        });
        return next;
      });

      // Refresh progress
      await getCaseProgress({
        projectNumber: selectedProject,
        caseNumber: selectedCase,
      });

      toast.success(
        status === "verified"
          ? "Item verified"
          : status === "missing"
            ? "Item marked as missing"
            : status === "damaged"
              ? "Item marked as damaged"
              : "Item status updated",
      );
    } catch (error) {
      toast.error(`Failed to update item status: ${error}`);
    }
  };

  // Open discrepancy sheet
  const openDiscrepancySheet = (supplyItemId: Id<"supplyItems">) => {
    setSelectedItemId(supplyItemId);
    setDiscrepancySheetOpen(true);
    setDiscrepancyNotes("");
    setActualQuantity("");
  };

  // Handle discrepancy submission
  const handleSubmitDiscrepancy = async () => {
    if (!selectedCase || !selectedItemId || !user) return;

    const item = expectedContents?.find((i) => i._id === selectedItemId);
    if (!item) return;

    try {
      // Update status with actual quantity
      const qty = actualQuantity ? parseInt(actualQuantity, 10) : undefined;
      const invItem = inventoryMap.get(selectedItemId);
      const status = invItem?.status || "damaged";

      await updateItemStatus({
        projectNumber: selectedProject,
        caseNumber: selectedCase,
        supplyItemId: selectedItemId,
        status,
        expectedQuantity: item.quantity || 1,
        actualQuantity: qty,
        userId: user._id,
      });

      // Add discrepancy details
      if (discrepancyNotes.trim() || discrepancyPhotos.length > 0) {
        await addDiscrepancyDetails({
          projectNumber: selectedProject,
          caseNumber: selectedCase,
          supplyItemId: selectedItemId,
          notes: discrepancyNotes || undefined,
          photos: discrepancyPhotos.length > 0 ? discrepancyPhotos : undefined,
        });
      }

      // Update local state
      setInventoryMap((prev) => {
        const next = new Map(prev);
        next.set(selectedItemId, {
          supplyItemId: selectedItemId,
          status,
          expectedQuantity: item.quantity || 1,
          actualQuantity: qty,
          notes: discrepancyNotes,
        });
        return next;
      });

      // Refresh progress
      await getCaseProgress({
        projectNumber: selectedProject,
        caseNumber: selectedCase,
      });

      toast.success("Discrepancy details saved");
      setDiscrepancySheetOpen(false);
      setSelectedItemId(null);
      setDiscrepancyNotes("");
      setDiscrepancyPhotos([]);
      setActualQuantity("");
    } catch (error) {
      toast.error(`Failed to save discrepancy: ${error}`);
    }
  };

  // Calculate progress
  const progress = expectedContents
    ? {
        total: expectedContents.length,
        verified: Array.from(inventoryMap.values()).filter(
          (i) => i.status === "verified",
        ).length,
      }
    : { total: 0, verified: 0 };

  const percentComplete =
    progress.total > 0
      ? Math.round((progress.verified / progress.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Inventory Verification</h1>
            <p className="text-xs text-muted-foreground">
              Project {selectedProject}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{user?.name || user?.email}</span>
          </div>
        </div>
      </header>

      {/* Progress Section */}
      {selectedCase && expectedContents && (
        <div className="border-b bg-muted/30 px-4 py-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Verification Progress</span>
              <span className="text-sm text-muted-foreground">
                {progress.verified} / {progress.total} items
              </span>
            </div>
            <Progress value={percentComplete} className="h-2" />
            <div className="flex gap-2 mt-3">
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {progress.verified} Verified
              </Badge>
              <Badge variant="outline" className="bg-gray-50">
                {progress.total - progress.verified} Remaining
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Case Scan Input */}
        {!selectedCase && (
          <Card className="p-4">
            <div className="space-y-3">
              <Label htmlFor="case-input">Case Number</Label>
              <div className="flex gap-2">
                <Input
                  id="case-input"
                  placeholder="Scan or enter case number..."
                  value={caseInput}
                  onChange={(e) => setCaseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCaseScan(caseInput);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  size="default"
                  onClick={() => handleCaseScan(caseInput)}
                  disabled={!caseInput.trim()}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Select
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Scan or type case number to begin verification
              </p>
            </div>
          </Card>
        )}

        {/* Case Header (when case is selected) */}
        {selectedCase && (
          <Card className="p-4 border-2 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedCase}</h3>
                <p className="text-sm text-muted-foreground">
                  {caseTracking?.inventoryStatus === "complete"
                    ? "Inventory complete"
                    : caseTracking?.inventoryStatus === "discrepancy"
                      ? "Discrepancies found"
                      : caseTracking?.inventoryStatus === "in_progress"
                        ? "Verification in progress"
                        : "Ready to verify"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCase(null);
                  setCaseInput("");
                  setInventoryMap(new Map());
                }}
              >
                Change Case
              </Button>
            </div>
          </Card>
        )}

        {/* Expected Contents List */}
        {selectedCase && expectedContents && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground px-1">
              Expected Contents ({expectedContents.length} items)
            </h2>
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-2">
                {expectedContents.map((item) => {
                  const invItem = inventoryMap.get(item._id);
                  const status = invItem?.status || "pending";

                  return (
                    <Card
                      key={item._id}
                      className={`p-4 ${
                        status === "verified"
                          ? "border-green-200 bg-green-50/50"
                          : status === "missing"
                            ? "border-red-200 bg-red-50/50"
                            : status === "damaged"
                              ? "border-orange-200 bg-orange-50/50"
                              : ""
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Item Info */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {item.itemNumber || "N/A"}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>PN: {item.partNumber || "N/A"}</span>
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  Qty: {item.quantity || 1}
                                </span>
                              </div>
                            </div>
                            {status !== "pending" && (
                              <Badge
                                variant={
                                  status === "verified"
                                    ? "default"
                                    : status === "missing"
                                      ? "destructive"
                                      : "outline"
                                }
                                className={
                                  status === "verified"
                                    ? "bg-green-500"
                                    : status === "damaged"
                                      ? "border-orange-500 text-orange-600"
                                      : ""
                                }
                              >
                                {status === "verified" && (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                {status === "missing" && (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {status === "damaged" && (
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                )}
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {status === "pending" && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="lg"
                              className="h-12 bg-green-500 hover:bg-green-600"
                              onClick={() =>
                                handleUpdateStatus(
                                  item._id,
                                  "verified",
                                  item.quantity || 1,
                                )
                              }
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Verified
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              className="h-12 border-red-500 text-red-600 hover:bg-red-50"
                              onClick={() =>
                                handleUpdateStatus(
                                  item._id,
                                  "missing",
                                  item.quantity || 1,
                                )
                              }
                            >
                              <XCircle className="h-5 w-5 mr-2" />
                              Missing
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              className="h-12 border-orange-500 text-orange-600 hover:bg-orange-50"
                              onClick={() =>
                                handleUpdateStatus(
                                  item._id,
                                  "damaged",
                                  item.quantity || 1,
                                )
                              }
                            >
                              <AlertTriangle className="h-5 w-5 mr-2" />
                              Damaged
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              className="h-12"
                              onClick={() =>
                                handleUpdateStatus(
                                  item._id,
                                  "extra",
                                  item.quantity || 1,
                                )
                              }
                            >
                              Extra
                            </Button>
                          </div>
                        )}

                        {/* Add Details Button (for non-verified items) */}
                        {status !== "pending" && status !== "verified" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => openDiscrepancySheet(item._id)}
                          >
                            Add Details
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}

                {expectedContents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No items found for this case</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Large Scan Button at Bottom (when no case selected) */}
      {!selectedCase && (
        <div className="sticky bottom-0 border-t bg-background p-4">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={() => {
              document.getElementById("case-input")?.focus();
            }}
          >
            <ScanLine className="h-6 w-6 mr-2" />
            Scan Case
          </Button>
        </div>
      )}

      {/* Discrepancy Details Sheet */}
      <Sheet open={discrepancySheetOpen} onOpenChange={setDiscrepancySheetOpen}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Discrepancy Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actual-quantity">Actual Quantity</Label>
              <Input
                id="actual-quantity"
                type="number"
                placeholder="Enter actual quantity found..."
                value={actualQuantity}
                onChange={(e) => setActualQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if quantity is unknown or not applicable
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discrepancy-notes">Notes</Label>
              <Textarea
                id="discrepancy-notes"
                placeholder="Describe the issue (e.g., scratched, wrong part, etc.)..."
                value={discrepancyNotes}
                onChange={(e) => setDiscrepancyNotes(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Photos</Label>
              <PhotoCapture
                onPhotosChange={setDiscrepancyPhotos}
                existingPhotos={discrepancyPhotos}
                maxPhotos={5}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDiscrepancySheetOpen(false);
                  setDiscrepancyNotes("");
                  setDiscrepancyPhotos([]);
                  setActualQuantity("");
                  setSelectedItemId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitDiscrepancy}
                disabled={!discrepancyNotes.trim() && !actualQuantity}
              >
                Save Details
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
