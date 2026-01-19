"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, X } from "lucide-react";

export interface FilterState {
  projectNumber?: string;
  pwbs: string[];
  caseNumbers: string[];
  palletNumbers: string[];
  plNumbers: string[];
}

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  isCollapsed,
  onToggleCollapse,
}: FilterSidebarProps) {
  // Fetch available filter options based on current project (using optimized cache)
  const filterOptions = useQuery(api.supplyItemFilterOptions.get, {
    projectNumber: filters.projectNumber,
  });

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    project: true,
    pwbs: true,
    case: false,
    pallet: false,
    plNumber: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleProjectChange = (projectNumber: string) => {
    onFiltersChange({
      ...filters,
      projectNumber: projectNumber || undefined,
    });
  };

  const handlePwbsChange = (pwbs: string, checked: boolean) => {
    const newPwbs = checked
      ? [...filters.pwbs, pwbs]
      : filters.pwbs.filter((p) => p !== pwbs);
    onFiltersChange({ ...filters, pwbs: newPwbs });
  };

  const handleCaseChange = (caseNumber: string, checked: boolean) => {
    const newCases = checked
      ? [...filters.caseNumbers, caseNumber]
      : filters.caseNumbers.filter((c) => c !== caseNumber);
    onFiltersChange({ ...filters, caseNumbers: newCases });
  };

  const handlePalletChange = (palletNumber: string, checked: boolean) => {
    const newPallets = checked
      ? [...filters.palletNumbers, palletNumber]
      : filters.palletNumbers.filter((p) => p !== palletNumber);
    onFiltersChange({ ...filters, palletNumbers: newPallets });
  };

  const handlePlNumberChange = (plNumber: string, checked: boolean) => {
    const newPlNumbers = checked
      ? [...filters.plNumbers, plNumber]
      : filters.plNumbers.filter((p) => p !== plNumber);
    onFiltersChange({ ...filters, plNumbers: newPlNumbers });
  };

  const handleClearAll = () => {
    onFiltersChange({
      projectNumber: undefined,
      pwbs: [],
      caseNumbers: [],
      palletNumbers: [],
      plNumbers: [],
    });
  };

  const hasActiveFilters =
    filters.projectNumber ||
    filters.pwbs.length > 0 ||
    filters.caseNumbers.length > 0 ||
    filters.palletNumbers.length > 0 ||
    filters.plNumbers.length > 0;

  if (isCollapsed) {
    return (
      <aside className="hidden lg:flex w-12 border-r bg-muted/10 flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block w-64 border-r bg-muted/10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-semibold">Filters</h2>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 px-2 text-xs"
            >
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4 space-y-4">
          {/* Project Filter */}
          <Collapsible
            open={expandedSections.project}
            onOpenChange={() => toggleSection("project")}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">Project</span>
              {expandedSections.project ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="project-all"
                    checked={!filters.projectNumber}
                    onCheckedChange={() => handleProjectChange("")}
                  />
                  <Label
                    htmlFor="project-all"
                    className="text-sm font-normal cursor-pointer"
                  >
                    All Projects
                  </Label>
                </div>
                {filterOptions?.projectNumbers.map((projectNumber) => (
                  <div
                    key={projectNumber}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`project-${projectNumber}`}
                      checked={filters.projectNumber === projectNumber}
                      onCheckedChange={() => handleProjectChange(projectNumber)}
                    />
                    <Label
                      htmlFor={`project-${projectNumber}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {projectNumber}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* PWBS Filter */}
          <Collapsible
            open={expandedSections.pwbs}
            onOpenChange={() => toggleSection("pwbs")}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">
                PWBS {filters.pwbs.length > 0 && `(${filters.pwbs.length})`}
              </span>
              {expandedSections.pwbs ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {filterOptions?.pwbs.map((pwbs) => (
                <div key={pwbs} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pwbs-${pwbs}`}
                    checked={filters.pwbs.includes(pwbs)}
                    onCheckedChange={(checked) =>
                      handlePwbsChange(pwbs, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`pwbs-${pwbs}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {pwbs}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Case Numbers Filter */}
          <Collapsible
            open={expandedSections.case}
            onOpenChange={() => toggleSection("case")}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">
                Case Numbers{" "}
                {filters.caseNumbers.length > 0 &&
                  `(${filters.caseNumbers.length})`}
              </span>
              {expandedSections.case ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <ScrollArea className="h-48">
                {filterOptions?.caseNumbers.map((caseNumber) => (
                  <div key={caseNumber} className="flex items-center space-x-2">
                    <Checkbox
                      id={`case-${caseNumber}`}
                      checked={filters.caseNumbers.includes(caseNumber)}
                      onCheckedChange={(checked) =>
                        handleCaseChange(caseNumber, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`case-${caseNumber}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {caseNumber}
                    </Label>
                  </div>
                ))}
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Pallet Numbers Filter */}
          <Collapsible
            open={expandedSections.pallet}
            onOpenChange={() => toggleSection("pallet")}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">
                Pallet Numbers{" "}
                {filters.palletNumbers.length > 0 &&
                  `(${filters.palletNumbers.length})`}
              </span>
              {expandedSections.pallet ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <ScrollArea className="h-48">
                {filterOptions?.palletNumbers.map((palletNumber) => (
                  <div
                    key={palletNumber}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`pallet-${palletNumber}`}
                      checked={filters.palletNumbers.includes(palletNumber)}
                      onCheckedChange={(checked) =>
                        handlePalletChange(palletNumber, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`pallet-${palletNumber}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {palletNumber}
                    </Label>
                  </div>
                ))}
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Work Package (plNumber) Filter */}
          <Collapsible
            open={expandedSections.plNumber}
            onOpenChange={() => toggleSection("plNumber")}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">
                Work Packages{" "}
                {filters.plNumbers.length > 0 &&
                  `(${filters.plNumbers.length})`}
              </span>
              {expandedSections.plNumber ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <ScrollArea className="h-48">
                {filterOptions?.plNumbers.map((plNumber) => (
                  <div key={plNumber} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pl-${plNumber}`}
                      checked={filters.plNumbers.includes(plNumber)}
                      onCheckedChange={(checked) =>
                        handlePlNumberChange(plNumber, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`pl-${plNumber}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {plNumber}
                    </Label>
                  </div>
                ))}
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </aside>
  );
}
