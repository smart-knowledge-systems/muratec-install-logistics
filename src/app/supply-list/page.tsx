"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { SupplyListContent } from "@/components/supply-list/supply-list-content";

export default function SupplyListPage() {
  return (
    <AuthGuard>
      <SupplyListContent />
    </AuthGuard>
  );
}
