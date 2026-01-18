"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check, AlertCircle } from "lucide-react";
import type { UserStory } from "@/lib/ai/parse-ai-response";
import type { SaveStatus } from "@/hooks/use-auto-save";
import { CollapsibleStoryCard } from "./collapsible-story-card";

interface UserStoriesEditorProps {
  stories: UserStory[];
  onChange: (stories: UserStory[]) => void;
  saveStatus?: SaveStatus;
  onBlur?: () => void;
  disabled?: boolean;
  onFieldEdit?: (fieldType: string) => void;
}

export function UserStoriesEditor({
  stories,
  onChange,
  saveStatus = "idle",
  onBlur,
  disabled = false,
  onFieldEdit,
}: UserStoriesEditorProps) {
  const [activeTab, setActiveTab] = useState<"cards" | "json">("cards");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = useCallback(
    (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
          onChange(parsed);
          setJsonError(null);
        } else {
          setJsonError("Must be an array of user stories");
        }
      } catch {
        setJsonError("Invalid JSON format");
      }
    },
    [onChange],
  );

  const updateStory = useCallback(
    (id: string, updates: Partial<UserStory>) => {
      onChange(stories.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    },
    [stories, onChange],
  );

  const addStory = useCallback(() => {
    const newId = `US-${String(stories.length + 1).padStart(3, "0")}`;
    const newStory: UserStory = {
      id: newId,
      title: "New User Story",
      asA: "",
      iWant: "",
      soThat: "",
      acceptanceCriteria: [],
      priority: "medium",
      estimatedEffort: "M",
    };
    onChange([...stories, newStory]);
  }, [stories, onChange]);

  const renderSaveIndicator = () => {
    if (saveStatus === "idle") return null;

    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-green-600" />
            <span className="text-green-600">Saved</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertCircle className="h-3 w-3 text-red-600" />
            <span className="text-red-600">Save failed</span>
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">User Stories</CardTitle>
        <div className="flex items-center gap-3">
          {renderSaveIndicator()}
          <Button size="sm" onClick={addStory} disabled={disabled}>
            Add Story
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "cards" | "json")}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="cards" className="flex-1 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {stories.map((story, index) => (
                  <CollapsibleStoryCard
                    key={story.id}
                    story={story}
                    defaultExpanded={index === 0}
                    onChange={(updatedStory) => {
                      updateStory(updatedStory.id, updatedStory);
                      onBlur?.();
                    }}
                    onFieldEdit={onFieldEdit}
                    disabled={disabled}
                  />
                ))}
                {stories.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No user stories yet. Click &quot;Add Story&quot; to create
                    one.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="json" className="flex-1 mt-4">
            <div className="space-y-2">
              <Textarea
                value={JSON.stringify(stories, null, 2)}
                onChange={(e) => handleJsonChange(e.target.value)}
                onBlur={onBlur}
                className="h-[460px] font-mono text-xs resize-none"
                placeholder="[]"
                disabled={disabled}
              />
              {jsonError && (
                <p className="text-sm text-destructive">{jsonError}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
