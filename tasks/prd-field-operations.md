# PRD: Field Operations

## Overview

Mobile-first workflows for field teams handling case move-in, inventory verification, and parts picking. Enables Site Manager, Move-in Team, Inventory Team, and Parts Picker to track case arrivals, verify contents, and assemble kits for installation work packages.

## Goals

- Enable case-by-case move-in tracking with barcode/QR scanning
- Provide inventory verification workflow with discrepancy reporting
- Support parts picking by work package (plNumber) with pick lists
- Track case locations within the site/warehouse
- Minimize data entry through scan-based workflows

## Personas

### Site Manager

- Oversees all field operations
- Needs dashboard of move-in progress, inventory status, picking queues
- Works on tablet or desktop

### Move-in Team

- Receives cases at site
- Scans case labels, confirms arrival
- Notes damage or discrepancies
- Works on mobile phone

### Inventory Team

- Opens cases and verifies contents against supply list
- Reports missing/damaged/extra items
- Works on mobile phone or tablet

### Parts Picker

- Assembles parts for specific work packages (plNumbers)
- Needs pick list showing case locations
- Confirms picks, reports shortages
- Works on mobile phone

## User Stories

### Move-in

- As a **move-in team member**, I want to scan a case barcode so that the system records its arrival time and location
- As a **move-in team member**, I want to report case damage with photos so that we have documentation for claims
- As a **site manager**, I want to see which cases have arrived vs expected so that I can follow up on missing shipments

### Inventory

- As an **inventory team member**, I want to see expected contents when I scan a case so that I can verify items
- As an **inventory team member**, I want to mark items as verified, missing, or damaged so that we track discrepancies
- As an **inventory team member**, I want to add notes and photos to discrepancy reports
- As a **site manager**, I want a summary of inventory discrepancies so that I can initiate corrective actions

### Parts Picking

- As a **parts picker**, I want to select a work package (plNumber) and see a pick list so that I can gather required parts
- As a **parts picker**, I want to see case locations for each item so that I can find parts efficiently
- As a **parts picker**, I want to mark items as picked or unavailable so that the installer knows what's ready
- As a **site manager**, I want to see picking progress by work package so that I can prioritize installation scheduling

## Functional Requirements

### Case Move-in

1. The system must support scanning case barcodes (camera or external scanner)
2. The system must record move-in timestamp and user for each case
3. The system must allow setting case location (zone/area designation)
4. The system must support damage reporting with photo attachment
5. The system must show move-in progress by project (cases arrived / total expected)
6. The system should send notification when all cases for a project arrive

### Inventory Verification

7. The system must display expected case contents when case is scanned/selected
8. The system must allow marking each item as: Verified, Missing, Damaged, Extra
9. The system must capture quantity discrepancies (expected vs actual)
10. The system must support photo attachment for damaged items
11. The system must support notes field for each discrepancy
12. The system must show inventory progress by case and by project
13. The system must generate discrepancy report for site manager

### Parts Picking

14. The system must display pick list when work package (plNumber) is selected
15. Pick list must show: itemNumber, partNumber, description, quantity, caseNumber, case location
16. The system must sort pick list by case location for efficient routing
17. The system must allow marking items as: Picked, Partially Picked (with quantity), Unavailable
18. The system must track picking progress by work package
19. The system must show kit readiness status (complete, partial, not started)
20. The system should warn if picking from a case not yet inventoried

### Site Manager Dashboard

21. The system must show summary cards: Move-in Progress, Inventory Progress, Picking Queue
22. The system must show list of pending actions (cases to move-in, cases to inventory, picks to complete)
23. The system must support filtering dashboard by date range
24. The system must highlight overdue items (cases expected but not arrived, etc.)

## Non-Goals (Out of Scope)

- Warehouse management (storage optimization, bin locations) - future enhancement
- Automated re-ordering of missing parts
- Integration with external WMS systems
- Forklift/equipment tracking

## Design Considerations

### Mobile-First UI

- Large touch targets (min 44px) for field use with gloves
- High contrast for outdoor/warehouse visibility
- Scan button prominent at bottom of screen
- Swipe gestures for quick status updates
- Success/failure haptic feedback on scan

### Status Colors

- Move-in: Gray (expected), Blue (arrived), Red (overdue), Yellow (damaged)
- Inventory: Gray (pending), Green (verified), Red (missing/damaged), Yellow (discrepancy)
- Picking: Gray (not started), Blue (in progress), Green (picked), Red (unavailable)

### Photo Capture

- In-app camera with auto-compression
- Store in Convex file storage
- Thumbnail preview in lists, full-size on tap

## Technical Considerations

### Schema Additions

```typescript
// Case-level tracking
caseTracking: defineTable({
  projectNumber: v.string(),
  caseNumber: v.string(),

  // Move-in
  moveInStatus: v.union(
    v.literal("expected"),
    v.literal("arrived"),
    v.literal("overdue"),
  ),
  moveInAt: v.optional(v.number()),
  moveInBy: v.optional(v.id("users")),
  caseLocation: v.optional(v.string()),
  damageReported: v.boolean(),
  damageNotes: v.optional(v.string()),
  damagePhotos: v.optional(v.array(v.string())), // file storage IDs

  // Inventory
  inventoryStatus: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("complete"),
    v.literal("discrepancy"),
  ),
  inventoryAt: v.optional(v.number()),
  inventoryBy: v.optional(v.id("users")),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_project", ["projectNumber"])
  .index("by_case", ["projectNumber", "caseNumber"])
  .index("by_move_in_status", ["moveInStatus"])
  .index("by_inventory_status", ["inventoryStatus"]);

// Item-level inventory verification
inventoryItems: defineTable({
  projectNumber: v.string(),
  caseNumber: v.string(),
  supplyItemId: v.id("supplyItems"),

  status: v.union(
    v.literal("pending"),
    v.literal("verified"),
    v.literal("missing"),
    v.literal("damaged"),
    v.literal("extra"),
  ),
  expectedQuantity: v.number(),
  actualQuantity: v.optional(v.number()),
  notes: v.optional(v.string()),
  photos: v.optional(v.array(v.string())),

  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.id("users")),
})
  .index("by_case", ["projectNumber", "caseNumber"])
  .index("by_status", ["status"]);

// Work package picking
pickingTasks: defineTable({
  projectNumber: v.string(),
  plNumber: v.string(), // work package
  supplyItemId: v.id("supplyItems"),

  status: v.union(
    v.literal("pending"),
    v.literal("picked"),
    v.literal("partial"),
    v.literal("unavailable"),
  ),
  requiredQuantity: v.number(),
  pickedQuantity: v.optional(v.number()),
  caseNumber: v.optional(v.string()),
  caseLocation: v.optional(v.string()),

  pickedAt: v.optional(v.number()),
  pickedBy: v.optional(v.id("users")),
  notes: v.optional(v.string()),
})
  .index("by_project", ["projectNumber"])
  .index("by_work_package", ["projectNumber", "plNumber"])
  .index("by_status", ["status"]);
```

### New Routes

- `/supply-list/move-in` - Move-in scanning and tracking
- `/supply-list/inventory` - Inventory verification workflow
- `/supply-list/picking` - Parts picking by work package
- `/supply-list/field-dashboard` - Site manager overview

### Dependencies

- Camera API for barcode scanning (consider `@aspect-ui/barcode-scanner` or similar)
- Convex file storage for photos
- shadcn components: dialog, drawer, progress

### Offline Considerations (Future)

- Service worker for PWA
- IndexedDB for offline queue
- Sync on reconnection

## Acceptance Criteria

- [ ] Move-in: Can scan case and record arrival with location
- [ ] Move-in: Can report damage with photo
- [ ] Move-in: Dashboard shows cases arrived vs expected
- [ ] Inventory: Scanning case shows expected contents
- [ ] Inventory: Can mark items as verified/missing/damaged with notes
- [ ] Inventory: Progress tracked at case and project level
- [ ] Picking: Can select work package and see pick list
- [ ] Picking: Pick list shows case locations
- [ ] Picking: Can mark items as picked/unavailable
- [ ] Picking: Kit readiness status visible
- [ ] Dashboard: Summary cards show move-in, inventory, picking progress
- [ ] Mobile: UI usable on 375px width screen
- [ ] `bun check` passes
- [ ] Verify barcode scanning works on mobile device

## Branch Name Suggestion

`ralph/field-operations`
