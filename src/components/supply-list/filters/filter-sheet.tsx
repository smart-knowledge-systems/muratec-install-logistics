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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import type { FilterState } from "./filter-sidebar";

interface FilterSheetProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeFilterCount: number;
}

export function FilterSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
}: FilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Fetch available filter options based on current project (using optimized cache)
  const filterOptions = useQuery(api.supplyItemFilterOptions.get, {
    projectNumber: localFilters.projectNumber,
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
    setLocalFilters({
      ...localFilters,
      projectNumber: projectNumber || undefined,
    });
  };

  const handlePwbsChange = (pwbs: string, checked: boolean) => {
    const newPwbs = checked
      ? [...localFilters.pwbs, pwbs]
      : localFilters.pwbs.filter((p) => p !== pwbs);
    setLocalFilters({ ...localFilters, pwbs: newPwbs });
  };

  const handleCaseChange = (caseNumber: string, checked: boolean) => {
    const newCases = checked
      ? [...localFilters.caseNumbers, caseNumber]
      : localFilters.caseNumbers.filter((c) => c !== caseNumber);
    setLocalFilters({ ...localFilters, caseNumbers: newCases });
  };

  const handlePalletChange = (palletNumber: string, checked: boolean) => {
    const newPallets = checked
      ? [...localFilters.palletNumbers, palletNumber]
      : localFilters.palletNumbers.filter((p) => p !== palletNumber);
    setLocalFilters({ ...localFilters, palletNumbers: newPallets });
  };

  const handlePlNumberChange = (plNumber: string, checked: boolean) => {
    const newPlNumbers = checked
      ? [...localFilters.plNumbers, plNumber]
      : localFilters.plNumbers.filter((p) => p !== plNumber);
    setLocalFilters({ ...localFilters, plNumbers: newPlNumbers });
  };

  const handleClearAll = () => {
    setLocalFilters({
      projectNumber: undefined,
      pwbs: [],
      caseNumbers: [],
      palletNumbers: [],
      plNumbers: [],
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Reset local filters to match current filters when opening
      setLocalFilters(filters);
    }
    setIsOpen(open);
  };

  const hasActiveFilters =
    localFilters.projectNumber ||
    localFilters.pwbs.length > 0 ||
    localFilters.caseNumbers.length > 0 ||
    localFilters.palletNumbers.length > 0 ||
    localFilters.plNumbers.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Filter supply items by project, PWBS, case, pallet, or work package
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-end mt-4 mb-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-8 px-2 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(85vh-12rem)] mt-4">
          <div className="pr-4 space-y-4">
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
                      id="sheet-project-all"
                      checked={!localFilters.projectNumber}
                      onCheckedChange={() => handleProjectChange("")}
                    />
                    <Label
                      htmlFor="sheet-project-all"
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
                        id={`sheet-project-${projectNumber}`}
                        checked={localFilters.projectNumber === projectNumber}
                        onCheckedChange={() =>
                          handleProjectChange(projectNumber)
                        }
                      />
                      <Label
                        htmlFor={`sheet-project-${projectNumber}`}
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
                  PWBS{" "}
                  {localFilters.pwbs.length > 0 &&
                    `(${localFilters.pwbs.length})`}
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
                      id={`sheet-pwbs-${pwbs}`}
                      checked={localFilters.pwbs.includes(pwbs)}
                      onCheckedChange={(checked) =>
                        handlePwbsChange(pwbs, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`sheet-pwbs-${pwbs}`}
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
                  {localFilters.caseNumbers.length > 0 &&
                    `(${localFilters.caseNumbers.length})`}
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
                    <div
                      key={caseNumber}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`sheet-case-${caseNumber}`}
                        checked={localFilters.caseNumbers.includes(caseNumber)}
                        onCheckedChange={(checked) =>
                          handleCaseChange(caseNumber, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`sheet-case-${caseNumber}`}
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
                  {localFilters.palletNumbers.length > 0 &&
                    `(${localFilters.palletNumbers.length})`}
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
                        id={`sheet-pallet-${palletNumber}`}
                        checked={localFilters.palletNumbers.includes(
                          palletNumber,
                        )}
                        onCheckedChange={(checked) =>
                          handlePalletChange(palletNumber, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`sheet-pallet-${palletNumber}`}
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
                  {localFilters.plNumbers.length > 0 &&
                    `(${localFilters.plNumbers.length})`}
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
                        id={`sheet-pl-${plNumber}`}
                        checked={localFilters.plNumbers.includes(plNumber)}
                        onCheckedChange={(checked) =>
                          handlePlNumberChange(plNumber, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`sheet-pl-${plNumber}`}
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button onClick={handleApply} className="w-full" size="lg">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
