"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ParsedAIResponse } from "@/lib/ai/parse-ai-response";

interface DebugPanelProps {
  completion: string;
  parsedResponse: ParsedAIResponse;
  isLoading: boolean;
  chunkCount: number;
  bytesReceived: number;
  elapsedMs: number | null;
}

export function DebugPanel({
  completion,
  parsedResponse,
  isLoading,
  chunkCount,
  bytesReceived,
  elapsedMs,
}: DebugPanelProps) {
  // Hook must be called unconditionally before any early returns
  const parsingState = useMemo(() => {
    if (!completion) return "idle";
    if (!parsedResponse.isPrdComplete)
      return "awaiting PRD_START or parsing PRD";
    if (!parsedResponse.isStoriesComplete) return "parsing USER_STORIES";
    return "complete";
  }, [completion, parsedResponse]);

  // Only render in development (after hooks are called)
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            🐛 Debug Panel
            {isLoading && (
              <Badge variant="outline" className="animate-pulse">
                Streaming
              </Badge>
            )}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatDuration(elapsedMs)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Chunks</div>
            <div className="font-mono font-semibold">{chunkCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bytes</div>
            <div className="font-mono font-semibold">
              {formatBytes(bytesReceived)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Parsing State</div>
            <div className="font-mono text-xs">{parsingState}</div>
          </div>
        </div>

        <Separator />

        {/* Parsed State */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            Parsed State
          </div>
          <div className="flex gap-2">
            <Badge
              variant={parsedResponse.isPrdComplete ? "default" : "outline"}
            >
              PRD {parsedResponse.isPrdComplete ? "✓" : "⏳"}
            </Badge>
            <Badge
              variant={parsedResponse.isStoriesComplete ? "default" : "outline"}
            >
              Stories {parsedResponse.isStoriesComplete ? "✓" : "⏳"}
            </Badge>
            {parsedResponse.parseError && (
              <Badge variant="destructive">Parse Error</Badge>
            )}
          </div>
          {parsedResponse.userStories.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {parsedResponse.userStories.length} user{" "}
              {parsedResponse.userStories.length === 1 ? "story" : "stories"}{" "}
              parsed
            </div>
          )}
        </div>

        <Separator />

        {/* Raw Stream Output */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            Raw Stream Output ({completion.length} chars)
          </div>
          <ScrollArea className="h-[300px] rounded border bg-slate-950 p-3">
            <pre className="font-mono text-xs text-slate-50">
              {completion || "(waiting for stream...)"}
            </pre>
          </ScrollArea>
        </div>

        {/* Parse Error */}
        {parsedResponse.parseError && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-destructive">
                Parse Error
              </div>
              <pre className="rounded border border-destructive bg-destructive/10 p-2 font-mono text-xs text-destructive">
                {parsedResponse.parseError}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
