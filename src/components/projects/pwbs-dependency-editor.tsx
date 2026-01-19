"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface PwbsDependencyEditorProps {
  projectNumber?: string;
}

type DependencyType = "finish_to_start" | "start_to_start" | "none";

interface Dependency {
  _id: string;
  fromPwbs: string;
  toPwbs: string;
  dependencyType: DependencyType;
  isDefault: boolean;
  projectNumber?: string;
}

export function PwbsDependencyEditor({
  projectNumber,
}: PwbsDependencyEditorProps) {
  const [isDefaultMode, setIsDefaultMode] = useState(!projectNumber);
  const [selectedFromPwbs, setSelectedFromPwbs] = useState<string | null>(null);
  const [selectedToPwbs, setSelectedToPwbs] = useState<string | null>(null);
  const [selectedDepType, setSelectedDepType] =
    useState<DependencyType>("finish_to_start");

  // Queries
  const pwbsCategories = useQuery(api.pwbsCategories.getAllCategories);
  const dependencies = useQuery(
    api.pwbsDependencies.getDependencies,
    isDefaultMode ? {} : projectNumber ? { projectNumber } : "skip",
  );
  const _defaultDependencies = useQuery(
    api.pwbsDependencies.getDefaultDependencies,
  );
  const projectOverrides = useQuery(
    api.pwbsDependencies.getProjectOverrides,
    projectNumber && !isDefaultMode ? { projectNumber } : "skip",
  );

  // Mutations
  const setDefaultDependency = useMutation(
    api.pwbsDependencies.setDefaultDependency,
  );
  const setProjectDependency = useMutation(
    api.pwbsDependencies.setProjectDependency,
  );
  const removeDefaultDependency = useMutation(
    api.pwbsDependencies.removeDefaultDependency,
  );
  const removeProjectDependency = useMutation(
    api.pwbsDependencies.removeProjectDependency,
  );

  const handleAddDependency = async () => {
    if (!selectedFromPwbs || !selectedToPwbs) {
      toast.error("Please select both 'from' and 'to' PWBS categories");
      return;
    }

    if (selectedFromPwbs === selectedToPwbs) {
      toast.error("Cannot create a dependency from a category to itself");
      return;
    }

    try {
      if (isDefaultMode) {
        await setDefaultDependency({
          fromPwbs: selectedFromPwbs,
          toPwbs: selectedToPwbs,
          dependencyType: selectedDepType,
        });
        toast.success("Default dependency saved");
      } else if (projectNumber) {
        await setProjectDependency({
          projectNumber,
          fromPwbs: selectedFromPwbs,
          toPwbs: selectedToPwbs,
          dependencyType: selectedDepType,
        });
        toast.success("Project dependency saved");
      }

      // Reset selection
      setSelectedFromPwbs(null);
      setSelectedToPwbs(null);
      setSelectedDepType("finish_to_start");
    } catch (error) {
      toast.error("Failed to save dependency");
      console.error(error);
    }
  };

  const handleRemoveDependency = async (dep: Dependency) => {
    try {
      if (dep.isDefault) {
        await removeDefaultDependency({
          fromPwbs: dep.fromPwbs,
          toPwbs: dep.toPwbs,
        });
        toast.success("Default dependency removed");
      } else if (projectNumber) {
        await removeProjectDependency({
          projectNumber,
          fromPwbs: dep.fromPwbs,
          toPwbs: dep.toPwbs,
        });
        toast.success("Project dependency removed");
      }
    } catch (error) {
      toast.error("Failed to remove dependency");
      console.error(error);
    }
  };

  const getDependencyTypeLabel = (type: DependencyType) => {
    switch (type) {
      case "finish_to_start":
        return "Finish-to-Start";
      case "start_to_start":
        return "Start-to-Start";
      case "none":
        return "Parallel";
      default:
        return type;
    }
  };

  const getDependencyTypeIcon = (type: DependencyType) => {
    switch (type) {
      case "finish_to_start":
        return <ArrowRight className="h-4 w-4" />;
      case "start_to_start":
        return <ArrowRight className="h-4 w-4" />;
      case "none":
        return <Minus className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  // Group dependencies by category
  const groupedDependencies = useMemo(() => {
    if (!dependencies) return {};

    const grouped: Record<string, Dependency[]> = {};
    for (const dep of dependencies) {
      if (!grouped[dep.fromPwbs]) {
        grouped[dep.fromPwbs] = [];
      }
      grouped[dep.fromPwbs].push(dep as Dependency);
    }
    return grouped;
  }, [dependencies]);

  const isOverridden = (fromPwbs: string, toPwbs: string) => {
    if (!projectOverrides) return false;
    return projectOverrides.some(
      (dep) => dep.fromPwbs === fromPwbs && dep.toPwbs === toPwbs,
    );
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      {projectNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dependency Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="mode-switch"
                checked={!isDefaultMode}
                onCheckedChange={(checked) => setIsDefaultMode(!checked)}
              />
              <Label htmlFor="mode-switch">
                {isDefaultMode
                  ? "Editing Default Dependencies"
                  : "Editing Project-Specific Dependencies"}
              </Label>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isDefaultMode
                ? "Default dependencies apply to all projects unless overridden."
                : `Project-specific dependencies override defaults for project ${projectNumber}.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Dependency Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Dependency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>From PWBS</Label>
              <Select
                value={selectedFromPwbs || ""}
                onValueChange={setSelectedFromPwbs}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {pwbsCategories?.map((cat) => (
                    <SelectItem key={cat._id} value={cat.code}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To PWBS</Label>
              <Select
                value={selectedToPwbs || ""}
                onValueChange={setSelectedToPwbs}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {pwbsCategories?.map((cat) => (
                    <SelectItem key={cat._id} value={cat.code}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dependency Type</Label>
              <Select
                value={selectedDepType}
                onValueChange={(v) => setSelectedDepType(v as DependencyType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finish_to_start">
                    Finish-to-Start
                  </SelectItem>
                  <SelectItem value="start_to_start">Start-to-Start</SelectItem>
                  <SelectItem value="none">Parallel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="mt-4" onClick={handleAddDependency}>
            <Plus className="mr-2 h-4 w-4" />
            Add Dependency
          </Button>
        </CardContent>
      </Card>

      {/* Existing Dependencies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isDefaultMode ? "Default Dependencies" : "Current Dependencies"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!dependencies || dependencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dependencies defined. Add dependencies above to establish
              installation order.
            </p>
          ) : (
            <div className="space-y-4">
              {pwbsCategories?.map((category) => {
                const deps = groupedDependencies[category.code];
                if (!deps || deps.length === 0) return null;

                return (
                  <div key={category._id} className="space-y-2">
                    <h3 className="font-medium text-sm">
                      {category.code} - {category.name}
                    </h3>
                    <div className="space-y-2 pl-4">
                      {deps.map((dep) => {
                        const _toCategory = pwbsCategories.find(
                          (c) => c.code === dep.toPwbs,
                        );
                        const isProjectOverride =
                          !isDefaultMode && !dep.isDefault;

                        return (
                          <div
                            key={dep._id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono">
                                  {dep.fromPwbs}
                                </span>
                                {getDependencyTypeIcon(dep.dependencyType)}
                                <span className="text-sm font-mono">
                                  {dep.toPwbs}
                                </span>
                              </div>
                              <Badge variant="outline">
                                {getDependencyTypeLabel(dep.dependencyType)}
                              </Badge>
                              {isProjectOverride && (
                                <Badge variant="secondary">
                                  Project Override
                                </Badge>
                              )}
                              {!isDefaultMode &&
                                dep.isDefault &&
                                isOverridden(dep.fromPwbs, dep.toPwbs) && (
                                  <Badge variant="secondary">Overridden</Badge>
                                )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDependency(dep)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
