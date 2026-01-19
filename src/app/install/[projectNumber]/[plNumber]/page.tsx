"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { InstallerContent } from "@/components/install/installer-content";

export default function InstallerPage({
  params,
}: {
  params: { projectNumber: string; plNumber: string };
}) {
  return (
    <AuthGuard>
      <InstallerContent
        projectNumber={params.projectNumber}
        plNumber={params.plNumber}
      />
    </AuthGuard>
  );
}
