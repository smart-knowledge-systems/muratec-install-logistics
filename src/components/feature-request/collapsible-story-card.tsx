"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { UserStory } from "@/lib/ai/parse-ai-response";

interface CollapsibleStoryCardProps {
  story: UserStory;
  defaultExpanded?: boolean;
}

export function CollapsibleStoryCard({
  story,
  defaultExpanded = false,
}: CollapsibleStoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border bg-card transition-all">
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {story.id}
          </span>
          <Badge
            variant={
              story.priority === "high"
                ? "destructive"
                : story.priority === "medium"
                  ? "default"
                  : "secondary"
            }
          >
            {story.priority}
          </Badge>
          {story.estimatedEffort && (
            <Badge variant="outline">{story.estimatedEffort}</Badge>
          )}
          <h4 className="font-medium">{story.title}</h4>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          {/* Story Summary */}
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              As a <span className="font-medium">{story.asA || "..."}</span>, I
              want <span className="font-medium">{story.iWant || "..."}</span>,
              so that{" "}
              <span className="font-medium">{story.soThat || "..."}</span>.
            </p>
          </div>

          {/* Acceptance Criteria */}
          {story.acceptanceCriteria.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-2">
                Acceptance Criteria ({story.acceptanceCriteria.length}):
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {story.acceptanceCriteria.map((criterion, index) => (
                  <li key={index}>{criterion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
