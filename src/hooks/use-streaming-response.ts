"use client";

import { useCompletion } from "@ai-sdk/react";
import { useCallback, useMemo, useRef, useEffect } from "react";
import {
  parseAIResponse,
  type ParsedAIResponse,
} from "@/lib/ai/parse-ai-response";

export function useStreamingResponse() {
  const startTimeRef = useRef<number | null>(null);
  const chunkCountRef = useRef(0);
  const bytesReceivedRef = useRef(0);
  const previousCompletionRef = useRef("");

  const { completion, complete, isLoading, error, stop, setCompletion } =
    useCompletion({
      api: "/api/ai/generate-prd",
    });

  // Track chunks and log
  useEffect(() => {
    if (isLoading && !startTimeRef.current) {
      // Stream started
      startTimeRef.current = Date.now();
      chunkCountRef.current = 0;
      bytesReceivedRef.current = 0;
      console.log("[StreamDebug] Stream started at", new Date().toISOString());
    }

    if (completion && completion !== previousCompletionRef.current) {
      // New chunk received
      const newContent = completion.slice(previousCompletionRef.current.length);
      const chunkBytes = new TextEncoder().encode(newContent).length;

      chunkCountRef.current++;
      bytesReceivedRef.current += chunkBytes;

      console.log(
        `[StreamDebug] Chunk ${chunkCountRef.current}: ${chunkBytes} bytes at`,
        new Date().toISOString(),
      );

      previousCompletionRef.current = completion;
    }

    if (!isLoading && startTimeRef.current && completion) {
      // Stream completed
      const elapsed = Date.now() - startTimeRef.current;
      console.log(
        `[StreamDebug] Stream completed in ${elapsed}ms - Total chunks: ${chunkCountRef.current}, Total bytes: ${bytesReceivedRef.current}`,
      );
      startTimeRef.current = null;
    }
  }, [completion, isLoading]);

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
      console.log("[StreamDebug] State transition: input → generating");
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
    chunkCountRef.current = 0;
    bytesReceivedRef.current = 0;
    previousCompletionRef.current = "";
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
  };
}
