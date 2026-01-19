"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ShipmentCard } from "./shipment-card";
import { StatusDateDialog } from "./status-date-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";

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
  const updateShipmentStatus = useMutation(api.shipments.updateShipmentStatus);

  const [activeShipment, setActiveShipment] = useState<Doc<"shipments"> | null>(
    null,
  );
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    shipmentId: Id<"shipments">;
    newStatus: ShipmentStatus;
    statusLabel: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const shipmentId = event.active.id as Id<"shipments">;
    const shipment = shipments.find((s) => s._id === shipmentId);
    setActiveShipment(shipment || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShipment(null);

    if (!over) return;

    const shipmentId = active.id as Id<"shipments">;
    const newStatus = over.id as ShipmentStatus;

    // Find the shipment and check if status changed
    const shipment = shipments.find((s) => s._id === shipmentId);
    if (!shipment || shipment.status === newStatus) return;

    // Get the label for the new status
    const statusLabel =
      KANBAN_COLUMNS.find((col) => col.id === newStatus)?.label || newStatus;

    // Open dialog to prompt for date
    setPendingStatusUpdate({ shipmentId, newStatus, statusLabel });
  };

  const handleDateConfirm = async (date: Date) => {
    if (!pendingStatusUpdate) return;

    try {
      await updateShipmentStatus({
        id: pendingStatusUpdate.shipmentId,
        status: pendingStatusUpdate.newStatus,
        statusDate: date.getTime(),
      });

      toast.success(`Shipment moved to ${pendingStatusUpdate.statusLabel}`);
    } catch (error) {
      toast.error("Failed to update shipment status");
      console.error("Failed to update shipment status:", error);
    } finally {
      setPendingStatusUpdate(null);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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
              <KanbanColumn
                key={column.id}
                column={column}
                shipments={shipmentsByStatus[column.id]}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeShipment ? (
            <div className="rotate-3 cursor-grabbing opacity-80">
              <ShipmentCard shipment={activeShipment} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <StatusDateDialog
        open={!!pendingStatusUpdate}
        onOpenChange={(open) => !open && setPendingStatusUpdate(null)}
        onConfirm={handleDateConfirm}
        statusLabel={pendingStatusUpdate?.statusLabel || ""}
      />
    </>
  );
}

interface KanbanColumnProps {
  column: (typeof KANBAN_COLUMNS)[number];
  shipments: Doc<"shipments">[];
}

function KanbanColumn({ column, shipments }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div ref={setNodeRef} className="flex flex-col">
      <Card className="flex-1 transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {column.label}
            <span className="ml-2 text-muted-foreground">
              ({shipments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 min-h-[200px]">
          {shipments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No shipments
            </div>
          ) : (
            shipments.map((shipment) => (
              <DraggableShipmentCard key={shipment._id} shipment={shipment} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface DraggableShipmentCardProps {
  shipment: Doc<"shipments">;
}

function DraggableShipmentCard({ shipment }: DraggableShipmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: shipment._id,
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ShipmentCard shipment={shipment} />
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
