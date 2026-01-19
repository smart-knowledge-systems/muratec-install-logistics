"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

export interface ShipmentFilters {
  projectNumber?: string;
  destinationPort?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ShipmentFilterPanelProps {
  filters: ShipmentFilters;
  onFiltersChange: (filters: ShipmentFilters) => void;
  availableProjects?: string[];
  availablePorts?: string[];
}

export function ShipmentFilterPanel({
  filters,
  onFiltersChange,
  availableProjects = [],
  availablePorts = [],
}: ShipmentFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<ShipmentFilters>(filters);

  const handleProjectChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      projectNumber: value === "all" ? undefined : value,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePortChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      destinationPort: value === "all" ? undefined : value,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    const newFilters = {
      ...localFilters,
      startDate: date,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    const newFilters = {
      ...localFilters,
      endDate: date,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: ShipmentFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters =
    localFilters.projectNumber ||
    localFilters.destinationPort ||
    localFilters.startDate ||
    localFilters.endDate;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Filter */}
        <div className="space-y-2">
          <Label htmlFor="project-filter" className="text-sm font-medium">
            Project
          </Label>
          <Select
            value={localFilters.projectNumber || "all"}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger id="project-filter">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {availableProjects.map((project) => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Destination Port Filter */}
        <div className="space-y-2">
          <Label htmlFor="port-filter" className="text-sm font-medium">
            Destination Port
          </Label>
          <Select
            value={localFilters.destinationPort || "all"}
            onValueChange={handlePortChange}
          >
            <SelectTrigger id="port-filter">
              <SelectValue placeholder="All ports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ports</SelectItem>
              {availablePorts.map((port) => (
                <SelectItem key={port} value={port}>
                  {port}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">ETA Date Range</Label>

          {/* Start Date */}
          <div className="space-y-1">
            <Label
              htmlFor="start-date"
              className="text-xs text-muted-foreground"
            >
              From
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.startDate ? (
                    format(localFilters.startDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                  {localFilters.startDate && (
                    <X
                      className="ml-auto h-4 w-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDateChange(undefined);
                      }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.startDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <Label htmlFor="end-date" className="text-xs text-muted-foreground">
              To
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.endDate ? (
                    format(localFilters.endDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                  {localFilters.endDate && (
                    <X
                      className="ml-auto h-4 w-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEndDateChange(undefined);
                      }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.endDate}
                  onSelect={handleEndDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
