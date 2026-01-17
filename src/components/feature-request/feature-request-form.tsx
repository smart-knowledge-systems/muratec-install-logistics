"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { useStreamingResponse } from "@/hooks/use-streaming-response";
import {
  extractTitleFromPrd,
  type UserStory,
} from "@/lib/ai/parse-ai-response";
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

type Step = "input" | "generating" | "review";

export function FeatureRequestForm() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [editedPrd, setEditedPrd] = useState("");
  const [editedStories, setEditedStories] = useState<UserStory[]>([]);

  const createFeatureRequest = useMutation(api.featureRequests.create);

  const {
    handleSubmit,
    isLoading,
    error,
    stop,
    reset,
    parsedResponse,
    isComplete,
  } = useStreamingResponse();

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
    setEditedPrd("");
    setEditedStories([]);
    setStep("input");
  }, [reset]);

  const handleSubmitRequest = useCallback(async () => {
    if (!user?.email) {
      toast.error("You must be logged in to submit a feature request");
      return;
    }

    if (!editedPrd.trim()) {
      toast.error("PRD content is required");
      return;
    }

    try {
      const title = extractTitleFromPrd(editedPrd);
      await createFeatureRequest({
        title,
        description,
        prdContent: editedPrd,
        userStories: editedStories,
        authorEmail: user.email,
      });
      toast.success("Feature request submitted successfully!");
      handleStartOver();
    } catch (err) {
      console.error("Failed to submit feature request:", err);
      toast.error("Failed to submit feature request. Please try again.");
    }
  }, [
    user,
    editedPrd,
    editedStories,
    description,
    createFeatureRequest,
    handleStartOver,
  ]);

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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleStartOver}>
          Start Over
        </Button>
        <SubmitButton
          onSubmit={handleSubmitRequest}
          disabled={!editedPrd.trim() || editedStories.length === 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PrdEditor value={editedPrd} onChange={setEditedPrd} />
        <UserStoriesEditor
          stories={editedStories}
          onChange={setEditedStories}
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton
          onSubmit={handleSubmitRequest}
          disabled={!editedPrd.trim() || editedStories.length === 0}
        />
      </div>
    </div>
  );
}
