"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkPackageDetailContent } from "@/components/projects/work-package-detail-content";

export default function WorkPackageDetailPage({
  params,
}: {
  params: { projectNumber: string; plNumber: string };
}) {
  return (
    <AuthGuard>
      <WorkPackageDetailContent
        projectNumber={params.projectNumber}
        plNumber={params.plNumber}
      />
    </AuthGuard>
  );
}
