"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { MoveInContent } from "@/components/supply-list/move-in/move-in-content";

export default function MoveInPage() {
  return (
    <AuthGuard>
      <MoveInContent />
    </AuthGuard>
  );
}
