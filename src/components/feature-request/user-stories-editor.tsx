"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Check, AlertCircle } from "lucide-react";
import type { UserStory } from "@/lib/ai/parse-ai-response";
import type { SaveStatus } from "@/hooks/use-auto-save";

interface UserStoriesEditorProps {
  stories: UserStory[];
  onChange: (stories: UserStory[]) => void;
  saveStatus?: SaveStatus;
  onBlur?: () => void;
}

const priorityOptions: UserStory["priority"][] = ["high", "medium", "low"];
const effortOptions: NonNullable<UserStory["estimatedEffort"]>[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
];

export function UserStoriesEditor({
  stories,
  onChange,
  saveStatus = "idle",
  onBlur,
}: UserStoriesEditorProps) {
  const [activeTab, setActiveTab] = useState<"cards" | "json">("cards");
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
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

  const removeStory = useCallback(
    (id: string) => {
      onChange(stories.filter((s) => s.id !== id));
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
    setEditingStory(newStory);
  }, [stories, onChange]);

  const saveEditingStory = useCallback(() => {
    if (editingStory) {
      updateStory(editingStory.id, editingStory);
      setEditingStory(null);
      onBlur?.();
    }
  }, [editingStory, updateStory, onBlur]);

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
          <Button size="sm" onClick={addStory}>
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
                {stories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onEdit={() => setEditingStory({ ...story })}
                    onRemove={() => removeStory(story.id)}
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
              />
              {jsonError && (
                <p className="text-sm text-destructive">{jsonError}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog
          open={editingStory !== null}
          onOpenChange={(open) => !open && setEditingStory(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User Story</DialogTitle>
            </DialogHeader>
            {editingStory && (
              <StoryForm
                story={editingStory}
                onChange={setEditingStory}
                onSave={saveEditingStory}
                onCancel={() => setEditingStory(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface StoryCardProps {
  story: UserStory;
  onEdit: () => void;
  onRemove: () => void;
}

function StoryCard({ story, onEdit, onRemove }: StoryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
      <h4 className="font-medium">{story.title}</h4>
      <p className="text-sm text-muted-foreground">
        As a <span className="font-medium">{story.asA || "..."}</span>, I want{" "}
        <span className="font-medium">{story.iWant || "..."}</span>, so that{" "}
        <span className="font-medium">{story.soThat || "..."}</span>.
      </p>
      {story.acceptanceCriteria.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-muted-foreground mb-1">
            Acceptance Criteria ({story.acceptanceCriteria.length}):
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {story.acceptanceCriteria.slice(0, 3).map((criterion, index) => (
              <li key={index} className="truncate">
                {criterion}
              </li>
            ))}
            {story.acceptanceCriteria.length > 3 && (
              <li className="text-xs">
                +{story.acceptanceCriteria.length - 3} more...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface StoryFormProps {
  story: UserStory;
  onChange: (story: UserStory) => void;
  onSave: () => void;
  onCancel: () => void;
}

function StoryForm({ story, onChange, onSave, onCancel }: StoryFormProps) {
  const updateField = <K extends keyof UserStory>(
    field: K,
    value: UserStory[K],
  ) => {
    onChange({ ...story, [field]: value });
  };

  const updateCriterion = (index: number, value: string) => {
    const newCriteria = [...story.acceptanceCriteria];
    newCriteria[index] = value;
    updateField("acceptanceCriteria", newCriteria);
  };

  const addCriterion = () => {
    updateField("acceptanceCriteria", [...story.acceptanceCriteria, ""]);
  };

  const removeCriterion = (index: number) => {
    updateField(
      "acceptanceCriteria",
      story.acceptanceCriteria.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">ID</label>
          <Input
            value={story.id}
            onChange={(e) => updateField("id", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input
            value={story.title}
            onChange={(e) => updateField("title", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">As a...</label>
        <Input
          value={story.asA}
          onChange={(e) => updateField("asA", e.target.value)}
          placeholder="user role (e.g., 'logged-in user', 'admin')"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">I want...</label>
        <Textarea
          value={story.iWant}
          onChange={(e) => updateField("iWant", e.target.value)}
          placeholder="what the user wants to accomplish"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">So that...</label>
        <Textarea
          value={story.soThat}
          onChange={(e) => updateField("soThat", e.target.value)}
          placeholder="the benefit or value gained"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <div className="flex gap-2">
            {priorityOptions.map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={story.priority === p ? "default" : "outline"}
                onClick={() => updateField("priority", p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Estimated Effort</label>
          <div className="flex gap-2">
            {effortOptions.map((e) => (
              <Button
                key={e}
                type="button"
                size="sm"
                variant={story.estimatedEffort === e ? "default" : "outline"}
                onClick={() => updateField("estimatedEffort", e)}
              >
                {e}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Acceptance Criteria</label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCriterion}
          >
            Add Criterion
          </Button>
        </div>
        <div className="space-y-2">
          {story.acceptanceCriteria.map((criterion, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={criterion}
                onChange={(e) => updateCriterion(index, e.target.value)}
                placeholder={`Criterion ${index + 1}`}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeCriterion(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          {story.acceptanceCriteria.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No acceptance criteria yet
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
