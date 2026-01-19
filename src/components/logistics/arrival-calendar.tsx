"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ShipmentCard } from "./shipment-card";

type ViewMode = "month" | "week";

export function ArrivalCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get shipments for the current month/week view
  const startOfPeriod = getStartOfPeriod(currentDate, viewMode);
  const endOfPeriod = getEndOfPeriod(currentDate, viewMode);

  const shipments = useQuery(api.shipments.getShipments, {
    startDate: startOfPeriod.getTime(),
    endDate: endOfPeriod.getTime(),
  });

  const handlePreviousPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      );
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
    setSelectedDate(null);
  };

  const handleNextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      );
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
    setSelectedDate(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  if (shipments === undefined) {
    return <CalendarSkeleton />;
  }

  // Group shipments by date
  const shipmentsByDate = groupShipmentsByDate(shipments);

  // Get shipments for selected date
  const selectedDateShipments = selectedDate
    ? shipmentsByDate.get(formatDateKey(selectedDate)) || []
    : [];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Arrival Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            View expected shipment arrivals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
          >
            {viewMode === "month" ? "Week View" : "Month View"}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {viewMode === "month"
                ? currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : `Week of ${startOfPeriod.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPeriod}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPeriod}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "month" ? (
            <MonthView
              currentDate={currentDate}
              shipmentsByDate={shipmentsByDate}
              onDateClick={handleDateClick}
              selectedDate={selectedDate}
            />
          ) : (
            <WeekView
              startDate={startOfPeriod}
              shipmentsByDate={shipmentsByDate}
              onDateClick={handleDateClick}
              selectedDate={selectedDate}
            />
          )}
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Arrivals on{" "}
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateShipments.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No arrivals scheduled for this date
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDateShipments.map((shipment) => (
                  <ShipmentCard key={shipment._id} shipment={shipment} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MonthViewProps {
  currentDate: Date;
  shipmentsByDate: Map<string, Doc<"shipments">[]>;
  onDateClick: (date: Date) => void;
  selectedDate: Date | null;
}

function MonthView({
  currentDate,
  shipmentsByDate,
  onDateClick,
  selectedDate,
}: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month
  const firstDayOfMonth = new Date(year, month, 1);

  // Get starting day (Sunday of week containing first day)
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const calendarStartDate = new Date(firstDayOfMonth);
  calendarStartDate.setDate(calendarStartDate.getDate() - startingDayOfWeek);

  // Generate 6 weeks of dates (42 days)
  const calendarDates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(calendarStartDate);
    date.setDate(date.getDate() + i);
    calendarDates.push(date);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Day headers */}
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div
          key={day}
          className="text-center text-xs font-medium text-muted-foreground p-2"
        >
          {day}
        </div>
      ))}

      {/* Calendar dates */}
      {calendarDates.map((date) => {
        const dateKey = formatDateKey(date);
        const shipmentsOnDate = shipmentsByDate.get(dateKey) || [];
        const isCurrentMonth = date.getMonth() === month;
        const isToday = date.getTime() === today.getTime();
        const isSelected =
          selectedDate && date.getTime() === selectedDate.getTime();

        return (
          <button
            key={dateKey}
            onClick={() => onDateClick(date)}
            className={`
              relative p-2 min-h-[80px] border rounded-lg text-left transition-colors
              ${isCurrentMonth ? "bg-card hover:bg-accent" : "bg-muted/30 text-muted-foreground"}
              ${isToday ? "border-primary border-2" : "border-border"}
              ${isSelected ? "ring-2 ring-primary" : ""}
            `}
          >
            <div className="text-sm font-medium mb-1">{date.getDate()}</div>
            {shipmentsOnDate.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs absolute bottom-2 right-2"
              >
                {shipmentsOnDate.length}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface WeekViewProps {
  startDate: Date;
  shipmentsByDate: Map<string, Doc<"shipments">[]>;
  onDateClick: (date: Date) => void;
  selectedDate: Date | null;
}

function WeekView({
  startDate,
  shipmentsByDate,
  onDateClick,
  selectedDate,
}: WeekViewProps) {
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {weekDates.map((date) => {
        const dateKey = formatDateKey(date);
        const shipmentsOnDate = shipmentsByDate.get(dateKey) || [];
        const isToday = date.getTime() === today.getTime();
        const isSelected =
          selectedDate && date.getTime() === selectedDate.getTime();

        return (
          <button
            key={dateKey}
            onClick={() => onDateClick(date)}
            className={`
              relative p-4 min-h-[120px] border rounded-lg text-left transition-colors
              ${isToday ? "border-primary border-2" : "border-border"}
              ${isSelected ? "ring-2 ring-primary" : ""}
              hover:bg-accent
            `}
          >
            <div className="text-xs text-muted-foreground mb-1">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            <div className="text-lg font-semibold mb-2">{date.getDate()}</div>
            {shipmentsOnDate.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {shipmentsOnDate.length} arrival
                {shipmentsOnDate.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions

function getStartOfPeriod(date: Date, viewMode: ViewMode): Date {
  if (viewMode === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  } else {
    // Week view: start on Sunday
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }
}

function getEndOfPeriod(date: Date, viewMode: ViewMode): Date {
  if (viewMode === "month") {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  } else {
    // Week view: end on Saturday
    const endOfWeek = new Date(date);
    endOfWeek.setDate(endOfWeek.getDate() - endOfWeek.getDay() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  }
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function groupShipmentsByDate(
  shipments: Doc<"shipments">[],
): Map<string, Doc<"shipments">[]> {
  const map = new Map<string, Doc<"shipments">[]>();

  for (const shipment of shipments) {
    // Use ETA for calendar display
    if (shipment.eta) {
      const date = new Date(shipment.eta);
      date.setHours(0, 0, 0, 0);
      const dateKey = formatDateKey(date);

      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(shipment);
    }
  }

  return map;
}
