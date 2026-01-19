"use client";

import { useState } from "react";
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

interface StatusDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (date: Date) => void;
  statusLabel: string;
}

export function StatusDateDialog({
  open,
  onOpenChange,
  onConfirm,
  statusLabel,
}: StatusDateDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onOpenChange(false);
  };

  // Format date for input value (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Status Date</DialogTitle>
          <DialogDescription>
            Select the date when the shipment moved to &quot;{statusLabel}&quot;
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="status-date">Date</Label>
          <Input
            id="status-date"
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
