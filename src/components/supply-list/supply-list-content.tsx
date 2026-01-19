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

export function SupplyListContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize filters from URL query params
  const [filters, setFilters] = useState<FilterState>(() => {
    const projectNumber = searchParams.get("project") || undefined;
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

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Callback for pull-to-refresh UI animation
  // Convex subscriptions auto-update, so this just triggers the visual refresh indicator
  const handleRefresh = () => {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SupplyListHeader user={user} logout={logout} />

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
          <SupplyListToolbar />

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
