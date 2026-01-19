"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
import { formatDate } from "@/lib/utils";

interface MilestoneDateDialogProps {
  shipmentId: Id<"shipments">;
  milestone: string;
  currentDate?: number;
  onClose: () => void;
}

const MILESTONE_LABELS: Record<string, string> = {
  factoryOutDate: "Factory Out Date",
  etd: "Estimated Time of Departure (ETD)",
  atd: "Actual Time of Departure (ATD)",
  eta: "Estimated Time of Arrival (ETA)",
  ata: "Actual Time of Arrival (ATA)",
  customsClearedDate: "Customs Cleared Date",
  deliveredDate: "Delivered Date",
};

export function MilestoneDateDialog({
  shipmentId,
  milestone,
  currentDate,
  onClose,
}: MilestoneDateDialogProps) {
  const updateMilestone = useMutation(api.shipments.updateShipmentMilestone);

  // Initialize with current date or today
  const initialDate = currentDate ? new Date(currentDate) : new Date();
  const [selectedDate, setSelectedDate] = useState(
    initialDate.toISOString().split("T")[0],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedDate) return;

    setIsSubmitting(true);
    try {
      const dateTimestamp = new Date(selectedDate).getTime();
      await updateMilestone({
        id: shipmentId,
        milestone: milestone as
          | "factoryOutDate"
          | "etd"
          | "atd"
          | "eta"
          | "ata"
          | "customsClearedDate"
          | "deliveredDate",
        date: dateTimestamp,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update milestone:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Update {MILESTONE_LABELS[milestone] || milestone}
          </DialogTitle>
          <DialogDescription>
            {currentDate
              ? `Current date: ${formatDate(new Date(currentDate))}`
              : "No date currently set"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label
            htmlFor="milestone-date"
            className="text-sm font-medium mb-2 block"
          >
            Select Date
          </label>
          <Input
            id="milestone-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedDate}
          >
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
