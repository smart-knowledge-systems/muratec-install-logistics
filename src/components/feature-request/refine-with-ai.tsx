"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, ChevronDown, ChevronRight } from "lucide-react";

interface RefineWithAiProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  prompts?: Array<{ content: string; createdAt: number }>;
}

export function RefineWithAi({
  onSubmit,
  disabled = false,
  prompts = [],
}: RefineWithAiProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get refinement prompts (exclude the first one which is the original description)
  const refinementPrompts = prompts.slice(1);
  const hasHistory = refinementPrompts.length > 0;

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

      {hasHistory && (
        <div className="space-y-2">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isHistoryOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Previous refinements ({refinementPrompts.length})</span>
          </button>

          {isHistoryOpen && (
            <div className="space-y-2 pl-6">
              {refinementPrompts
                .slice()
                .reverse()
                .map((p, idx) => (
                  <div
                    key={idx}
                    className="text-sm p-3 rounded-md bg-background border"
                  >
                    <div className="text-muted-foreground text-xs mb-1">
                      {formatTimestamp(p.createdAt)}
                    </div>
                    <div className="text-foreground whitespace-pre-wrap">
                      {p.content}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

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
