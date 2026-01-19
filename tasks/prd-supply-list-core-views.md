# PRD: Supply List Core Views

## Overview

Foundation layer providing responsive views of 16K+ supply items across 10+ concurrent projects. Enables all personas to access supply list data through mobile-first card views and desktop table views with filtering by PWBS, project, case, pallet, and work package (plNumber).

## Goals

- Display supply items with sub-second response for filtered views
- Support 10+ concurrent projects with clear project switching
- Provide mobile-optimized views for field workers (Site Manager, Parts Picker, Installer)
- Provide desktop power-user views for schedulers and PMs
- Enable filtering by PWBS category, project, case, pallet, and plNumber (work package)

## User Stories

- As a **field worker**, I want to quickly filter items by case number on my phone so that I can verify case contents during move-in
- As a **project scheduler**, I want to view all items grouped by plNumber (work package) so that I can plan installation sequences
- As a **warehouse manager**, I want to filter by project and pallet so that I can locate stored materials
- As a **project manager**, I want to switch between projects quickly so that I can monitor multiple installations
- As any user, I want to save my frequently used filter combinations so that I can access them with one tap

## Functional Requirements

### Data Display

1. The system must display supply items in a responsive layout: cards on mobile (<1024px), table on desktop
2. The system must show essential fields on mobile: itemNumber, partNumber, description, caseNumber, quantity
3. The system must show all fields on desktop with column visibility toggle
4. The system must support expanding a card/row to show full item details
5. The system must display PWBS category name alongside code (e.g., "K11W - Electrical Infrastructure")

### Filtering

6. The system must provide filters for: projectNumber, pwbs (multi-select), caseNumber, palletNumber, plNumber
7. The system must show active filters as dismissible chips
8. The system must persist filter state in URL for shareability
9. The system should provide a search box for cross-field text search (itemNumber, partNumber, description)

### Project Context

10. The system must display current project in header with quick-switch dropdown
11. The system must remember last-viewed project per user
12. The system should show project summary stats (total items, cases, weight)

### Saved Views

13. The system must allow users to save filter + column configurations as named views
14. The system must support private (per-user) and shared views
15. The system must provide a view picker dropdown in toolbar
16. The system should include pre-built views: "By PWBS", "By Work Package", "By Case", "By Pallet"

### Mobile Experience

17. The system must use bottom sheet for filters on mobile (not sidebar)
18. The system must support pull-to-refresh on mobile
19. The system must work offline with cached data (PWA consideration for future)

### Desktop Experience

20. The system must provide collapsible filter sidebar on desktop
21. The system must support sortable table columns
22. The system must support column reordering via drag-and-drop (future)

## Non-Goals (Out of Scope)

- Data import/sync from Excel (separate feature)
- Editing supply item data (read-only views)
- Logistics milestone tracking (separate PRD)
- Installation status tracking (separate PRD)
- EVM calculations (separate PRD)

## Design Considerations

- Follow existing shadcn/ui patterns (Card, Table, Badge, Sheet components)
- Use `lg:` breakpoint (1024px) for mobile/desktop switch
- Filter chips use Badge component with dismiss button
- Project switcher in header uses Select component
- Skeleton loading states during data fetch

## Technical Considerations

### Schema Additions

```typescript
// Add to convex/schema.ts
savedViews: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  createdBy: v.id("users"),
  isShared: v.boolean(),
  filters: v.object({
    projectNumber: v.optional(v.string()),
    pwbs: v.optional(v.array(v.string())),
    caseNumbers: v.optional(v.array(v.string())),
    palletNumbers: v.optional(v.array(v.string())),
    plNumbers: v.optional(v.array(v.string())),
    isDeleted: v.optional(v.boolean()),
  }),
  columns: v.array(v.string()),
  sortBy: v.optional(v.string()),
  sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_creator", ["createdBy"])
  .index("by_shared", ["isShared"])

  // Add index to supplyItems
  .index("by_pallet", ["palletNumber"])
  .index("by_pl_number", ["plNumber"]);
```

### New Files

- `convex/supplyItems.ts` - Query functions with pagination
- `convex/savedViews.ts` - View CRUD operations
- `src/app/supply-list/page.tsx` - Main route
- `src/app/supply-list/layout.tsx` - Responsive layout with sidebar
- `src/components/supply-list/views/supply-table.tsx`
- `src/components/supply-list/views/supply-card-list.tsx`
- `src/components/supply-list/filters/filter-sidebar.tsx`
- `src/components/supply-list/filters/filter-sheet.tsx`
- `src/components/supply-list/toolbar/view-toolbar.tsx`

### Dependencies

- shadcn components: sheet, command (for search), popover, checkbox

### Performance

- Convex pagination for large result sets
- Debounced filter changes (300ms)
- Virtual scrolling for tables with 1000+ visible rows

## Acceptance Criteria

- [ ] Supply list displays at `/supply-list` route
- [ ] Mobile view shows cards, desktop shows table
- [ ] Filter by project, PWBS, case, pallet, plNumber works
- [ ] Active filters shown as chips
- [ ] URL reflects current filters (shareable)
- [ ] Project switcher in header works
- [ ] Saved views can be created and loaded
- [ ] Pre-built views available (By PWBS, By Work Package, By Case, By Pallet)
- [ ] `bun check` passes
- [ ] Verify responsive layout in browser at 375px and 1440px widths

## Branch Name Suggestion

`ralph/supply-list-core-views`
