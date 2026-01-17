"use client";

import { useCompletion } from "@ai-sdk/react";
import { useCallback, useMemo } from "react";
import {
  parseAIResponse,
  type ParsedAIResponse,
} from "@/lib/ai/parse-ai-response";

export function useStreamingResponse() {
  const { completion, complete, isLoading, error, stop, setCompletion } =
    useCompletion({
      api: "/api/ai/generate-prd",
    });

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
    return parseAIResponse(completion);
  }, [completion]);

  const handleSubmit = useCallback(
    async (description: string) => {
      await complete(description, {
        body: { description },
      });
    },
    [complete],
  );

  const reset = useCallback(() => {
    setCompletion("");
  }, [setCompletion]);

  return {
    completion,
    handleSubmit,
    isLoading,
    error,
    stop,
    reset,
    parsedResponse,
    isComplete:
      parsedResponse.isPrdComplete && parsedResponse.isStoriesComplete,
  };
}
