"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import type { EvmMetrics } from "@/convex/evm";
import type { Doc } from "@/convex/_generated/dataModel";

type ProjectStatus = "planning" | "active" | "on_hold" | "complete";
import { useRouter } from "next/navigation";

interface ProjectHealthCardProps {
  projectNumber: string;
  projectName?: string;
  spi: number;
  percentComplete: number;
  itemsRemaining: number;
  totalItems: number;
  onClick?: () => void;
}

function getSpiStatus(spi: number): "good" | "warning" | "critical" {
  if (spi >= 0.95) return "good";
  if (spi >= 0.85) return "warning";
  return "critical";
}

function SpiGauge({ spi }: { spi: number }) {
  const status = getSpiStatus(spi);

  // Calculate rotation for gauge (semicircle from 0 to 1.5)
  // 0 = -90deg, 0.75 = 0deg, 1.5 = 90deg
  const minSpi = 0;
  const maxSpi = 1.5;
  const clampedSpi = Math.max(minSpi, Math.min(maxSpi, spi));
  const rotation = ((clampedSpi - minSpi) / (maxSpi - minSpi)) * 180 - 90;

  const statusColors = {
    good: "text-green-600",
    warning: "text-yellow-600",
    critical: "text-red-600",
  };

  const statusBgColors = {
    good: "bg-green-100 dark:bg-green-950",
    warning: "bg-yellow-100 dark:bg-yellow-950",
    critical: "bg-red-100 dark:bg-red-950",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Gauge SVG */}
      <div className="relative w-32 h-16">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted opacity-20"
          />

          {/* Color zones */}
          {/* Red zone: 0 to 0.85 */}
          <path
            d="M 20 90 A 80 80 0 0 1 72 27"
            fill="none"
            stroke="rgb(220, 38, 38)"
            strokeWidth="12"
            opacity="0.3"
          />
          {/* Yellow zone: 0.85 to 0.95 */}
          <path
            d="M 72 27 A 80 80 0 0 1 92 20"
            fill="none"
            stroke="rgb(234, 179, 8)"
            strokeWidth="12"
            opacity="0.3"
          />
          {/* Green zone: 0.95 to 1.1 */}
          <path
            d="M 92 20 A 80 80 0 0 1 128 27"
            fill="none"
            stroke="rgb(22, 163, 74)"
            strokeWidth="12"
            opacity="0.3"
          />
          {/* Yellow zone: 1.1 to 1.2 */}
          <path
            d="M 128 27 A 80 80 0 0 1 148 40"
            fill="none"
            stroke="rgb(234, 179, 8)"
            strokeWidth="12"
            opacity="0.3"
          />
          {/* Red zone: 1.2+ */}
          <path
            d="M 148 40 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="rgb(220, 38, 38)"
            strokeWidth="12"
            opacity="0.3"
          />

          {/* Needle */}
          <g transform={`rotate(${rotation} 100 90)`}>
            <line
              x1="100"
              y1="90"
              x2="100"
              y2="25"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="90" r="5" fill="currentColor" />
          </g>
        </svg>
      </div>

      {/* SPI Value */}
      <div className={`text-2xl font-bold ${statusColors[status]}`}>
        {spi.toFixed(2)}
      </div>

      {/* Status Badge */}
      <Badge
        variant={status === "critical" ? "destructive" : "secondary"}
        className={statusBgColors[status]}
      >
        {status === "good" && "On Track"}
        {status === "warning" && "At Risk"}
        {status === "critical" && "Behind"}
      </Badge>
    </div>
  );
}

function ProjectHealthCard({
  projectNumber,
  projectName,
  spi,
  percentComplete,
  itemsRemaining,
  totalItems,
  onClick,
}: ProjectHealthCardProps) {
  const status = getSpiStatus(spi);

  const statusBorderColors = {
    good: "border-green-500",
    warning: "border-yellow-500",
    critical: "border-red-500",
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${statusBorderColors[status]}`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Project {projectNumber}</div>
            {projectName && (
              <div className="text-sm font-normal text-muted-foreground mt-1">
                {projectName}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SpiGauge spi={spi} />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{percentComplete.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Installed</span>
            <span className="font-medium">
              {totalItems - itemsRemaining} / {totalItems}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium">{itemsRemaining}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EvmDashboardContent() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [sortBySpi, setSortBySpi] = useState<boolean>(false);

  // Get all active projects
  const projects = useQuery(
    api.projects.getProjects,
    statusFilter === "all" ? {} : { status: statusFilter as ProjectStatus },
  );

  if (!projects) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EVM Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Project health and schedule performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Projects</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="all">All Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
            <p className="text-sm text-muted-foreground text-center">
              No projects match the selected filter criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {projects.length} Project{projects.length !== 1 ? "s" : ""}
            </h2>
            <Button
              variant={sortBySpi ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBySpi(!sortBySpi)}
            >
              {sortBySpi ? "Sorted by SPI" : "Sort by SPI"}
            </Button>
          </div>

          <ProjectGrid
            projects={projects}
            sortBySpi={sortBySpi}
            onProjectClick={(projectNumber) =>
              router.push(`/dashboard/evm/${projectNumber}`)
            }
          />
        </div>
      )}
    </div>
  );
}

// Component to handle project grid with EVM data and sorting
function ProjectGrid({
  projects,
  sortBySpi,
  onProjectClick,
}: {
  projects: Doc<"projects">[];
  sortBySpi: boolean;
  onProjectClick: (projectNumber: string) => void;
}) {
  const [projectEvmData, setProjectEvmData] = useState<Map<string, EvmMetrics>>(
    new Map(),
  );

  // Sort projects based on SPI if enabled
  const sortedProjects = useMemo(() => {
    if (!sortBySpi) {
      return projects;
    }

    // Sort by SPI ascending (worst first)
    return [...projects].sort((a, b) => {
      const evmA = projectEvmData.get(a.projectNumber);
      const evmB = projectEvmData.get(b.projectNumber);

      if (!evmA || !evmB) return 0;
      return evmA.spi - evmB.spi;
    });
  }, [projects, sortBySpi, projectEvmData]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedProjects.map((project) => (
        <ProjectHealthCardWrapper
          key={project._id}
          projectNumber={project.projectNumber}
          projectName={project.projectName}
          onClick={() => onProjectClick(project.projectNumber)}
          onEvmLoaded={(evm) => {
            setProjectEvmData((prev) =>
              new Map(prev).set(project.projectNumber, evm),
            );
          }}
        />
      ))}
    </div>
  );
}

// Wrapper component to fetch EVM per project
function ProjectHealthCardWrapper({
  projectNumber,
  projectName,
  onClick,
  onEvmLoaded,
}: {
  projectNumber: string;
  projectName?: string;
  onClick?: () => void;
  onEvmLoaded?: (evm: EvmMetrics) => void;
}) {
  const evmMetrics = useQuery(api.evm.getEvmByProject, { projectNumber });

  // Notify parent when EVM data loads
  useMemo(() => {
    if (evmMetrics && onEvmLoaded) {
      onEvmLoaded(evmMetrics);
    }
  }, [evmMetrics, onEvmLoaded]);

  if (!evmMetrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse space-y-2 w-full">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProjectHealthCard
      projectNumber={projectNumber}
      projectName={projectName}
      spi={evmMetrics.spi}
      percentComplete={evmMetrics.percentComplete}
      itemsRemaining={evmMetrics.itemsRemaining}
      totalItems={evmMetrics.bac}
      onClick={onClick}
    />
  );
}
