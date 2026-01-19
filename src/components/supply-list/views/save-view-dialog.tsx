"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Id } from "@/convex/_generated/dataModel";
import type { FilterState } from "../filters/filter-sidebar";

interface SaveViewDialogProps {
  userId: Id<"users">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: FilterState;
  currentColumns: string[];
  currentSortBy?: string;
  currentSortOrder?: "asc" | "desc";
  onSaved?: (viewId: Id<"savedViews">) => void;
}

export function SaveViewDialog({
  userId,
  open,
  onOpenChange,
  currentFilters,
  currentColumns,
  currentSortBy,
  currentSortOrder,
  onSaved,
}: SaveViewDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createSavedView = useMutation(api.savedViews.createSavedView);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const viewId = await createSavedView({
        name: name.trim(),
        description: description.trim() || undefined,
        createdBy: userId,
        isShared,
        filters: {
          projectNumber: currentFilters.projectNumber,
          pwbs:
            currentFilters.pwbs.length > 0 ? currentFilters.pwbs : undefined,
          caseNumbers:
            currentFilters.caseNumbers.length > 0
              ? currentFilters.caseNumbers
              : undefined,
          palletNumbers:
            currentFilters.palletNumbers.length > 0
              ? currentFilters.palletNumbers
              : undefined,
          plNumbers:
            currentFilters.plNumbers.length > 0
              ? currentFilters.plNumbers
              : undefined,
        },
        columns: currentColumns,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
      });

      onSaved?.(viewId);
      onOpenChange(false);

      // Reset form
      setName("");
      setDescription("");
      setIsShared(false);
    } catch (error) {
      console.error("Failed to save view:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setName("");
    setDescription("");
    setIsShared(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Current View</DialogTitle>
          <DialogDescription>
            Save your current filters and column configuration as a named view
            for quick access.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="view-name">View Name *</Label>
            <Input
              id="view-name"
              placeholder="e.g., My Installation Schedule"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="view-description">Description (optional)</Label>
            <Input
              id="view-description"
              placeholder="Describe what this view is for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-shared"
              checked={isShared}
              onCheckedChange={(checked) => setIsShared(checked === true)}
            />
            <Label
              htmlFor="is-shared"
              className="text-sm font-normal cursor-pointer"
            >
              Share this view with my team
            </Label>
          </div>

          {/* Show current filters summary */}
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="font-medium mb-1">Current Configuration:</div>
            <div className="text-muted-foreground space-y-1">
              {currentFilters.projectNumber && (
                <div>• Project: {currentFilters.projectNumber}</div>
              )}
              {currentFilters.pwbs.length > 0 && (
                <div>• PWBS filters: {currentFilters.pwbs.length}</div>
              )}
              {currentFilters.caseNumbers.length > 0 && (
                <div>• Case filters: {currentFilters.caseNumbers.length}</div>
              )}
              {currentFilters.palletNumbers.length > 0 && (
                <div>
                  • Pallet filters: {currentFilters.palletNumbers.length}
                </div>
              )}
              {currentFilters.plNumbers.length > 0 && (
                <div>
                  • Work package filters: {currentFilters.plNumbers.length}
                </div>
              )}
              {currentSortBy && (
                <div>
                  • Sort: {currentSortBy} ({currentSortOrder})
                </div>
              )}
              {!currentFilters.projectNumber &&
                currentFilters.pwbs.length === 0 &&
                currentFilters.caseNumbers.length === 0 &&
                currentFilters.palletNumbers.length === 0 &&
                currentFilters.plNumbers.length === 0 &&
                !currentSortBy && <div>• No filters or sorting applied</div>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? "Saving..." : "Save View"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
