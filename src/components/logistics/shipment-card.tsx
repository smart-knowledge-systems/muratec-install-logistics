import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";

interface ShipmentCardProps {
  shipment: Doc<"shipments">;
}

export function ShipmentCard({ shipment }: ShipmentCardProps) {
  const isDelayed =
    shipment.eta && shipment.originalEta
      ? shipment.eta > shipment.originalEta + 3 * 24 * 60 * 60 * 1000 // 3 days in milliseconds
      : false;

  return (
    <Card
      className={`mb-3 cursor-pointer transition-all hover:shadow-md ${
        isDelayed ? "border-red-500 border-2 bg-red-50" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Vessel Name */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {shipment.vesselName || "Unknown Vessel"}
              {shipment.voyageNumber && (
                <span className="text-muted-foreground ml-1">
                  #{shipment.voyageNumber}
                </span>
              )}
            </h3>
            {isDelayed && (
              <Badge variant="destructive" className="text-xs">
                Delayed
              </Badge>
            )}
          </div>

          {/* ETA */}
          {shipment.eta && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">ETA:</span>{" "}
              {formatDate(new Date(shipment.eta))}
            </div>
          )}

          {/* Case Count */}
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="font-medium">{shipment.caseCount}</span> cases
            </div>
            {shipment.totalWeightKg > 0 && (
              <div className="text-muted-foreground">
                {shipment.totalWeightKg.toFixed(1)} kg
              </div>
            )}
          </div>

          {/* Project Badges */}
          {shipment.projectNumbers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {shipment.projectNumbers.map((project) => (
                <Badge key={project} variant="outline" className="text-xs">
                  {project}
                </Badge>
              ))}
            </div>
          )}

          {/* Delay Reason */}
          {isDelayed && shipment.delayReason && (
            <div className="text-xs text-red-600 mt-2 pt-2 border-t">
              {shipment.delayReason}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
