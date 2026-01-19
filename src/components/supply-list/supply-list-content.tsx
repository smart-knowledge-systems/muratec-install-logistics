"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { SupplyListHeader } from "./supply-list-header";
import { SupplyListToolbar } from "./supply-list-toolbar";
import { SupplyListSkeleton } from "./supply-list-skeleton";

export function SupplyListContent() {
  const { user, logout } = useAuth();
  const [isLoading] = useState(true); // Will be replaced with actual data fetching

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
              <div className="text-center text-muted-foreground">
                Supply list content will be displayed here (US-005 & US-006)
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
