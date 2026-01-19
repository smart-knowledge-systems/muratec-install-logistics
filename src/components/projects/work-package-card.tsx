"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface WorkPackageCardProps {
  workPackage: Doc<"workPackageSchedule">;
  items?: Array<Doc<"supplyItems">>;
  showItems?: boolean;
  projectNumber: string;
}

export function WorkPackageCard({
  workPackage,
  items = [],
  showItems = false,
  projectNumber,
}: WorkPackageCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const getReadinessBadgeVariant = (
    status: "ready" | "partial" | "blocked",
  ): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "ready":
        return "default";
      case "partial":
        return "secondary";
      case "blocked":
        return "destructive";
    }
  };

  const handleCardClick = (_e: React.MouseEvent) => {
    // If clicking on the expand button area, toggle expansion
    if (showItems) {
      setIsExpanded(!isExpanded);
    } else {
      // Navigate to detail page
      router.push(
        `/projects/${projectNumber}/work-packages/${workPackage.plNumber}`,
      );
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isExpanded && "ring-2 ring-ring",
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold">
              {workPackage.plNumber}
            </CardTitle>
            {workPackage.plName && (
              <p className="text-sm text-muted-foreground mt-1">
                {workPackage.plName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant={getReadinessBadgeVariant(workPackage.readinessStatus)}
              className="text-xs"
            >
              {workPackage.readinessStatus}
            </Badge>
            {showItems && (
              <>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* PWBS Categories */}
          <div className="flex flex-wrap gap-1">
            {workPackage.pwbsCategories.map((pwbs) => (
              <Badge key={pwbs} variant="outline" className="text-xs">
                {pwbs}
              </Badge>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Items</dt>
              <dd className="font-medium">{workPackage.itemCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Quantity</dt>
              <dd className="font-medium">{workPackage.totalQuantity}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Weight</dt>
              <dd className="font-medium">
                {workPackage.totalWeightKg.toFixed(1)} kg
              </dd>
            </div>
          </div>

          {/* Expanded Item List */}
          {isExpanded && showItems && items.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <h4 className="font-semibold text-xs uppercase text-muted-foreground">
                Items in Work Package ({items.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="p-3 bg-muted/50 rounded-md text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.itemNumber || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.partNumber || "No part number"}
                        </p>
                      </div>
                      {item.caseNumber && (
                        <Badge variant="outline" className="text-xs">
                          {item.caseNumber}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Qty: </span>
                        <span className="font-medium">
                          {item.quantity ?? "—"}
                        </span>
                      </div>
                      {item.weightKg && (
                        <div>
                          <span className="text-muted-foreground">
                            Weight:{" "}
                          </span>
                          <span className="font-medium">
                            {item.weightKg.toFixed(2)} kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
