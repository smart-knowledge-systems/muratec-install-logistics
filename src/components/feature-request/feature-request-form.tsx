"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { useStreamingResponse } from "@/hooks/use-streaming-response";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useAutoSave } from "@/hooks/use-auto-save";
import { type UserStory } from "@/lib/ai/parse-ai-response";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { StreamingDisplay } from "./streaming-display";
import { PrdEditor } from "./prd-editor";
import { UserStoriesEditor } from "./user-stories-editor";
import { SubmitButton } from "./submit-button";
import { DebugPanel } from "./debug-panel";
import { RefineWithAi } from "./refine-with-ai";
import { Loader2 } from "lucide-react";

type Step = "input" | "generating" | "review";

export function FeatureRequestForm() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [editedPrd, setEditedPrd] = useState<string | null>(null);
  const [editedStories, setEditedStories] = useState<UserStory[] | null>(null);
  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);

  const submitFeatureRequest = useMutation(api.featureRequests.submit);
  const updatePrdContent = useMutation(api.featureRequests.update);
  const incrementEventCount = useMutation(api.analytics.incrementEventCount);

  const {
    completion,
    handleSubmit,
    handleRefineSubmit: handleRefineStreamingSubmit,
    isLoading,
    error,
    stop,
    reset,
    parsedResponse,
    isComplete,
    chunkCount,
    bytesReceived,
    elapsedMs,
    documentId,
  } = useStreamingResponse();

  // Fetch feature request from Convex when documentId is available
  const featureRequest = useQuery(
    api.featureRequests.get,
    documentId ? { id: documentId } : "skip",
  );

  // Derive the current PRD and stories values:
  // - If user has made edits (editedPrd/editedStories not null), use their edits
  // - Otherwise, use Convex data if available, or fallback to parsed response
  const prdValue =
    editedPrd ?? featureRequest?.prdContent ?? parsedResponse.prd ?? "";
  const storiesValue =
    editedStories ?? featureRequest?.userStories ?? parsedResponse.userStories;

  // Determine if editing should be disabled based on status
  const isEditingDisabled =
    featureRequest?.status !== "draft" &&
    featureRequest?.status !== "in_review";

  // Auto-save PRD edits with debounce
  const { saveStatus: prdSaveStatus, saveNow: savePrdNow } = useAutoSave({
    value: prdValue,
    onSave: async (newPrdContent) => {
      if (!documentId) return;
      await updatePrdContent({
        id: documentId,
        prdContent: newPrdContent,
      });
    },
    delay: 500,
    enabled: step === "review" && !!documentId,
  });

  // Auto-save user stories edits with debounce
  const { saveStatus: storiesSaveStatus, saveNow: saveStoriesNow } =
    useAutoSave({
      value: storiesValue,
      onSave: async (newStories) => {
        if (!documentId) return;
        await updatePrdContent({
          id: documentId,
          userStories: newStories,
        });
      },
      delay: 500,
      enabled: step === "review" && !!documentId,
    });

  // Keyboard shortcut: Ctrl+Shift+D to toggle debug panel
  // Only active in development mode
  useKeyboardShortcut({
    ctrlKey: true,
    shiftKey: true,
    key: "d",
    onTrigger: () => setIsDebugPanelVisible((prev) => !prev),
    enabled: process.env.NODE_ENV === "development",
  });

  const handleGenerate = useCallback(() => {
    if (!description.trim()) {
      toast.error("Please enter a feature description");
      return;
    }
    setStep("generating");
    handleSubmit(description);
  }, [description, handleSubmit]);

  const handleGenerationComplete = useCallback(() => {
    if (parsedResponse.prd) {
      setEditedPrd(parsedResponse.prd);
    }
    if (parsedResponse.userStories.length > 0) {
      setEditedStories(parsedResponse.userStories);
    }
    setStep("review");
  }, [parsedResponse]);

  const handleBack = useCallback(() => {
    if (step === "review") {
      setStep("generating");
    } else if (step === "generating") {
      stop();
      reset();
      setStep("input");
    }
  }, [step, stop, reset]);

  const handleStartOver = useCallback(() => {
    reset();
    setDescription("");
    setEditedPrd(null);
    setEditedStories(null);
    setStep("input");
  }, [reset]);

  const handleStoryFieldEdit = useCallback(
    async (fieldType: string) => {
      if (!documentId) return;
      await incrementEventCount({
        featureRequestId: documentId,
        eventType: "story_field_edit",
        fieldType,
      });
    },
    [documentId, incrementEventCount],
  );

  const handleSubmitRequest = useCallback(async () => {
    if (!user?.email) {
      toast.error("You must be logged in to submit a feature request");
      return;
    }

    if (!documentId) {
      toast.error("No feature request to submit");
      return;
    }

    if (!prdValue.trim()) {
      toast.error("PRD content is required");
      return;
    }

    try {
      await submitFeatureRequest({
        id: documentId,
      });
      toast.success("Feature request submitted successfully!");
      handleStartOver();
    } catch (err) {
      console.error("Failed to submit feature request:", err);
      toast.error("Failed to submit feature request. Please try again.");
    }
  }, [user, documentId, prdValue, submitFeatureRequest, handleStartOver]);

  const handleRefineSubmit = useCallback(
    async (prompt: string) => {
      if (!documentId || !featureRequest) {
        toast.error("Cannot refine without a feature request");
        return;
      }

      try {
        // Clear local edits so Convex data takes over during regeneration
        setEditedPrd(null);
        setEditedStories(null);

        // Call the hook's refinement handler
        await handleRefineStreamingSubmit(
          prompt,
          documentId,
          featureRequest.prompts ?? [],
          prdValue,
          storiesValue,
        );

        toast.success("Refining your PRD...");
      } catch (err) {
        console.error("Failed to start refinement:", err);
        toast.error("Failed to start refinement. Please try again.");
      }
    },
    [
      documentId,
      featureRequest,
      handleRefineStreamingSubmit,
      prdValue,
      storiesValue,
    ],
  );

  // Input step
  if (step === "input") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>New Feature Request</CardTitle>
          <CardDescription>
            Describe the feature you want to request in natural language. Our AI
            will generate a detailed PRD and user stories for you to review and
            edit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe the feature you want to implement... Be as detailed as possible about the problem you're solving, who it's for, and any specific requirements you have."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[200px]"
          />
          <Button
            onClick={handleGenerate}
            disabled={!description.trim()}
            className="w-full"
          >
            Generate PRD & User Stories
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Generating step
  if (step === "generating") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          {isComplete && (
            <Button onClick={handleGenerationComplete}>
              Continue to Review
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <StreamingDisplay
          prd={parsedResponse.prd}
          userStories={parsedResponse.userStories}
          isPrdComplete={parsedResponse.isPrdComplete}
          isStoriesComplete={parsedResponse.isStoriesComplete}
          isLoading={isLoading}
        />

        <DebugPanel
          completion={completion}
          parsedResponse={parsedResponse}
          isLoading={isLoading}
          chunkCount={chunkCount}
          bytesReceived={bytesReceived}
          elapsedMs={elapsedMs}
          visible={isDebugPanelVisible}
        />

        {isComplete && (
          <div className="flex justify-end">
            <Button onClick={handleGenerationComplete}>
              Continue to Review
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Review step
  // Show loading state while query is pending
  if (featureRequest === undefined) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading feature request...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if we're currently regenerating
  const isRegenerating = featureRequest?.generationStatus === "generating";
  const isSubmitted = featureRequest?.submittedAt !== undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleStartOver}>
          Start Over
        </Button>
        <SubmitButton
          onSubmit={handleSubmitRequest}
          disabled={!prdValue.trim() || storiesValue.length === 0}
          isSubmitted={isSubmitted}
        />
      </div>

      <RefineWithAi
        onSubmit={handleRefineSubmit}
        prompts={featureRequest?.prompts}
        disabled={isRegenerating}
      />

      <div className={isRegenerating ? "relative" : ""}>
        {isRegenerating && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-card p-4 rounded-lg border shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Regenerating PRD and user stories...</span>
            </div>
          </div>
        )}
        <div className={isRegenerating ? "opacity-50 pointer-events-none" : ""}>
          <div className="grid gap-6 lg:grid-cols-2">
            <PrdEditor
              value={prdValue}
              onChange={setEditedPrd}
              saveStatus={prdSaveStatus}
              onBlur={savePrdNow}
            />
            <UserStoriesEditor
              stories={storiesValue}
              onChange={setEditedStories}
              saveStatus={storiesSaveStatus}
              onBlur={saveStoriesNow}
              disabled={isEditingDisabled}
              onFieldEdit={handleStoryFieldEdit}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton
          onSubmit={handleSubmitRequest}
          disabled={!prdValue.trim() || storiesValue.length === 0}
          isSubmitted={isSubmitted}
        />
      </div>
    </div>
  );
}
