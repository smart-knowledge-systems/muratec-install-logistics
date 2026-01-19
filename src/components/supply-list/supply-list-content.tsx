"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import { SupplyListHeader } from "./supply-list-header";
import { SupplyListToolbar } from "./supply-list-toolbar";
import { SupplyListSkeleton } from "./supply-list-skeleton";
import { SupplyTable } from "./views/supply-table";
import type { SortableColumn } from "@/convex/lib/types";
import { SupplyCardList } from "./views/supply-card-list";
import { FilterSidebar, type FilterState } from "./filters/filter-sidebar";
import { FilterSheet } from "./filters/filter-sheet";
import { ViewPicker } from "./views/view-picker";
import { SaveViewDialog } from "./views/save-view-dialog";
import type { Id } from "@/convex/_generated/dataModel";

const LAST_PROJECT_KEY = "supply-list-last-project";

// View type for saved/default views (sortBy is string from Convex, cast to SortableColumn when used)
interface View {
  filters: Partial<FilterState>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function SupplyListContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<SortableColumn | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentViewId, setCurrentViewId] = useState<
    string | Id<"savedViews"> | undefined
  >(undefined);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [visibleColumns] = useState<string[]>([
    "itemNumber",
    "partNumber",
    "description",
    "quantity",
    "caseNumber",
    "pwbs",
  ]);

  // Initialize filters from URL query params or localStorage
  const [filters, setFilters] = useState<FilterState>(() => {
    const projectNumber =
      searchParams.get("project") ||
      (typeof window !== "undefined"
        ? localStorage.getItem(LAST_PROJECT_KEY) || undefined
        : undefined);
    const pwbs = searchParams.get("pwbs")?.split(",").filter(Boolean) || [];
    const caseNumbers =
      searchParams.get("cases")?.split(",").filter(Boolean) || [];
    const palletNumbers =
      searchParams.get("pallets")?.split(",").filter(Boolean) || [];
    const plNumbers =
      searchParams.get("plNumbers")?.split(",").filter(Boolean) || [];

    return {
      projectNumber,
      pwbs,
      caseNumbers,
      palletNumbers,
      plNumbers,
    };
  });

  // Debounce URL updates to avoid history pollution during rapid filter changes
  const urlUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Update URL when filters change (debounced)
  useEffect(() => {
    // Clear any pending URL update
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    // Debounce URL updates by 300ms
    urlUpdateTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();

      if (filters.projectNumber) {
        params.set("project", filters.projectNumber);
      }
      if (filters.pwbs.length > 0) {
        params.set("pwbs", filters.pwbs.join(","));
      }
      if (filters.caseNumbers.length > 0) {
        params.set("cases", filters.caseNumbers.join(","));
      }
      if (filters.palletNumbers.length > 0) {
        params.set("pallets", filters.palletNumbers.join(","));
      }
      if (filters.plNumbers.length > 0) {
        params.set("plNumbers", filters.plNumbers.join(","));
      }

      const queryString = params.toString();
      const newUrl = queryString
        ? `/supply-list?${queryString}`
        : "/supply-list";
      // Use replace instead of push to avoid polluting browser history
      router.replace(newUrl, { scroll: false });
    }, 300);

    // Cleanup timeout on unmount or when filters change
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [filters, router]);

  // Fetch available projects for the project switcher (using optimized cache)
  const filterOptions = useQuery(api.supplyItemFilterOptions.get, {
    projectNumber: undefined, // Get all projects
  });

  const availableProjects = filterOptions?.projectNumbers ?? [];

  // Fetch supply items with pagination and filters
  const result = useQuery(api.supplyItems.list, {
    paginationOpts: { numItems: 50, cursor: null },
    projectNumber: filters.projectNumber,
    pwbs: filters.pwbs.length > 0 ? filters.pwbs : undefined,
    caseNumbers:
      filters.caseNumbers.length > 0 ? filters.caseNumbers : undefined,
    palletNumbers:
      filters.palletNumbers.length > 0 ? filters.palletNumbers : undefined,
    plNumbers: filters.plNumbers.length > 0 ? filters.plNumbers : undefined,
    sortBy,
    sortOrder,
  });

  const items = result?.page ?? [];
  const isLoading = result === undefined;

  const handleSort = (field: SortableColumn, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleProjectChange = (projectNumber: string | undefined) => {
    setFilters({ ...filters, projectNumber });
    // Store last viewed project in localStorage
    if (projectNumber) {
      localStorage.setItem(LAST_PROJECT_KEY, projectNumber);
    } else {
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
  };

  const handleRemoveFilter = (
    filterType: keyof FilterState,
    value?: string,
  ) => {
    if (filterType === "projectNumber") {
      setFilters({ ...filters, projectNumber: undefined });
      localStorage.removeItem(LAST_PROJECT_KEY);
    } else if (filterType === "pwbs" && value) {
      setFilters({
        ...filters,
        pwbs: filters.pwbs.filter((p) => p !== value),
      });
    } else if (filterType === "caseNumbers" && value) {
      setFilters({
        ...filters,
        caseNumbers: filters.caseNumbers.filter((c) => c !== value),
      });
    } else if (filterType === "palletNumbers" && value) {
      setFilters({
        ...filters,
        palletNumbers: filters.palletNumbers.filter((p) => p !== value),
      });
    } else if (filterType === "plNumbers" && value) {
      setFilters({
        ...filters,
        plNumbers: filters.plNumbers.filter((p) => p !== value),
      });
    }
  };

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Handle view selection
  const handleSelectView = (
    view: View | null,
    viewId: string | Id<"savedViews"> | null,
  ) => {
    setCurrentViewId(viewId ?? undefined);

    if (view) {
      // Apply view's filters
      setFilters({
        projectNumber: view.filters.projectNumber,
        pwbs: view.filters.pwbs ?? [],
        caseNumbers: view.filters.caseNumbers ?? [],
        palletNumbers: view.filters.palletNumbers ?? [],
        plNumbers: view.filters.plNumbers ?? [],
      });

      // Apply view's sort (cast from string to SortableColumn)
      if (view.sortBy) {
        setSortBy(view.sortBy as SortableColumn);
        setSortOrder(view.sortOrder ?? "asc");
      }
    } else {
      // Clear view - reset to all items
      setCurrentViewId(undefined);
    }
  };

  // Handle save view
  const handleOpenSaveDialog = () => {
    setIsSaveDialogOpen(true);
  };

  const handleViewSaved = (viewId: Id<"savedViews">) => {
    setCurrentViewId(viewId);
  };

  // Callback for pull-to-refresh UI animation
  // Convex subscriptions auto-update, so this just triggers the visual refresh indicator
  const handleRefresh = () => {};

  // Calculate active filter count
  const activeFilterCount =
    (filters.projectNumber ? 1 : 0) +
    filters.pwbs.length +
    filters.caseNumbers.length +
    filters.palletNumbers.length +
    filters.plNumbers.length;

  // Get user ID for saved views
  const userId = user?._id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SupplyListHeader
        user={user}
        logout={logout}
        availableProjects={availableProjects}
        selectedProject={filters.projectNumber}
        onProjectChange={handleProjectChange}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop filter sidebar */}
        <FilterSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />

        {/* Main content area */}
        <main className="flex-1 flex flex-col">
          <SupplyListToolbar
            filters={filters}
            itemCount={items.length}
            onRemoveFilter={handleRemoveFilter}
            onSaveView={handleOpenSaveDialog}
            viewPicker={
              userId ? (
                <ViewPicker
                  userId={userId}
                  currentViewId={currentViewId}
                  onSelectView={handleSelectView}
                  onCreateView={handleOpenSaveDialog}
                />
              ) : null
            }
            filterSheet={
              <FilterSheet
                filters={filters}
                onFiltersChange={handleFiltersChange}
                activeFilterCount={activeFilterCount}
              />
            }
          />

          <div className="flex-1 p-4">
            {isLoading ? (
              <SupplyListSkeleton />
            ) : (
              <>
                <SupplyTable
                  items={items}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
                <SupplyCardList items={items} onRefresh={handleRefresh} />
              </>
            )}
          </div>
        </main>
      </div>

      {/* Save view dialog */}
      {userId && (
        <SaveViewDialog
          userId={userId}
          open={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          currentFilters={filters}
          currentColumns={visibleColumns}
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSaved={handleViewSaved}
        />
      )}
    </div>
  );
}
