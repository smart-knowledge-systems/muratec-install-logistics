# PRD: Project Scheduling

## Overview

Scheduling system built around work packages (plNumbers) and PWBS categories. Enables Project Schedulers to define installation sequences, manage dependencies between PWBS categories, and create project timelines based on material availability and work package readiness.

## Goals

- Enable scheduling at work package (plNumber) granularity
- Model PWBS category dependencies (some parallel, some sequential)
- Visualize project timeline with Gantt-style view
- Track work package readiness based on material availability
- Support 10+ concurrent projects with cross-project resource visibility

## Personas

### Project Scheduler

- Creates and maintains project schedules
- Defines work package sequences and dependencies
- Adjusts schedules based on material delays or site conditions
- Works primarily on desktop with large monitors

### Project Manager

- Reviews schedules across multiple projects
- Identifies resource conflicts and critical paths
- Needs high-level timeline view
- Works on desktop or tablet

## User Stories

### Work Package Management

- As a **scheduler**, I want to view all work packages (plNumbers) for a project so that I can plan the installation sequence
- As a **scheduler**, I want to see item counts and weights per work package so that I can estimate effort
- As a **scheduler**, I want to group work packages by PWBS category so that I understand the equipment organization

### Dependencies

- As a **scheduler**, I want to define dependencies between PWBS categories so that the system respects installation order
- As a **scheduler**, I want to mark certain PWBS categories as parallel-capable so that they can be scheduled concurrently
- As a **scheduler**, I want to define work package dependencies within a PWBS category

### Timeline Planning

- As a **scheduler**, I want to assign planned start and end dates to work packages
- As a **scheduler**, I want to see a Gantt chart of the project timeline
- As a **scheduler**, I want to drag work packages on the timeline to reschedule
- As a **scheduler**, I want the system to warn about dependency violations when I move items

### Material Readiness

- As a **scheduler**, I want to see which work packages have all materials on-site so that I know they're ready to schedule
- As a **scheduler**, I want to see which work packages are blocked by missing materials
- As a **scheduler**, I want estimated arrival dates for missing materials

### Multi-Project View

- As a **project manager**, I want to see timelines for all active projects on one screen
- As a **project manager**, I want to identify overlapping resource needs across projects
- As a **project manager**, I want to filter the multi-project view by site or customer

## Functional Requirements

### Work Package Data

1. The system must aggregate supply items by plNumber to show work package summaries
2. Work package summary must include: item count, total quantity, total weight (kg), PWBS categories involved
3. The system must display work packages grouped by PWBS category
4. The system must allow drill-down from work package to item list

### PWBS Dependencies

5. The system must allow defining dependencies between PWBS categories (e.g., K11W before K11R)
6. The system must support dependency types: Finish-to-Start, Start-to-Start, parallel (no dependency)
7. The system must store default PWBS dependencies as a template
8. The system must allow per-project override of default dependencies

### Work Package Scheduling

9. The system must allow setting planned start/end dates for each work package
10. The system must calculate duration based on historical data or manual estimate
11. The system must validate schedules against PWBS dependencies
12. The system must warn (not block) on dependency violations with override option
13. The system must auto-calculate downstream dates when predecessor moves

### Timeline Visualization

14. The system must display Gantt chart with work packages as bars
15. Timeline must support zoom levels: day, week, month
16. The system must show dependency arrows between related work packages
17. The system must support drag-and-drop rescheduling on Gantt chart
18. The system must highlight critical path
19. The system must show today marker on timeline

### Material Readiness Integration

20. The system must show readiness status on each work package: Ready, Partial, Blocked
21. Ready = all items inventoried and available
22. Partial = some items available, others pending
23. Blocked = critical items missing or in transit
24. The system must link to picking status for ready work packages

### Multi-Project Dashboard

25. The system must display condensed timeline view for multiple projects
26. The system must support filtering by: customer, site, date range, status
27. The system must highlight projects with schedule risks (delays, conflicts)
28. The system must allow clicking into single-project detail view

## Non-Goals (Out of Scope)

- Resource leveling (installer assignment) - separate feature
- Automatic schedule optimization
- Integration with MS Project or Primavera
- Cost/budget tracking (handled in EVM PRD)

## Design Considerations

### Gantt Chart

- Use a proven React Gantt library (consider `@syncfusion/ej2-react-gantt` or `gantt-task-react`)
- Color-code bars by PWBS prefix (K=blue, F=green, H=orange)
- Show readiness status as bar fill pattern (solid=ready, striped=partial, hollow=blocked)
- Dependency arrows with arrowheads

### Work Package Cards

- Summary card shows: plNumber, plName, PWBS, items, weight, dates, readiness badge
- Expandable to show item list
- Quick actions: Schedule, View Items, Start Picking

### Multi-Project Timeline

- Swimlanes per project
- Collapsed view shows just project bar; expand for work package detail
- Filter panel on left side

## Technical Considerations

### Schema Additions

```typescript
// PWBS dependency templates
pwbsDependencies: defineTable({
  fromPwbs: v.string(),
  toPwbs: v.string(),
  dependencyType: v.union(
    v.literal("finish_to_start"),
    v.literal("start_to_start"),
    v.literal("none"), // parallel
  ),
  isDefault: v.boolean(), // true = applies to all projects unless overridden
  projectNumber: v.optional(v.string()), // set for project-specific override
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_from", ["fromPwbs"])
  .index("by_project", ["projectNumber"]);

// Work package scheduling
workPackageSchedule: defineTable({
  projectNumber: v.string(),
  plNumber: v.string(),
  plName: v.optional(v.string()),

  // Scheduling
  plannedStart: v.optional(v.number()),
  plannedEnd: v.optional(v.number()),
  actualStart: v.optional(v.number()),
  actualEnd: v.optional(v.number()),
  estimatedDuration: v.optional(v.number()), // days

  // Dependencies (within project)
  predecessors: v.optional(v.array(v.string())), // plNumber references
  dependencyOverride: v.optional(v.boolean()), // true if ignoring PWBS rules

  // Computed/cached fields
  itemCount: v.number(),
  totalQuantity: v.number(),
  totalWeightKg: v.number(),
  pwbsCategories: v.array(v.string()),

  // Status
  scheduleStatus: v.union(
    v.literal("unscheduled"),
    v.literal("scheduled"),
    v.literal("in_progress"),
    v.literal("complete"),
    v.literal("on_hold"),
  ),
  readinessStatus: v.union(
    v.literal("ready"),
    v.literal("partial"),
    v.literal("blocked"),
  ),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_project", ["projectNumber"])
  .index("by_pl", ["projectNumber", "plNumber"])
  .index("by_status", ["scheduleStatus"])
  .index("by_planned_start", ["plannedStart"]);

// Project summary for multi-project view
projects: defineTable({
  projectNumber: v.string(),
  projectName: v.optional(v.string()),
  customer: v.optional(v.string()),
  site: v.optional(v.string()),

  // Timeline
  plannedStart: v.optional(v.number()),
  plannedEnd: v.optional(v.number()),
  actualStart: v.optional(v.number()),
  actualEnd: v.optional(v.number()),

  // Summary stats (cached)
  totalWorkPackages: v.number(),
  completedWorkPackages: v.number(),
  totalItems: v.number(),
  installedItems: v.number(),

  status: v.union(
    v.literal("planning"),
    v.literal("active"),
    v.literal("on_hold"),
    v.literal("complete"),
  ),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_project_number", ["projectNumber"])
  .index("by_status", ["status"])
  .index("by_customer", ["customer"]);
```

### New Routes

- `/projects` - Multi-project dashboard
- `/projects/[projectNumber]` - Single project detail with Gantt
- `/projects/[projectNumber]/schedule` - Scheduling interface
- `/projects/[projectNumber]/work-packages` - Work package list
- `/projects/[projectNumber]/work-packages/[plNumber]` - Work package detail

### Dependencies

- Gantt chart library (evaluate options)
- Date manipulation: `date-fns`
- shadcn components: calendar, popover, slider (for zoom)

### Performance

- Work package summaries computed on import, cached in `workPackageSchedule`
- Incremental recalculation when supply items change
- Pagination for multi-project view

## Acceptance Criteria

- [ ] Work packages listed and grouped by PWBS category
- [ ] Work package shows item count, quantity, weight summary
- [ ] PWBS dependencies can be defined (default and per-project)
- [ ] Work packages can be assigned planned start/end dates
- [ ] Gantt chart displays work packages on timeline
- [ ] Drag-and-drop rescheduling works on Gantt
- [ ] Dependency violations show warning
- [ ] Readiness status (Ready/Partial/Blocked) shown on work packages
- [ ] Multi-project view shows condensed timelines
- [ ] Multi-project view supports filtering
- [ ] `bun check` passes
- [ ] Verify Gantt interaction in browser

## Branch Name Suggestion

`ralph/project-scheduling`
