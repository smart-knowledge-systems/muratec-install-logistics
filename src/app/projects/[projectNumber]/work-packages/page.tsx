"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkPackagesContent } from "@/components/projects/work-packages-content";

export default function WorkPackagesPage({
  params,
}: {
  params: { projectNumber: string };
}) {
  return (
    <AuthGuard>
      <WorkPackagesContent projectNumber={params.projectNumber} />
    </AuthGuard>
  );
}
