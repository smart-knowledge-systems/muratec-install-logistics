# PRD: Logistics Tracking

## Overview

Track shipping milestones for supply list cases from factory departure in Japan through arrival at US installation sites. Enables Import Coordinator and Warehouse Manager to monitor shipment progress, anticipate arrivals, and identify delays.

## Goals

- Track case-level logistics milestones: factory out, port ETD, port ETA, customs clearance, delivery
- Provide visibility into shipment status across all projects
- Alert stakeholders to delays and arrival changes
- Support scheduling decisions based on material availability forecasts

## Personas

### Import Coordinator

- Manages shipping logistics from Japan factory to US ports
- Updates shipment milestones as information becomes available
- Monitors multiple shipments across projects
- Works on desktop, occasionally mobile

### Warehouse Manager

- Prepares for incoming shipments
- Needs arrival forecasts for staffing and space planning
- Tracks cases from port arrival to warehouse receipt
- Works on desktop and tablet

## User Stories

### Milestone Tracking

- As an **import coordinator**, I want to record factory out date when cases ship so that transit tracking begins
- As an **import coordinator**, I want to update port ETD and ETA as shipping schedules are confirmed
- As an **import coordinator**, I want to record actual arrival date when shipment lands
- As an **import coordinator**, I want to note customs hold or delay reasons

### Shipment Visibility

- As an **import coordinator**, I want to see all in-transit shipments on one dashboard
- As an **import coordinator**, I want to filter shipments by vessel, port, or project
- As an **import coordinator**, I want to see which shipments are delayed vs on-time

### Arrival Planning

- As a **warehouse manager**, I want to see expected arrivals for the next 2 weeks so that I can plan staffing
- As a **warehouse manager**, I want to receive notification when shipment ETA changes
- As a **warehouse manager**, I want to see total case count and weight for incoming shipments

### Integration with Scheduling

- As a **project scheduler**, I want to see material ETA so that I can schedule work packages realistically
- As a **project scheduler**, I want alerts when delays impact scheduled work packages

## Functional Requirements

### Logistics Milestones

1. The system must track the following milestones per case:
   - Factory Out Date (工場出荷)
   - Port of Origin ETD (Estimated Time of Departure)
   - Port of Origin ATD (Actual Time of Departure)
   - Vessel Name / Voyage Number
   - Port of Destination
   - Port ETA (Estimated Time of Arrival)
   - Port ATA (Actual Time of Arrival)
   - Customs Cleared Date
   - Delivery to Site Date

2. The system must allow batch update of cases on same shipment
3. The system must calculate days in transit and compare to typical duration
4. The system must flag shipments with ETA changes > 3 days

### Shipment Grouping

5. The system must group cases by shipment (same vessel + voyage)
6. The system must display shipment summary: case count, total weight, projects included
7. The system must allow creating shipment records to group cases
8. The system must support cases from multiple projects on same shipment

### Status Dashboard

9. The system must display shipment status board with columns: At Factory, In Transit, At Port, Customs, Delivered
10. The system must show shipment cards with: vessel, ETA, case count, projects
11. The system must highlight delayed shipments (ETA > original ETA + 3 days)
12. The system must support filtering by: project, destination port, date range

### Arrival Calendar

13. The system must display calendar view of expected arrivals
14. Calendar must show case count per day
15. The system must support week and month views
16. The system must allow clicking date to see arriving shipments

### Notifications

17. The system must notify warehouse manager 3 days before expected arrival
18. The system must notify when ETA changes by more than 1 day
19. The system must notify when shipment marked as arrived
20. Notifications via in-app + optional email (future)

### Scheduling Integration

21. The system must expose material availability date to scheduling module
22. The system must flag work packages dependent on delayed materials
23. The system must update readiness status when materials arrive

## Non-Goals (Out of Scope)

- Carrier API integration (manual updates for now)
- Freight cost tracking
- Customs documentation management
- Detailed vessel tracking (GPS positions, etc.)

## Design Considerations

### Shipment Board

- Kanban-style columns: At Factory | In Transit | At Port | Customs | Delivered
- Drag-and-drop to update status (with date prompt)
- Card shows: vessel name, ETA, case count, project badges
- Color: Green (on-time), Yellow (minor delay), Red (major delay)

### Milestone Timeline

- Horizontal timeline per shipment
- Nodes for each milestone (filled = completed, empty = pending)
- Expected vs actual dates shown

### Arrival Calendar

- Month view default
- Day cells show case count badge
- Click to expand day's arrivals
- Heat map coloring by volume

### Mobile View

- Simplified list view for coordinators on-the-go
- Quick update button for common actions (mark arrived, etc.)

## Technical Considerations

### Schema Additions

```typescript
// Shipment grouping
shipments: defineTable({
  shipmentId: v.string(), // user-defined or auto-generated
  vesselName: v.optional(v.string()),
  voyageNumber: v.optional(v.string()),

  // Ports
  portOfOrigin: v.optional(v.string()), // e.g., "Yokohama"
  portOfDestination: v.optional(v.string()), // e.g., "Long Beach"

  // Milestones
  factoryOutDate: v.optional(v.number()),
  etd: v.optional(v.number()),
  atd: v.optional(v.number()),
  eta: v.optional(v.number()),
  ata: v.optional(v.number()),
  customsClearedDate: v.optional(v.number()),
  deliveredDate: v.optional(v.number()),

  // Original ETA for delay tracking
  originalEta: v.optional(v.number()),

  // Status
  status: v.union(
    v.literal("at_factory"),
    v.literal("in_transit"),
    v.literal("at_port"),
    v.literal("customs"),
    v.literal("delivered"),
  ),

  // Summary (cached)
  caseCount: v.number(),
  totalWeightKg: v.number(),
  projectNumbers: v.array(v.string()),

  // Notes
  notes: v.optional(v.string()),
  delayReason: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_status", ["status"])
  .index("by_eta", ["eta"])
  .index("by_vessel", ["vesselName", "voyageNumber"]);

// Case-to-shipment mapping (extends caseTracking or separate)
caseShipments: defineTable({
  projectNumber: v.string(),
  caseNumber: v.string(),
  shipmentId: v.optional(v.string()), // FK to shipments

  // Case-specific overrides (if differs from shipment)
  deliveredDate: v.optional(v.number()),
  deliveryNotes: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_case", ["projectNumber", "caseNumber"])
  .index("by_shipment", ["shipmentId"]);

// Notifications
notifications: defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("arrival_reminder"),
    v.literal("eta_change"),
    v.literal("shipment_arrived"),
    v.literal("delay_alert"),
  ),
  title: v.string(),
  message: v.string(),
  relatedShipmentId: v.optional(v.string()),
  relatedProjectNumber: v.optional(v.string()),

  read: v.boolean(),
  readAt: v.optional(v.number()),

  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "read"]);
```

### New Routes

- `/logistics` - Shipment dashboard (Kanban board)
- `/logistics/shipments` - Shipment list view
- `/logistics/shipments/[shipmentId]` - Shipment detail
- `/logistics/calendar` - Arrival calendar
- `/logistics/arrivals` - Upcoming arrivals list

### Convex Functions

- `createShipment(data)` - Create new shipment record
- `updateShipmentMilestone(shipmentId, milestone, date)` - Update milestone
- `assignCasesToShipment(caseIds[], shipmentId)` - Batch assign
- `getUpcomingArrivals(days)` - List shipments arriving in N days
- `checkDelays()` - Scheduled job to flag delays and send notifications

### Dependencies

- Calendar component: shadcn calendar or `react-big-calendar`
- Drag-and-drop: `@dnd-kit/core` for Kanban board
- Notifications: Convex scheduled functions for checks

### Integration Points

- Field Operations: `caseTracking.moveInStatus` updated when shipment delivered
- Project Scheduling: `workPackageSchedule.readinessStatus` updated based on material availability

## Acceptance Criteria

- [ ] Shipment record can be created with vessel, ports, dates
- [ ] Cases can be assigned to shipments (batch)
- [ ] All milestones trackable: factory out, ETD, ATD, ETA, ATA, customs, delivered
- [ ] Shipment board shows Kanban columns by status
- [ ] Drag-and-drop updates shipment status
- [ ] Delayed shipments highlighted (>3 day ETA change)
- [ ] Calendar shows expected arrivals by date
- [ ] Arrival notifications sent 3 days before ETA
- [ ] ETA change notifications sent
- [ ] Scheduling module can query material availability
- [ ] `bun check` passes
- [ ] Verify Kanban drag-drop in browser

## Branch Name Suggestion

`ralph/logistics-tracking`
