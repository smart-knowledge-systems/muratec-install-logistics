"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ShipmentCard } from "./shipment-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const KANBAN_COLUMNS = [
  { id: "at_factory", label: "At Factory" },
  { id: "in_transit", label: "In Transit" },
  { id: "at_port", label: "At Port" },
  { id: "customs", label: "Customs" },
  { id: "delivered", label: "Delivered" },
] as const;

type ShipmentStatus = (typeof KANBAN_COLUMNS)[number]["id"];

export function ShipmentKanbanBoard() {
  const shipments = useQuery(api.shipments.getShipments, {});

  if (shipments === undefined) {
    return <KanbanBoardSkeleton />;
  }

  // Group shipments by status
  const shipmentsByStatus = KANBAN_COLUMNS.reduce(
    (acc, column) => {
      acc[column.id] = shipments.filter(
        (shipment) => shipment.status === column.id,
      );
      return acc;
    },
    {} as Record<ShipmentStatus, typeof shipments>,
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Logistics Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Track shipments from factory to delivery
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KANBAN_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {column.label}
                  <span className="ml-2 text-muted-foreground">
                    ({shipmentsByStatus[column.id].length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shipmentsByStatus[column.id].length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No shipments
                  </div>
                ) : (
                  shipmentsByStatus[column.id].map((shipment) => (
                    <ShipmentCard key={shipment._id} shipment={shipment} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanBoardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KANBAN_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
