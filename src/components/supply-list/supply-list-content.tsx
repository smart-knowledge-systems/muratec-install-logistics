"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth/auth-context";
import { SupplyListHeader } from "./supply-list-header";
import { SupplyListToolbar } from "./supply-list-toolbar";
import { SupplyListSkeleton } from "./supply-list-skeleton";
import { SupplyTable } from "./views/supply-table";
import { SupplyCardList } from "./views/supply-card-list";

export function SupplyListContent() {
  const { user, logout } = useAuth();
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch supply items with pagination
  const result = useQuery(api.supplyItems.list, {
    paginationOpts: { numItems: 50, cursor: null },
    sortBy,
    sortOrder,
  });

  const items = result?.page ?? [];
  const isLoading = result === undefined;

  const handleSort = (field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Callback for pull-to-refresh UI animation
  // Convex subscriptions auto-update, so this just triggers the visual refresh indicator
  const handleRefresh = () => {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SupplyListHeader user={user} logout={logout} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop sidebar - will be implemented in US-007 */}
        <aside className="hidden lg:block w-64 border-r bg-muted/10">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Filters
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              Filter sidebar (US-007)
            </p>
          </div>
        </aside>

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
