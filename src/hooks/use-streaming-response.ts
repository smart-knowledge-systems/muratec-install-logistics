"use client";

import { useCompletion } from "@ai-sdk/react";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import {
  parseAIResponse,
  type ParsedAIResponse,
} from "@/lib/ai/parse-ai-response";

interface DebugMetrics {
  chunkCount: number;
  bytesReceived: number;
  elapsedMs: number | null;
}

export function useStreamingResponse() {
  const startTimeRef = useRef<number | null>(null);
  const previousCompletionRef = useRef("");
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    chunkCount: 0,
    bytesReceived: 0,
    elapsedMs: null,
  });

  const { completion, complete, isLoading, error, stop, setCompletion } =
    useCompletion({
      api: "/api/ai/generate-prd",
      onFinish: () => {
        // Stream completed - finalize in finish callback
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          setDebugMetrics((prev) => {
            console.log(
              `[StreamDebug] Stream completed in ${elapsed}ms - Total chunks: ${prev.chunkCount}, Total bytes: ${prev.bytesReceived}`,
            );
            return { ...prev, elapsedMs: elapsed };
          });
          startTimeRef.current = null;
        }
      },
    });

  // Track chunk updates when completion changes
  useEffect(() => {
    if (completion && completion !== previousCompletionRef.current) {
      // New chunk received
      const newContent = completion.slice(previousCompletionRef.current.length);
      const chunkBytes = new TextEncoder().encode(newContent).length;

      setDebugMetrics((prev) => {
        const newCount = prev.chunkCount + 1;
        console.log(
          `[StreamDebug] Chunk ${newCount}: ${chunkBytes} bytes at`,
          new Date().toISOString(),
        );
        return {
          ...prev,
          chunkCount: newCount,
          bytesReceived: prev.bytesReceived + chunkBytes,
        };
      });

      previousCompletionRef.current = completion;
    }
  }, [completion]);

  // Update elapsed time during streaming using an interval
  useEffect(() => {
    if (!isLoading || !startTimeRef.current) return;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setDebugMetrics((prev) => ({
          ...prev,
          elapsedMs: Date.now() - startTimeRef.current!,
        }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  const parsedResponse = useMemo<ParsedAIResponse>(() => {
    if (!completion) {
      return {
        prd: null,
        userStories: [],
        isPrdComplete: false,
        isStoriesComplete: false,
        parseError: null,
      };
    }
    const parsed = parseAIResponse(completion);

    // Log parsing results
    console.log(
      `[StreamDebug] Parsing: isPrdComplete=${parsed.isPrdComplete}, isStoriesComplete=${parsed.isStoriesComplete}`,
    );

    return parsed;
  }, [completion]);

  const handleSubmit = useCallback(
    async (description: string) => {
      // Initialize debug metrics before starting the stream (user-initiated action)
      startTimeRef.current = Date.now();
      previousCompletionRef.current = "";
      setDebugMetrics({ chunkCount: 0, bytesReceived: 0, elapsedMs: 0 });
      console.log("[StreamDebug] Stream started at", new Date().toISOString());
      console.log("[StreamDebug] State transition: input -> generating");
      await complete(description, {
        body: { description },
      });
    },
    [complete],
  );

  const reset = useCallback(() => {
    console.log("[StreamDebug] Resetting stream state");
    setCompletion("");
    startTimeRef.current = null;
    previousCompletionRef.current = "";
    setDebugMetrics({ chunkCount: 0, bytesReceived: 0, elapsedMs: null });
  }, [setCompletion]);

  const isComplete =
    parsedResponse.isPrdComplete && parsedResponse.isStoriesComplete;

  // Log state transition to review when complete
  useEffect(() => {
    if (isComplete && !isLoading) {
      console.log("[StreamDebug] State transition: generating → review");
    }
  }, [isComplete, isLoading]);

  return {
    completion,
    handleSubmit,
    isLoading,
    error,
    stop,
    reset,
    parsedResponse,
    isComplete,
    // Debug metrics
    chunkCount: debugMetrics.chunkCount,
    bytesReceived: debugMetrics.bytesReceived,
    elapsedMs: debugMetrics.elapsedMs,
  };
}
