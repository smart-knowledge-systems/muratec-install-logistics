"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, Table } from "lucide-react";
import type { FilterState } from "./filters/filter-sidebar";

interface SupplyListToolbarProps {
  filters?: FilterState;
  itemCount?: number;
  filterSheet?: React.ReactNode;
}

export function SupplyListToolbar({
  filters,
  itemCount,
  filterSheet,
}: SupplyListToolbarProps) {
  return (
    <div className="border-b bg-background">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile filter button with sheet */}
          {filterSheet}

          {/* Saved views picker - will be implemented in US-010 */}
          <Button variant="outline" size="sm">
            All Items
          </Button>

          {/* Active filter chips - will be implemented in US-009 */}
          {filters?.projectNumber && (
            <Badge variant="secondary" className="gap-1">
              Project: {filters.projectNumber}
              <button className="ml-1 hover:text-destructive">×</button>
            </Badge>
          )}
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
