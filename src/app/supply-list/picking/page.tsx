"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { PickingContent } from "@/components/supply-list/picking/picking-content";

export default function PickingPage() {
  return (
    <AuthGuard>
      <PickingContent />
    </AuthGuard>
  );
}
