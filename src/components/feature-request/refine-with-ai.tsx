"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X } from "lucide-react";

interface RefineWithAiProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export function RefineWithAi({
  onSubmit,
  disabled = false,
}: RefineWithAiProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onSubmit(prompt);
    setPrompt("");
    setIsOpen(false);
  };

  const handleCancel = () => {
    setPrompt("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Refine with AI
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          <span>Refine with AI</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCancel}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Provide additional instructions to refine your PRD and user stories..."
        className="min-h-[100px] resize-none"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!prompt.trim()}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Submit
        </Button>
      </div>
    </div>
  );
}
