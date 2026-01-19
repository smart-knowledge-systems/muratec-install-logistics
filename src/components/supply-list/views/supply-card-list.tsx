"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupplyItem } from "@/types/supply-item";

interface SupplyCardListProps {
  items: SupplyItem[];
  onRefresh?: () => void;
}

export function SupplyCardList({ items, onRefresh }: SupplyCardListProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const PULL_THRESHOLD = 80;

  const toggleCardExpansion = useCallback((itemId: string) => {
    setExpandedCard((prev) => (prev === itemId ? null : itemId));
  }, []);

  const handleCardKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, itemId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleCardExpansion(itemId);
      }
    },
    [toggleCardExpansion],
  );

  // Use refs to avoid stale closures in touch handlers
  const isPullingRef = useRef(isPulling);
  const pullDistanceRef = useRef(pullDistance);
  const isRefreshingRef = useRef(isRefreshing);
  const onRefreshRef = useRef(onRefresh);

  // Keep refs in sync with state
  useEffect(() => {
    isPullingRef.current = isPulling;
    pullDistanceRef.current = pullDistance;
    isRefreshingRef.current = isRefreshing;
    onRefreshRef.current = onRefresh;
  }, [isPulling, pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Use refs to access current values without stale closures
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
      }
    };

    const handleTouchEnd = () => {
      // Use refs to access current values without stale closures
      if (!isPullingRef.current || isRefreshingRef.current) return;

      if (pullDistanceRef.current >= PULL_THRESHOLD && onRefreshRef.current) {
        setIsRefreshing(true);
        onRefreshRef.current();
        // Simulate refresh delay
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 1000);
      } else {
        setPullDistance(0);
      }

      setIsPulling(false);
      startY.current = 0;
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, []); // Empty deps - handlers use refs for current values

  return (
    <div
      ref={containerRef}
      className="lg:hidden space-y-3 relative"
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling ? "none" : "transform 0.3s ease-out",
      }}
    >
      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="absolute -top-16 left-0 right-0 flex items-center justify-center h-16"
          style={{
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
          }}
        >
          <RefreshCw
            className={cn(
              "h-6 w-6 text-muted-foreground",
              isRefreshing && "animate-spin",
            )}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No items found</p>
        </div>
      ) : (
        items.map((item) => (
          <Card
            key={item._id}
            className={cn(
              "cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              expandedCard === item._id && "ring-2 ring-ring",
            )}
            onClick={() => toggleCardExpansion(item._id)}
            onKeyDown={(e) => handleCardKeyDown(e, item._id)}
            tabIndex={0}
            role="button"
            aria-expanded={expandedCard === item._id}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {item.itemNumber || "—"}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {item.partNumber || "No part number"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.caseNumber && (
                    <Badge variant="outline" className="text-xs">
                      {item.caseNumber}
                    </Badge>
                  )}
                  {expandedCard === item._id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* Always visible content */}
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {item.description || "No description"}
                </p>

                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Qty: </span>
                    <span className="font-medium">{item.quantity ?? "—"}</span>
                  </div>
                  {item.pwbs && (
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">PWBS: </span>
                      <span className="font-medium truncate">{item.pwbs}</span>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {expandedCard === item._id && (
                  <div className="pt-3 border-t space-y-2 text-sm">
                    <h4 className="font-semibold text-xs uppercase text-muted-foreground">
                      Full Details
                    </h4>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Item Number
                        </dt>
                        <dd className="font-medium">
                          {item.itemNumber || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Part Number
                        </dt>
                        <dd className="font-medium">
                          {item.partNumber || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Project
                        </dt>
                        <dd className="font-medium">{item.projectNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Quantity
                        </dt>
                        <dd className="font-medium">{item.quantity ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Case Number
                        </dt>
                        <dd className="font-medium">
                          {item.caseNumber || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Pallet Number
                        </dt>
                        <dd className="font-medium">
                          {item.palletNumber || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          PL Number
                        </dt>
                        <dd className="font-medium">{item.plNumber || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Weight (kg)
                        </dt>
                        <dd className="font-medium">
                          {item.weightKg ? item.weightKg.toFixed(2) : "—"}
                        </dd>
                      </div>
                    </div>

                    <div className="pt-2">
                      <dt className="text-muted-foreground text-xs">PWBS</dt>
                      <dd className="font-medium">
                        {item.pwbs}
                        {item.pwbsName && ` - ${item.pwbsName}`}
                      </dd>
                    </div>

                    {item.description && (
                      <div className="pt-2">
                        <dt className="text-muted-foreground text-xs">
                          Full Description
                        </dt>
                        <dd className="mt-1 text-sm">{item.description}</dd>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
