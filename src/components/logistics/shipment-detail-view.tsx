"use client";

import { useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MilestoneTimeline } from "./milestone-timeline";
import { MilestoneDateDialog } from "./milestone-date-dialog";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface ShipmentDetailViewProps {
  shipment: Doc<"shipments">;
}

export function ShipmentDetailView({ shipment }: ShipmentDetailViewProps) {
  const router = useRouter();
  const [selectedMilestone, setSelectedMilestone] = useState<{
    milestone: string;
    currentDate?: number;
  } | null>(null);

  const isDelayed =
    shipment.eta && shipment.originalEta
      ? shipment.eta > shipment.originalEta + 3 * 24 * 60 * 60 * 1000
      : false;

  const handleMilestoneClick = (milestone: string, currentDate?: number) => {
    setSelectedMilestone({ milestone, currentDate });
  };

  const handleCloseDialog = () => {
    setSelectedMilestone(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/logistics")}
          className="mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {shipment.vesselName || "Unknown Vessel"}
              {shipment.voyageNumber && (
                <span className="text-muted-foreground ml-2">
                  #{shipment.voyageNumber}
                </span>
              )}
            </h1>
            {isDelayed && <Badge variant="destructive">Delayed</Badge>}
          </div>
          <p className="text-muted-foreground">
            {shipment.portOfOrigin || "Unknown"} →{" "}
            {shipment.portOfDestination || "Unknown"}
          </p>
        </div>
      </div>

      {/* Milestone Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <MilestoneTimeline
            shipment={shipment}
            onMilestoneClick={handleMilestoneClick}
          />
        </CardContent>
      </Card>

      {/* Shipment Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {shipment.status.replace(/_/g, " ")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipment.caseCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipment.totalWeightKg.toFixed(1)} kg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {shipment.projectNumbers.length > 0 ? (
                shipment.projectNumbers.map((project) => (
                  <Badge key={project} variant="outline">
                    {project}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes and Delay Reason */}
      {(shipment.notes || shipment.delayReason) && (
        <div className="grid gap-4 md:grid-cols-2">
          {shipment.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{shipment.notes}</p>
              </CardContent>
            </Card>
          )}
          {shipment.delayReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">Delay Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-800">{shipment.delayReason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Milestone Date Update Dialog */}
      {selectedMilestone && (
        <MilestoneDateDialog
          shipmentId={shipment._id}
          milestone={selectedMilestone.milestone}
          currentDate={selectedMilestone.currentDate}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}
