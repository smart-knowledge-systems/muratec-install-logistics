"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MultiProjectTimeline } from "./multi-project-timeline";
import { useRouter } from "next/navigation";

type ProjectStatus = "planning" | "active" | "on_hold" | "complete";

interface ProjectFilters {
  customer?: string;
  site?: string;
  status?: ProjectStatus;
  startDate?: number;
  endDate?: number;
}

export function MultiProjectDashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );

  const projects = useQuery(api.projects.getProjects, filters);
  const customers = useQuery(api.projects.getCustomers);
  const sites = useQuery(api.projects.getSites);

  const handleProjectClick = (projectNumber: string) => {
    router.push(`/projects/${projectNumber}/schedule`);
  };

  const toggleProjectExpanded = (projectNumber: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectNumber)) {
        newSet.delete(projectNumber);
      } else {
        newSet.add(projectNumber);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined,
  ).length;

  if (projects === undefined) {
    return <MultiProjectDashboardSkeleton />;
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
          <p className="text-muted-foreground">
            {activeFilterCount > 0
              ? "No projects match your filters. Try adjusting them."
              : "There are no projects in the system yet."}
          </p>
          {activeFilterCount > 0 && (
            <Button onClick={clearFilters} variant="outline" className="mt-4">
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Multi-Project Dashboard</h1>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && " (filtered)"}
          </p>
        </div>

        {/* Filter Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Projects</SheetTitle>
              <SheetDescription>
                Filter the project list by customer, site, status, or date
                range.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              {/* Customer Filter */}
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select
                  value={filters.customer ?? "all"}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      customer: value === "all" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer} value={customer}>
                        {customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Site Filter */}
              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Select
                  value={filters.site ?? "all"}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      site: value === "all" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger id="site">
                    <SelectValue placeholder="All sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sites</SelectItem>
                    {sites?.map((site) => (
                      <SelectItem key={site} value={site}>
                        {site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status ?? "all"}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      status:
                        value === "all" ? undefined : (value as ProjectStatus),
                    })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={
                    filters.startDate
                      ? new Date(filters.startDate).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({
                      ...filters,
                      startDate: value ? new Date(value).getTime() : undefined,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={
                    filters.endDate
                      ? new Date(filters.endDate).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({
                      ...filters,
                      endDate: value ? new Date(value).getTime() : undefined,
                    });
                  }}
                />
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.customer && (
            <Badge variant="secondary" className="gap-1">
              Customer: {filters.customer}
              <button
                onClick={() => setFilters({ ...filters, customer: undefined })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.site && (
            <Badge variant="secondary" className="gap-1">
              Site: {filters.site}
              <button
                onClick={() => setFilters({ ...filters, site: undefined })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <button
                onClick={() => setFilters({ ...filters, status: undefined })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.startDate && (
            <Badge variant="secondary" className="gap-1">
              From: {new Date(filters.startDate).toLocaleDateString()}
              <button
                onClick={() => setFilters({ ...filters, startDate: undefined })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.endDate && (
            <Badge variant="secondary" className="gap-1">
              To: {new Date(filters.endDate).toLocaleDateString()}
              <button
                onClick={() => setFilters({ ...filters, endDate: undefined })}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Project List with Condensed Timelines */}
      <div className="space-y-4">
        {projects.map((project) => {
          const isExpanded = expandedProjects.has(project.projectNumber);
          const hasScheduleRisk = checkScheduleRisk(project);

          return (
            <Card
              key={project._id}
              className={`p-4 ${hasScheduleRisk ? "border-destructive" : ""}`}
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleProjectExpanded(project.projectNumber)}
                    className="p-0 h-6 w-6"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() =>
                          handleProjectClick(project.projectNumber)
                        }
                        className="text-lg font-semibold hover:underline text-left"
                      >
                        {project.projectName ??
                          `Project ${project.projectNumber}`}
                      </button>
                      <Badge variant={getStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                      {hasScheduleRisk && (
                        <Badge variant="destructive">Schedule Risk</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {project.customer && `${project.customer} • `}
                      {project.site && `${project.site} • `}
                      {project.completedWorkPackages} /{" "}
                      {project.totalWorkPackages} work packages complete
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleProjectClick(project.projectNumber)}
                >
                  View Details
                </Button>
              </div>

              {/* Timeline */}
              {project.plannedStart && project.plannedEnd && (
                <MultiProjectTimeline
                  project={project}
                  isExpanded={isExpanded}
                />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MultiProjectDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function getStatusVariant(
  status: ProjectStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "planning":
      return "secondary";
    case "on_hold":
      return "destructive";
    case "complete":
      return "outline";
  }
}

function checkScheduleRisk(project: {
  status: string;
  plannedEnd?: number;
  completedWorkPackages: number;
  totalWorkPackages: number;
}): boolean {
  // Check if project is behind schedule
  if (project.status !== "active") return false;
  if (!project.plannedEnd) return false;

  const now = Date.now();
  const projectEnd = project.plannedEnd;
  const totalDuration = projectEnd - now;

  // If we're past the end date, it's a risk
  if (totalDuration < 0) return true;

  // Calculate expected completion percentage based on time elapsed
  const completionPercentage =
    project.completedWorkPackages / project.totalWorkPackages;

  // If we're less than 80% complete with less than 20% of time remaining, flag as risk
  if (completionPercentage < 0.8 && totalDuration < (projectEnd - now) * 0.2) {
    return true;
  }

  return false;
}
