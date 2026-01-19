"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { EvmReportGenerator } from "@/components/reports/evm-report-generator";

export default function EvmReportPage() {
  return (
    <AuthGuard>
      <EvmReportGenerator />
    </AuthGuard>
  );
}
