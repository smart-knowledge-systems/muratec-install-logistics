"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ShipmentKanbanBoard } from "@/components/logistics/shipment-kanban-board";

export default function LogisticsPage() {
  return (
    <AuthGuard>
      <ShipmentKanbanBoard />
    </AuthGuard>
  );
}
