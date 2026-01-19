"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { MultiProjectDashboard } from "@/components/projects/multi-project-dashboard";

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <MultiProjectDashboard />
    </AuthGuard>
  );
}
