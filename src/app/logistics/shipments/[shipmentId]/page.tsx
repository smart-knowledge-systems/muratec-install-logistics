"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ShipmentDetailView } from "@/components/logistics/shipment-detail-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShipmentDetailPage() {
  const params = useParams();
  const shipmentId = params.shipmentId as Id<"shipments">;

  const shipment = useQuery(api.shipments.getShipmentById, { id: shipmentId });

  return (
    <AuthGuard>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {shipment === undefined ? (
          <ShipmentDetailSkeleton />
        ) : shipment === null ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">Shipment Not Found</h2>
            <p className="text-muted-foreground">
              The shipment you are looking for does not exist.
            </p>
          </div>
        ) : (
          <ShipmentDetailView shipment={shipment} />
        )}
      </div>
    </AuthGuard>
  );
}

function ShipmentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
