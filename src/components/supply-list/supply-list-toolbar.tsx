"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, Table, X, Save } from "lucide-react";
import type { FilterState } from "./filters/filter-sidebar";

interface SupplyListToolbarProps {
  filters?: FilterState;
  itemCount?: number;
  filterSheet?: React.ReactNode;
  viewPicker?: React.ReactNode;
  onRemoveFilter?: (filterType: keyof FilterState, value?: string) => void;
  onSaveView?: () => void;
}

export function SupplyListToolbar({
  filters,
  itemCount,
  filterSheet,
  viewPicker,
  onRemoveFilter,
  onSaveView,
}: SupplyListToolbarProps) {
  const handleRemoveProjectFilter = () => {
    onRemoveFilter?.("projectNumber");
  };

  const handleRemovePwbsFilter = (pwbs: string) => {
    onRemoveFilter?.("pwbs", pwbs);
  };

  const handleRemoveCaseFilter = (caseNumber: string) => {
    onRemoveFilter?.("caseNumbers", caseNumber);
  };

  const handleRemovePalletFilter = (palletNumber: string) => {
    onRemoveFilter?.("palletNumbers", palletNumber);
  };

  const handleRemovePlNumberFilter = (plNumber: string) => {
    onRemoveFilter?.("plNumbers", plNumber);
  };

  return (
    <div className="border-b bg-background">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile filter button with sheet */}
          {filterSheet}

          {/* Saved views picker */}
          {viewPicker}

          {/* Save view button */}
          {onSaveView && (
            <Button variant="ghost" size="sm" onClick={onSaveView}>
              <Save className="h-4 w-4 mr-1.5" />
              Save View
            </Button>
          )}

          {/* Active filter chips */}
          {filters?.projectNumber && (
            <Badge variant="secondary" className="gap-1.5">
              Project: {filters.projectNumber}
              <button
                onClick={handleRemoveProjectFilter}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label="Remove project filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters?.pwbs.map((pwbs) => (
            <Badge key={pwbs} variant="secondary" className="gap-1.5">
              PWBS: {pwbs}
              <button
                onClick={() => handleRemovePwbsFilter(pwbs)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove PWBS filter ${pwbs}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters?.caseNumbers.map((caseNumber) => (
            <Badge key={caseNumber} variant="secondary" className="gap-1.5">
              Case: {caseNumber}
              <button
                onClick={() => handleRemoveCaseFilter(caseNumber)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove case filter ${caseNumber}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters?.palletNumbers.map((palletNumber) => (
            <Badge key={palletNumber} variant="secondary" className="gap-1.5">
              Pallet: {palletNumber}
              <button
                onClick={() => handleRemovePalletFilter(palletNumber)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove pallet filter ${palletNumber}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters?.plNumbers.map((plNumber) => (
            <Badge key={plNumber} variant="secondary" className="gap-1.5">
              Work Package: {plNumber}
              <button
                onClick={() => handleRemovePlNumberFilter(plNumber)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove work package filter ${plNumber}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle for mobile/desktop - will be enhanced later */}
          <div className="hidden lg:flex border rounded-md">
            <Button variant="ghost" size="sm" className="rounded-r-none">
              <Table className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-l-none">
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>

          {itemCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              {itemCount.toLocaleString()} items
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
