"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ArrivalCalendar } from "@/components/logistics/arrival-calendar";

export default function LogisticsCalendarPage() {
  return (
    <AuthGuard>
      <ArrivalCalendar />
    </AuthGuard>
  );
}
