"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { GanttChartContent } from "@/components/projects/gantt-chart-content";

export default function SchedulePage({
  params,
}: {
  params: { projectNumber: string };
}) {
  return (
    <AuthGuard>
      <GanttChartContent projectNumber={params.projectNumber} />
    </AuthGuard>
  );
}
