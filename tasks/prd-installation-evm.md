# PRD: Installation Tracking & Earned Value Management

## Overview

Track installation progress at item level and provide Earned Value Management (EVM) metrics for Project Managers. EVM basis is number of items installed vs planned, enabling performance measurement across work packages, PWBS categories, and entire projects.

## Goals

- Track installation status for each supply item
- Calculate EVM metrics: PV, EV, AC, SPI, CPI, EAC (item-based)
- Provide installer mobile interface for status updates
- Enable PM dashboards with project health indicators
- Support 10+ concurrent projects with portfolio-level EVM view

## Personas

### Installer

- Performs physical installation of equipment
- Updates item status as work completes
- Reports issues or blockers
- Works on mobile phone (often dirty/gloved hands)

### Project Manager

- Monitors installation progress and project health
- Reviews EVM metrics for variance analysis
- Reports to stakeholders on project status
- Works on desktop, occasional tablet

## User Stories

### Installation Tracking

- As an **installer**, I want to select my current work package and see items to install so that I know my tasks
- As an **installer**, I want to mark items as installed with one tap so that progress is recorded quickly
- As an **installer**, I want to report installation issues with notes and photos
- As an **installer**, I want to see what I completed today/this week for my records

### EVM Metrics

- As a **project manager**, I want to see Planned Value (PV) based on scheduled items so that I know the baseline
- As a **project manager**, I want to see Earned Value (EV) based on items installed so that I know actual progress
- As a **project manager**, I want to see Schedule Performance Index (SPI) so that I know if we're ahead or behind
- As a **project manager**, I want to see Estimate at Completion (EAC) so that I can forecast project end date
- As a **project manager**, I want to drill down from project EVM to PWBS-level EVM to identify problem areas

### PM Dashboard

- As a **project manager**, I want a single dashboard showing all my projects' health indicators
- As a **project manager**, I want to see projects ranked by SPI (worst first) so that I can prioritize attention
- As a **project manager**, I want trend charts showing SPI/CPI over time
- As a **project manager**, I want to generate EVM reports for stakeholder meetings

## Functional Requirements

### Item Installation Status

1. The system must track installation status per supply item: Not Started, In Progress, Installed, Issue
2. The system must record installer user and timestamp for each status change
3. The system must support issue reporting with notes, photos, and issue type
4. Issue types: Missing Part, Damaged Part, Wrong Part, Site Condition, Other
5. The system must allow bulk status update for items in same work package
6. The system must prevent marking item as Installed if not yet picked (warning, can override)

### EVM Calculations

EVM basis: **Number of items** (not cost or weight)

7. **Planned Value (PV)** = Count of items scheduled to be installed by reporting date
8. **Earned Value (EV)** = Count of items actually installed by reporting date
9. **Schedule Variance (SV)** = EV - PV
10. **Schedule Performance Index (SPI)** = EV / PV (1.0 = on schedule)
11. **Budget at Completion (BAC)** = Total item count for scope
12. **Estimate at Completion (EAC)** = BAC / SPI (projected total items at current rate)
13. **Variance at Completion (VAC)** = BAC - EAC

Note: Cost Performance (CPI, AC) deferred - requires labor hour tracking.

14. The system must calculate EVM at: Project, PWBS category, and Work Package levels
15. The system must store daily EVM snapshots for trend analysis
16. The system must recalculate EVM on demand and on schedule change

### Installer Mobile Interface

17. The system must show assigned work packages for current installer
18. The system must display pick list items filtered to "Picked" status (ready for install)
19. Large tap targets for "Installed" and "Issue" buttons
20. The system must support barcode/QR scan to find item quickly
21. The system must show daily/weekly completion summary for installer
22. The system must work with minimal data entry (mostly taps, not typing)

### PM Dashboard

23. The system must display project health cards with: SPI gauge, % complete, items remaining
24. SPI color coding: Green (>0.95), Yellow (0.85-0.95), Red (<0.85)
25. The system must show trend chart of SPI over past 4 weeks
26. The system must show list of projects sorted by SPI (ascending = problems first)
27. The system must support drill-down: Project → PWBS → Work Package → Items
28. The system must display blockers: work packages with issues reported

### Reporting

29. The system must generate EVM summary report (PDF or printable HTML)
30. Report includes: PV, EV, SV, SPI, BAC, EAC, VAC, trend chart, risk items
31. The system must support date range selection for historical reports
32. The system must export raw EVM data to CSV for external analysis

## Non-Goals (Out of Scope)

- Cost-based EVM (CPI, AC) - requires labor tracking, future phase
- Resource leveling based on EVM projections
- Automatic schedule re-baseline
- Integration with external PM tools (MS Project, etc.)

## Design Considerations

### Installer Mobile UI

- Minimal UI with maximum tap area
- Work package selector at top
- Scrollable item list with large "Done" buttons
- Pull-to-refresh
- Offline queue for poor connectivity
- Vibration feedback on status update

### EVM Dashboard

- Hero metric: Overall SPI with trend arrow
- Project cards in grid layout
- Sparkline charts for trends (no full chart library needed)
- Color-coded status indicators
- Expandable sections for drill-down

### SPI Gauge

- Semicircle gauge from 0 to 1.5
- Green zone: 0.95-1.1
- Yellow zone: 0.85-0.95, 1.1-1.2
- Red zone: <0.85, >1.2

## Technical Considerations

### Schema Additions

```typescript
// Item installation tracking
installationStatus: defineTable({
  supplyItemId: v.id("supplyItems"),
  projectNumber: v.string(),
  plNumber: v.optional(v.string()),

  status: v.union(
    v.literal("not_started"),
    v.literal("in_progress"),
    v.literal("installed"),
    v.literal("issue"),
  ),

  // Timestamps
  startedAt: v.optional(v.number()),
  installedAt: v.optional(v.number()),
  installedBy: v.optional(v.id("users")),

  // Issue tracking
  issueType: v.optional(
    v.union(
      v.literal("missing_part"),
      v.literal("damaged_part"),
      v.literal("wrong_part"),
      v.literal("site_condition"),
      v.literal("other"),
    ),
  ),
  issueNotes: v.optional(v.string()),
  issuePhotos: v.optional(v.array(v.string())),
  issueReportedAt: v.optional(v.number()),
  issueReportedBy: v.optional(v.id("users")),
  issueResolvedAt: v.optional(v.number()),

  updatedAt: v.number(),
})
  .index("by_supply_item", ["supplyItemId"])
  .index("by_project", ["projectNumber"])
  .index("by_work_package", ["projectNumber", "plNumber"])
  .index("by_status", ["status"])
  .index("by_installed_date", ["installedAt"]);

// Daily EVM snapshots for trending
evmSnapshots: defineTable({
  projectNumber: v.string(),
  snapshotDate: v.number(), // start of day timestamp
  scope: v.union(
    v.literal("project"),
    v.literal("pwbs"),
    v.literal("work_package"),
  ),
  scopeId: v.optional(v.string()), // pwbs code or plNumber if not project-level

  // Metrics
  bac: v.number(), // Budget at Completion (total items)
  pv: v.number(), // Planned Value (items scheduled by date)
  ev: v.number(), // Earned Value (items installed by date)
  sv: v.number(), // Schedule Variance
  spi: v.number(), // Schedule Performance Index

  // Derived
  percentComplete: v.number(),
  itemsRemaining: v.number(),
  eac: v.optional(v.number()), // Estimate at Completion

  createdAt: v.number(),
})
  .index("by_project_date", ["projectNumber", "snapshotDate"])
  .index("by_scope", ["projectNumber", "scope", "scopeId"]);
```

### New Routes

- `/install` - Installer mobile interface
- `/install/[projectNumber]` - Project-specific installer view
- `/install/[projectNumber]/[plNumber]` - Work package installation
- `/dashboard/evm` - PM EVM dashboard
- `/dashboard/evm/[projectNumber]` - Single project EVM detail
- `/reports/evm` - EVM report generator

### Convex Functions

- `calculateEvm(projectNumber, asOfDate)` - Compute EVM metrics
- `snapshotEvm(projectNumber)` - Store daily snapshot (scheduled job)
- `getEvmTrend(projectNumber, days)` - Fetch trend data
- `bulkUpdateInstallStatus(items[], status)` - Batch update

### Dependencies

- Chart library for trends (consider `recharts` or simple SVG sparklines)
- PDF generation for reports (consider `@react-pdf/renderer`)
- Convex scheduled functions for daily snapshots

### Performance

- EVM calculations are CPU-intensive; cache results in snapshots
- Daily snapshot job runs overnight
- Real-time EVM available but computed on-demand (not default view)

## Acceptance Criteria

- [ ] Installer can view work package items to install
- [ ] Installer can mark item as installed with one tap
- [ ] Installer can report issue with type, notes, photo
- [ ] Installation timestamp and user recorded
- [ ] Bulk install update works for multiple items
- [ ] EVM metrics calculated: PV, EV, SV, SPI, BAC, EAC
- [ ] EVM available at project, PWBS, and work package levels
- [ ] PM dashboard shows project cards with SPI gauges
- [ ] Projects sortable by SPI
- [ ] Trend chart shows SPI over past 4 weeks
- [ ] Drill-down works: Project → PWBS → Work Package
- [ ] EVM report generates correctly
- [ ] `bun check` passes
- [ ] Verify installer UI on mobile device

## Branch Name Suggestion

`ralph/installation-evm`
