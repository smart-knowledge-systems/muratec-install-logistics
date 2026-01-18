"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import type { UserStory } from "@/lib/ai/parse-ai-response";

interface CollapsibleStoryCardProps {
  story: UserStory;
  defaultExpanded?: boolean;
  onChange?: (updatedStory: UserStory) => void;
  disabled?: boolean;
  onFieldEdit?: (fieldType: string) => void;
}

export function CollapsibleStoryCard({
  story,
  defaultExpanded = false,
  onChange,
  disabled = false,
  onFieldEdit,
}: CollapsibleStoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [localStory, setLocalStory] = useState(story);

  const handleFieldChange = (
    field: keyof UserStory,
    value: string | string[],
  ) => {
    const updatedStory = { ...localStory, [field]: value };
    setLocalStory(updatedStory);
    onChange?.(updatedStory);
  };

  const handleAddCriterion = () => {
    const updatedCriteria = [...localStory.acceptanceCriteria, ""];
    handleFieldChange("acceptanceCriteria", updatedCriteria);
  };

  const handleRemoveCriterion = (index: number) => {
    const updatedCriteria = localStory.acceptanceCriteria.filter(
      (_, i) => i !== index,
    );
    handleFieldChange("acceptanceCriteria", updatedCriteria);
  };

  const handleCriterionChange = (index: number, value: string) => {
    const updatedCriteria = localStory.acceptanceCriteria.map((criterion, i) =>
      i === index ? value : criterion,
    );
    handleFieldChange("acceptanceCriteria", updatedCriteria);
  };

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
            {localStory.id}
          </span>
          <Badge
            variant={
              localStory.priority === "high"
                ? "destructive"
                : localStory.priority === "medium"
                  ? "default"
                  : "secondary"
            }
          >
            {localStory.priority}
          </Badge>
          {localStory.estimatedEffort && (
            <Badge variant="outline">{localStory.estimatedEffort}</Badge>
          )}
          <h4 className="font-medium">{localStory.title}</h4>
        </div>
      </button>

      {/* Expanded Content with Form Fields */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          <div className="pt-4 space-y-4">
            {/* Title Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Title
              </label>
              <Input
                value={localStory.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                onBlur={() => onFieldEdit?.("title")}
                placeholder="Story title"
                disabled={disabled}
              />
            </div>

            {/* Priority Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Priority
              </label>
              <Select
                value={localStory.priority}
                onValueChange={(value) => {
                  handleFieldChange(
                    "priority",
                    value as "high" | "medium" | "low",
                  );
                  onFieldEdit?.("priority");
                }}
                disabled={disabled}
              >
                <SelectTrigger disabled={disabled}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Effort Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Estimated Effort
              </label>
              <Select
                value={localStory.estimatedEffort || ""}
                onValueChange={(value) => {
                  handleFieldChange(
                    "estimatedEffort",
                    value as "XS" | "S" | "M" | "L" | "XL",
                  );
                  onFieldEdit?.("estimatedEffort");
                }}
                disabled={disabled}
              >
                <SelectTrigger disabled={disabled}>
                  <SelectValue placeholder="Select effort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XS">XS</SelectItem>
                  <SelectItem value="S">S</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="XL">XL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* As A Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                As a...
              </label>
              <Textarea
                value={localStory.asA}
                onChange={(e) => handleFieldChange("asA", e.target.value)}
                onBlur={() => onFieldEdit?.("asA")}
                placeholder="user role or persona"
                rows={2}
                disabled={disabled}
              />
            </div>

            {/* I Want Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                I want...
              </label>
              <Textarea
                value={localStory.iWant}
                onChange={(e) => handleFieldChange("iWant", e.target.value)}
                onBlur={() => onFieldEdit?.("iWant")}
                placeholder="what you want to accomplish"
                rows={2}
                disabled={disabled}
              />
            </div>

            {/* So That Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                So that...
              </label>
              <Textarea
                value={localStory.soThat}
                onChange={(e) => handleFieldChange("soThat", e.target.value)}
                onBlur={() => onFieldEdit?.("soThat")}
                placeholder="the value or benefit"
                rows={2}
                disabled={disabled}
              />
            </div>

            {/* Acceptance Criteria List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">
                  Acceptance Criteria ({localStory.acceptanceCriteria.length})
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCriterion}
                  disabled={disabled}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {localStory.acceptanceCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Textarea
                      value={criterion}
                      onChange={(e) =>
                        handleCriterionChange(index, e.target.value)
                      }
                      onBlur={() => onFieldEdit?.("acceptanceCriteria")}
                      placeholder="Acceptance criterion"
                      rows={2}
                      className="flex-1"
                      disabled={disabled}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCriterion(index)}
                      className="mt-1"
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {localStory.acceptanceCriteria.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No acceptance criteria yet. Click Add to create one.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
