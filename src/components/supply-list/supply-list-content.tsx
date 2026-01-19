"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import { SupplyListHeader } from "./supply-list-header";
import { SupplyListToolbar } from "./supply-list-toolbar";
import { SupplyListSkeleton } from "./supply-list-skeleton";
import { SupplyTable } from "./views/supply-table";
import { SupplyCardList } from "./views/supply-card-list";
import { FilterSidebar, type FilterState } from "./filters/filter-sidebar";
import { FilterSheet } from "./filters/filter-sheet";

const LAST_PROJECT_KEY = "supply-list-last-project";

export function SupplyListContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Update URL when filters change
  useEffect(() => {
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
    const newUrl = queryString ? `/supply-list?${queryString}` : "/supply-list";
    router.push(newUrl, { scroll: false });
  }, [filters, router]);

  // Fetch available projects for the project switcher
  const filterOptions = useQuery(api.supplyItems.getFilterOptions, {
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

  const handleSort = (field: string, order: "asc" | "desc") => {
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
    </div>
  );
}
