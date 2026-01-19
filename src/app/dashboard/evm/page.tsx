"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { EvmDashboardContent } from "@/components/dashboard/evm/evm-dashboard-content";

export default function EvmDashboardPage() {
  return (
    <AuthGuard>
      <EvmDashboardContent />
    </AuthGuard>
  );
}
