"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { FieldDashboardContent } from "@/components/supply-list/field-dashboard/field-dashboard-content";

export default function FieldDashboardPage() {
  return (
    <AuthGuard>
      <FieldDashboardContent />
    </AuthGuard>
  );
}
