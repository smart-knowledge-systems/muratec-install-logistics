"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface InstallationItem {
  supplyItemId: Id<"supplyItems">;
  itemNumber: string;
  partNumber: string;
  description: string;
}

interface IssueReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InstallationItem;
  projectNumber: string;
  plNumber: string;
  userId?: Id<"users">;
}

const ISSUE_TYPES = [
  { value: "missing_part", label: "Missing Part" },
  { value: "damaged_part", label: "Damaged Part" },
  { value: "wrong_part", label: "Wrong Part" },
  { value: "site_condition", label: "Site Condition" },
  { value: "other", label: "Other" },
] as const;

export function IssueReportDialog({
  open,
  onOpenChange,
  item,
  projectNumber,
  plNumber,
  userId,
}: IssueReportDialogProps) {
  const [issueType, setIssueType] = useState<string>("");
  const [issueNotes, setIssueNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportIssue = useMutation(api.installation.reportInstallationIssue);

  const handleSubmit = async () => {
    if (!issueType) {
      toast.error("Please select an issue type");
      return;
    }

    if (!issueNotes.trim()) {
      toast.error("Please provide issue details");
      return;
    }

    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);

    try {
      await reportIssue({
        supplyItemId: item.supplyItemId,
        projectNumber,
        plNumber,
        userId,
        issueType: issueType as
          | "missing_part"
          | "damaged_part"
          | "wrong_part"
          | "site_condition"
          | "other",
        issueNotes: issueNotes.trim(),
      });

      toast.success("Issue reported", {
        description: `${item.itemNumber} marked with issue`,
      });

      // Reset form
      setIssueType("");
      setIssueNotes("");
      onOpenChange(false);
    } catch (error) {
      toast.error(`Failed to report issue: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIssueType("");
    setIssueNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Installation Issue
          </DialogTitle>
          <DialogDescription>
            Document an issue with{" "}
            <span className="font-mono font-semibold">{item.itemNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item details */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="font-semibold">{item.itemNumber}</div>
            <div className="text-xs text-muted-foreground">
              Part: {item.partNumber}
            </div>
            <div className="mt-1 text-xs">{item.description}</div>
          </div>

          {/* Issue type selector */}
          <div className="space-y-2">
            <Label htmlFor="issue-type">Issue Type *</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issue-type">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issue notes */}
          <div className="space-y-2">
            <Label htmlFor="issue-notes">Details *</Label>
            <Textarea
              id="issue-notes"
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Provide as much detail as possible to help resolve the issue
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Reporting..." : "Report Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
