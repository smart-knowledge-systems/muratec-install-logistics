"use client";

import { useCompletion } from "@ai-sdk/react";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import type { Id } from "@/convex/_generated/dataModel";
import {
  parseAIResponse,
  type ParsedAIResponse,
  type UserStory,
} from "@/lib/ai/parse-ai-response";

// Debug logging - only logs in development
const DEBUG = process.env.NODE_ENV === "development";
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log("[StreamDebug]", ...args);
};
const debugError = (...args: unknown[]) => {
  if (DEBUG) console.error("[StreamDebug]", ...args);
};

interface DebugMetrics {
  chunkCount: number;
  bytesReceived: number;
  elapsedMs: number | null;
}

export function useStreamingResponse() {
  const { user } = useAuth();
  const createDraft = useMutation(api.featureRequests.createDraft);
  const updateGeneratedContent = useMutation(
    api.featureRequests.updateGeneratedContent,
  );
  const updateGenerationStatus = useMutation(
    api.featureRequests.updateGenerationStatus,
  );
  const addPrompt = useMutation(api.featureRequests.addPrompt);
  const startTimeRef = useRef<number | null>(null);
  const previousCompletionRef = useRef("");
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    chunkCount: 0,
    bytesReceived: 0,
    elapsedMs: null,
  });
  const [documentId, setDocumentId] = useState<Id<"featureRequests"> | null>(
    null,
  );
  const currentDescriptionRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<{ prd: string; stories: string }>({
    prd: "",
    stories: "",
  });
  // Guard against duplicate createDraft calls during race conditions
  const isCreatingDraftRef = useRef(false);
  // Guard against state updates on unmounted component
  const isMountedRef = useRef(true);

  // Cleanup effect to track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { completion, complete, isLoading, error, stop, setCompletion } =
    useCompletion({
      api: "/api/ai/generate-prd",
      onFinish: () => {
        // Stream completed - finalize in finish callback
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          setDebugMetrics((prev) => {
            debugLog(
              `Stream completed in ${elapsed}ms - Total chunks: ${prev.chunkCount}, Total bytes: ${prev.bytesReceived}`,
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
        debugLog(
          `Chunk ${newCount}: ${chunkBytes} bytes at`,
          new Date().toISOString(),
        );

        // On first chunk, create the draft document
        // Use ref guard to prevent duplicate createDraft calls during race conditions
        if (
          newCount === 1 &&
          !documentId &&
          !isCreatingDraftRef.current &&
          user?.email
        ) {
          isCreatingDraftRef.current = true; // Set guard immediately (synchronous)
          const description = currentDescriptionRef.current;
          debugLog("Creating draft document on first chunk");
          createDraft({
            title: "Untitled Feature Request",
            description,
            authorId: user._id,
            authorEmail: user.email,
          })
            .then((id) => {
              debugLog("Draft created with ID:", id);
              if (isMountedRef.current) {
                setDocumentId(id);
              }
            })
            .catch((err) => {
              debugError("Failed to create draft:", err);
              isCreatingDraftRef.current = false; // Reset on error to allow retry
            });
        }

        return {
          ...prev,
          chunkCount: newCount,
          bytesReceived: prev.bytesReceived + chunkBytes,
        };
      });

      previousCompletionRef.current = completion;
    }
  }, [completion, documentId, user, createDraft]);

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
        parseWarning: null,
      };
    }
    const parsed = parseAIResponse(completion);

    // Log parsing results
    debugLog(
      `Parsing: isPrdComplete=${parsed.isPrdComplete}, isStoriesComplete=${parsed.isStoriesComplete}`,
    );

    return parsed;
  }, [completion]);

  // Debounced Convex updates when parsed content changes
  useEffect(() => {
    if (!documentId || !parsedResponse) return;

    const prdContent = parsedResponse.prd || "";
    const storiesContent = JSON.stringify(parsedResponse.userStories);

    // Check if content has changed
    const prdChanged = prdContent !== lastSavedContentRef.current.prd;
    const storiesChanged =
      storiesContent !== lastSavedContentRef.current.stories;

    if (!prdChanged && !storiesChanged) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced update
    debounceTimerRef.current = setTimeout(() => {
      const updates: {
        prdContent?: string;
        userStories?: typeof parsedResponse.userStories;
      } = {};

      if (prdChanged) {
        updates.prdContent = prdContent;
        lastSavedContentRef.current.prd = prdContent;
      }

      if (storiesChanged) {
        updates.userStories = parsedResponse.userStories;
        lastSavedContentRef.current.stories = storiesContent;
      }

      if (Object.keys(updates).length > 0) {
        debugLog("Updating Convex with:", {
          hasPrd: !!updates.prdContent,
          hasStories: !!updates.userStories,
        });
        updateGeneratedContent({
          id: documentId,
          ...updates,
        }).catch((err) => {
          debugError("Failed to update content:", err);
        });
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [documentId, parsedResponse, updateGeneratedContent]);

  const handleSubmit = useCallback(
    async (description: string) => {
      // Store description for createDraft call
      currentDescriptionRef.current = description;

      // Initialize debug metrics before starting the stream (user-initiated action)
      startTimeRef.current = Date.now();
      previousCompletionRef.current = "";
      setDebugMetrics({ chunkCount: 0, bytesReceived: 0, elapsedMs: 0 });
      setDocumentId(null); // Reset document ID for new request
      isCreatingDraftRef.current = false; // Reset draft creation guard for new request
      debugLog("Stream started at", new Date().toISOString());
      debugLog("State transition: input -> generating");
      await complete(description, {
        body: { description },
      });
    },
    [complete],
  );

  const handleRefineSubmit = useCallback(
    async (
      refinementPrompt: string,
      docId: Id<"featureRequests">,
      prompts: Array<{ content: string; createdAt: number }>,
      currentPrd: string,
      currentStories: UserStory[],
    ) => {
      try {
        // Add prompt to Convex history
        debugLog("Adding refinement prompt to Convex");
        await addPrompt({ id: docId, content: refinementPrompt });

        // Set generation status to 'generating'
        debugLog("Setting generationStatus to 'generating'");
        await updateGenerationStatus({
          id: docId,
          generationStatus: "generating",
        });

        // Store description for logging
        currentDescriptionRef.current = refinementPrompt;

        // Initialize debug metrics for refinement stream
        startTimeRef.current = Date.now();
        previousCompletionRef.current = "";
        setDebugMetrics({ chunkCount: 0, bytesReceived: 0, elapsedMs: 0 });
        debugLog("Refinement stream started at", new Date().toISOString());
        debugLog("State transition: review -> generating");

        // Call API with refinement context
        // Include the new prompt in the prompts array for the API call
        const allPrompts = [
          ...prompts,
          { content: refinementPrompt, createdAt: Date.now() },
        ];
        await complete(refinementPrompt, {
          body: {
            description: refinementPrompt,
            isRefinement: true,
            prompts: allPrompts,
            currentPrd,
            currentStories: JSON.stringify(currentStories),
          },
        });
      } catch (err) {
        debugError("Failed to start refinement:", err);
        throw err; // Re-throw to let caller handle
      }
    },
    [complete, addPrompt, updateGenerationStatus],
  );

  const reset = useCallback(() => {
    debugLog("Resetting stream state");
    setCompletion("");
    startTimeRef.current = null;
    previousCompletionRef.current = "";
    currentDescriptionRef.current = "";
    lastSavedContentRef.current = { prd: "", stories: "" };
    isCreatingDraftRef.current = false; // Reset draft creation guard
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setDebugMetrics({ chunkCount: 0, bytesReceived: 0, elapsedMs: null });
    setDocumentId(null);
  }, [setCompletion]);

  const isComplete =
    parsedResponse.isPrdComplete && parsedResponse.isStoriesComplete;

  // Log state transition to review when complete and update generation status
  useEffect(() => {
    if (isComplete && !isLoading && documentId) {
      debugLog("State transition: generating → review");
      debugLog("Setting generationStatus to 'complete'");
      updateGenerationStatus({
        id: documentId,
        generationStatus: "complete",
      })
        .then(() => {
          // Status update succeeded
        })
        .catch((err) => {
          if (isMountedRef.current) {
            debugError("Failed to update generation status:", err);
          }
        });
    }
  }, [isComplete, isLoading, documentId, updateGenerationStatus]);

  return {
    completion,
    handleSubmit,
    handleRefineSubmit,
    isLoading,
    error,
    stop,
    reset,
    parsedResponse,
    isComplete,
    documentId,
    // Debug metrics
    chunkCount: debugMetrics.chunkCount,
    bytesReceived: debugMetrics.bytesReceived,
    elapsedMs: debugMetrics.elapsedMs,
  };
}
