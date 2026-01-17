"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SubmitButtonProps {
  onSubmit: () => Promise<void>;
  disabled?: boolean;
  isSubmitted?: boolean;
}

export function SubmitButton({
  onSubmit,
  disabled,
  isSubmitted,
}: SubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return <Button disabled>Already Submitted</Button>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Submit Feature Request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Feature Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to submit this feature request? Once
            submitted, it will be visible to the team for review.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
