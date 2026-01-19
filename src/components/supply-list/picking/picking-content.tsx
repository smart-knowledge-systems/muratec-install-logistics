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
import { toast } from "sonner";
import {
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Hash,
  ClipboardList,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

type PickStatus = "pending" | "picked" | "partial" | "unavailable";

interface PickingItem {
  supplyItemId: Id<"supplyItems">;
  status: PickStatus;
  requiredQuantity: number;
  pickedQuantity?: number;
  notes?: string;
}

export function PickingContent() {
  const { user } = useAuth();
  // TODO: Add project selector when multi-project support is needed
  const selectedProject = "92364";

  const [plNumberInput, setPlNumberInput] = useState("");
  const [selectedPlNumber, setSelectedPlNumber] = useState<string | null>(null);
  const [pickingMap, setPickingMap] = useState<Map<string, PickingItem>>(
    new Map(),
  );

  // Sheet states for partial quantity input
  const [partialSheetOpen, setPartialSheetOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] =
    useState<Id<"supplyItems"> | null>(null);
  const [partialQuantity, setPartialQuantity] = useState("");
  const [pickNotes, setPickNotes] = useState("");

  // Queries
  const filterOptions = useQuery(api.supplyItems.getFilterOptions, {
    projectNumber: selectedProject,
  });

  const pickList = useQuery(
    api.picking.getPickListByWorkPackage,
    selectedPlNumber
      ? {
          projectNumber: selectedProject,
          plNumber: selectedPlNumber,
        }
      : "skip",
  );

  const kitReadiness = useQuery(
    api.picking.getKitReadiness,
    selectedPlNumber
      ? {
          projectNumber: selectedProject,
          plNumber: selectedPlNumber,
        }
      : "skip",
  );

  // Mutations
  const generatePickList = useMutation(api.picking.generatePickList);
  const updatePickStatus = useMutation(api.picking.updatePickStatus);

  // Handle work package selection
  const handleSelectPlNumber = async () => {
    const trimmedPl = plNumberInput.trim();
    if (!trimmedPl) return;

    // Check if plNumber exists in project
    if (
      !filterOptions?.plNumbers.includes(trimmedPl) &&
      filterOptions?.plNumbers.length
    ) {
      toast.error(`Work package ${trimmedPl} not found in project`);
      return;
    }

    setSelectedPlNumber(trimmedPl);
    setPickingMap(new Map());

    // Generate pick list if it doesn't exist
    try {
      await generatePickList({
        projectNumber: selectedProject,
        plNumber: trimmedPl,
      });
      toast.success(`Pick list loaded for ${trimmedPl}`);
    } catch (error) {
      toast.error(`Failed to generate pick list: ${error}`);
    }
  };

  // Handle status update for full pick
  const handleUpdateStatus = async (
    supplyItemId: Id<"supplyItems">,
    status: PickStatus,
    requiredQuantity: number,
  ) => {
    if (!selectedPlNumber || !user) return;

    try {
      await updatePickStatus({
        projectNumber: selectedProject,
        plNumber: selectedPlNumber,
        supplyItemId,
        status,
        pickedQuantity: status === "picked" ? requiredQuantity : undefined,
        userId: user._id,
      });

      // Update local state
      setPickingMap((prev) => {
        const next = new Map(prev);
        next.set(supplyItemId, {
          supplyItemId,
          status,
          requiredQuantity,
          pickedQuantity: status === "picked" ? requiredQuantity : undefined,
        });
        return next;
      });

      toast.success(
        status === "picked"
          ? "Item marked as picked"
          : status === "unavailable"
            ? "Item marked as unavailable"
            : "Status updated",
      );
    } catch (error) {
      toast.error(`Failed to update pick status: ${error}`);
    }
  };

  // Handle partial pick with quantity
  const handleOpenPartialSheet = (
    itemId: Id<"supplyItems">,
    requiredQty: number,
  ) => {
    setSelectedItemId(itemId);
    setPartialQuantity(String(requiredQty));
    setPickNotes("");
    setPartialSheetOpen(true);
  };

  const handleSavePartialPick = async () => {
    if (!selectedItemId || !selectedPlNumber || !user) return;

    const qty = parseInt(partialQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const item = pickList?.find((i) => i.supplyItemId === selectedItemId);
    if (!item) return;

    if (qty >= item.requiredQuantity) {
      toast.error(
        "Partial quantity must be less than required quantity. Use 'Picked' instead.",
      );
      return;
    }

    try {
      await updatePickStatus({
        projectNumber: selectedProject,
        plNumber: selectedPlNumber,
        supplyItemId: selectedItemId,
        status: "partial",
        pickedQuantity: qty,
        userId: user._id,
        notes: pickNotes || undefined,
      });

      // Update local state
      setPickingMap((prev) => {
        const next = new Map(prev);
        next.set(selectedItemId, {
          supplyItemId: selectedItemId,
          status: "partial",
          requiredQuantity: item.requiredQuantity,
          pickedQuantity: qty,
          notes: pickNotes || undefined,
        });
        return next;
      });

      toast.success(
        `Partial pick recorded: ${qty} of ${item.requiredQuantity}`,
      );
      setPartialSheetOpen(false);
      setSelectedItemId(null);
      setPartialQuantity("");
      setPickNotes("");
    } catch (error) {
      toast.error(`Failed to record partial pick: ${error}`);
    }
  };

  // Determine current status for item (from DB or local state)
  const getItemStatus = (
    itemId: Id<"supplyItems">,
    dbStatus?: PickStatus,
  ): PickStatus => {
    const localItem = pickingMap.get(itemId);
    return localItem ? localItem.status : dbStatus || "pending";
  };

  const getItemPickedQty = (
    itemId: Id<"supplyItems">,
    dbQty?: number,
  ): number | undefined => {
    const localItem = pickingMap.get(itemId);
    return localItem ? localItem.pickedQuantity : dbQty;
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: PickStatus }) => {
    switch (status) {
      case "picked":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Picked
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="default" className="bg-blue-500">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Partial
          </Badge>
        );
      case "unavailable":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Unavailable
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Package className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  // Calculate progress percentage
  const progressPercent = kitReadiness?.percentComplete || 0;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Parts Picking</h1>
            <p className="text-sm text-muted-foreground">
              Project {selectedProject} • {user?.name || "User"}
            </p>
          </div>
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>

      {/* Work Package Selector */}
      <div className="border-b bg-muted/50 px-4 py-4">
        <Label htmlFor="plNumber" className="text-sm font-medium">
          Work Package (plNumber)
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="plNumber"
            type="text"
            placeholder="Enter work package number..."
            value={plNumberInput}
            onChange={(e) => setPlNumberInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSelectPlNumber();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSelectPlNumber} size="lg">
            Load
          </Button>
        </div>
        {filterOptions && filterOptions.plNumbers.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Available: {filterOptions.plNumbers.slice(0, 5).join(", ")}
            {filterOptions.plNumbers.length > 5 &&
              ` (+${filterOptions.plNumbers.length - 5} more)`}
          </div>
        )}
      </div>

      {/* Progress Section */}
      {selectedPlNumber && kitReadiness && (
        <div className="border-b bg-background px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Picking Progress</span>
            <div className="flex gap-2">
              <Badge variant="outline">
                {kitReadiness.pickedItems} / {kitReadiness.totalItems} items
              </Badge>
              <Badge
                variant={
                  kitReadiness.status === "complete"
                    ? "default"
                    : kitReadiness.status === "partial"
                      ? "secondary"
                      : "outline"
                }
                className={
                  kitReadiness.status === "complete" ? "bg-green-500" : ""
                }
              >
                {kitReadiness.status === "complete"
                  ? "Complete"
                  : kitReadiness.status === "partial"
                    ? "Partial"
                    : "Not Started"}
              </Badge>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="mt-2 text-xs text-muted-foreground">
            {progressPercent.toFixed(0)}% by quantity
          </div>
        </div>
      )}

      {/* Pick List */}
      <ScrollArea className="flex-1 px-4">
        {!selectedPlNumber && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Package className="mx-auto mb-2 h-12 w-12" />
              <p>Select a work package to view pick list</p>
            </div>
          </div>
        )}

        {selectedPlNumber && !pickList && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Loading pick list...</p>
            </div>
          </div>
        )}

        {selectedPlNumber && pickList && pickList.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Package className="mx-auto mb-2 h-12 w-12" />
              <p>No items in this work package</p>
            </div>
          </div>
        )}

        {selectedPlNumber && pickList && pickList.length > 0 && (
          <div className="space-y-3 py-4">
            {pickList.map((item) => {
              const currentStatus = getItemStatus(
                item.supplyItemId,
                item.status,
              );
              const pickedQty = getItemPickedQty(
                item.supplyItemId,
                item.pickedQuantity,
              );

              return (
                <Card
                  key={item.supplyItemId}
                  className="p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold">
                          {item.itemNumber}
                        </span>
                        <StatusBadge status={currentStatus} />
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
                      <span className="font-semibold">
                        {item.requiredQuantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Case:</span>{" "}
                      <span className="font-medium">
                        {item.caseNumber || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {item.caseLocation || "No location"}
                      </span>
                    </div>
                  </div>

                  {currentStatus === "partial" && pickedQty && (
                    <div className="mb-3 rounded-md bg-blue-50 p-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Picked {pickedQty} of {item.requiredQuantity}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {currentStatus === "pending" && (
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() =>
                          handleUpdateStatus(
                            item.supplyItemId,
                            "picked",
                            item.requiredQuantity,
                          )
                        }
                        variant="default"
                        className="h-14 bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Picked
                      </Button>
                      <Button
                        onClick={() =>
                          handleOpenPartialSheet(
                            item.supplyItemId,
                            item.requiredQuantity,
                          )
                        }
                        variant="default"
                        className="h-14 bg-blue-500 hover:bg-blue-600"
                      >
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        Partial
                      </Button>
                      <Button
                        onClick={() =>
                          handleUpdateStatus(
                            item.supplyItemId,
                            "unavailable",
                            item.requiredQuantity,
                          )
                        }
                        variant="secondary"
                        className="h-14"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Unavailable
                      </Button>
                    </div>
                  )}

                  {currentStatus !== "pending" && (
                    <Button
                      onClick={() => {
                        // Clear local state so item shows as pending again
                        setPickingMap((prev) => {
                          const next = new Map(prev);
                          next.delete(item.supplyItemId);
                          return next;
                        });
                      }}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      Update Status
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Partial Quantity Sheet */}
      <Sheet open={partialSheetOpen} onOpenChange={setPartialSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Partial Pick</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="partialQty">Picked Quantity</Label>
              <Input
                id="partialQty"
                type="number"
                min="1"
                value={partialQuantity}
                onChange={(e) => setPartialQuantity(e.target.value)}
                placeholder="Enter quantity picked..."
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter the actual quantity picked (less than required)
              </p>
            </div>
            <div>
              <Label htmlFor="pickNotes">Notes (Optional)</Label>
              <Textarea
                id="pickNotes"
                value={pickNotes}
                onChange={(e) => setPickNotes(e.target.value)}
                placeholder="Add notes about the partial pick..."
                className="mt-1"
                rows={4}
              />
            </div>
            <Button
              onClick={handleSavePartialPick}
              className="w-full"
              size="lg"
            >
              Save Partial Pick
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
