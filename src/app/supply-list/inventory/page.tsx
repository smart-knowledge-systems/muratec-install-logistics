"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { InventoryContent } from "@/components/supply-list/inventory/inventory-content";

export default function InventoryPage() {
  return (
    <AuthGuard>
      <InventoryContent />
    </AuthGuard>
  );
}
