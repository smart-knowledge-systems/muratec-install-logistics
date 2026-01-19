# PRD: User Stories Review UX Improvements

## Overview

Improve the user stories and PRD review experience by making user stories the primary focus with inline editing capabilities, collapsible cards, and a condensed PRD view. Track user interactions with analytics stored in Convex.

## Goals

- Make user stories the prominent element in the review flow
- Enable direct field-by-field editing without JSON exposure
- Reduce visual clutter with collapsible UI patterns
- Capture analytics on user engagement (read more clicks, field edits)

## User Stories

- As a feature requester, I want to edit user story fields directly in textareas so that I don't have to understand JSON structure
- As a feature requester, I want to see user stories prominently so that I can review and refine them quickly
- As a feature requester, I want to collapse/expand individual stories so that I can focus on one at a time
- As a product owner, I want to see analytics on PRD engagement so that I can understand how users interact with generated content

## Functional Requirements

### User Stories Display

1. User stories must be displayed prominently above the PRD section
2. First user story must be expanded by default; remaining stories collapsed
3. Each story card must be collapsible/expandable on click
4. Collapsed state must show story title and priority badge only
5. Editing must only be available for requests in `draft` or `in_review` status

### User Stories Editing

6. Each user story field must be editable via textarea/input (no JSON view)
7. Editable fields: `title`, `asA`, `iWant`, `soThat`, `acceptanceCriteria`, `priority`, `estimatedEffort`
8. Acceptance criteria must be editable as individual items with add/remove capability
9. Priority must use a select/dropdown component
10. Estimated effort must use a select/dropdown component
11. Changes must auto-save (existing auto-save pattern)
12. JSON view toggle must be removed from the user-facing interface

### PRD Display

13. PRD section must show only the title/overview section by default (first heading + first paragraph)
14. A "Read More" button must expand to show the full PRD content
15. PRD must remain collapsed until user clicks "Read More"
16. Expanded state must persist during the session (not saved to DB)

### Analytics Tracking

17. Create a new `analytics` table in Convex schema
18. Track "read more" click events with count per feature request
19. Track edit events by field type with count per feature request
20. Analytics must include: `featureRequestId`, `eventType`, `fieldType` (optional), `count`, `updatedAt`
21. Increment counts on each interaction (not individual event logs)

## Non-Goals (Out of Scope)

- Session-based analytics (user sessions, time spent)
- Scroll depth tracking
- Abandonment tracking
- User preference persistence for collapse states
- Analytics dashboard/visualization UI
- Export of analytics data

## Design Considerations

### Layout

- User Stories section: Full width, above PRD
- Each story: Card with expand/collapse chevron icon
- Collapsed card: Title + priority badge inline
- Expanded card: All fields in a form layout with labels

### Form Layout for Expanded Story

```
┌─────────────────────────────────────────────────┐
│ ▼ [Title input field]            [Priority ▼]  │
├─────────────────────────────────────────────────┤
│ As a: [textarea]                                │
│ I want: [textarea]                              │
│ So that: [textarea]                             │
│ Effort: [XS/S/M/L/XL dropdown]                  │
│ Acceptance Criteria:                            │
│   • [criterion 1 input] [×]                     │
│   • [criterion 2 input] [×]                     │
│   [+ Add criterion]                             │
└─────────────────────────────────────────────────┘
```

### PRD Section

```
┌─────────────────────────────────────────────────┐
│ ## PRD: Feature Name                            │
│                                                 │
│ Brief overview paragraph from the PRD...        │
│                                                 │
│ [Read More ▼]                                   │
└─────────────────────────────────────────────────┘
```

### Component Reuse

- Extend existing `user-stories-editor.tsx` patterns
- Use shadcn/ui `Collapsible` component for expand/collapse
- Use existing `prd-editor.tsx` markdown rendering
- Leverage existing auto-save hook

## Technical Considerations

### Convex Schema Addition

```typescript
// New table in convex/schema.ts
analytics: defineTable({
  featureRequestId: v.id("featureRequests"),
  eventType: v.union(
    v.literal("prd_read_more"),
    v.literal("story_field_edit"),
  ),
  fieldType: v.optional(v.string()), // e.g., "title", "asA", "acceptanceCriteria"
  count: v.number(),
  updatedAt: v.number(),
}).index("by_feature_request", ["featureRequestId"])
  .index("by_event_type", ["eventType"]),
```

### New Convex Mutations

```typescript
// convex/analytics.ts
incrementEventCount(featureRequestId, eventType, fieldType?)
getAnalytics(featureRequestId)
```

### Component Changes

- `user-stories-editor.tsx`: Remove JSON view, add collapsible cards, inline form editing
- `prd-editor.tsx`: Add "Read More" truncation with overview extraction
- `streaming-display.tsx`: Update to use new collapsible story display
- New: `collapsible-story-card.tsx` component

### PRD Overview Extraction

Parse markdown to extract first H1/H2 heading and first paragraph for the collapsed view.

## Acceptance Criteria

- [ ] User stories display above PRD in review phase
- [ ] First story expanded by default, others collapsed
- [ ] Story cards collapse/expand on click with animation
- [ ] All story fields editable via form inputs (no JSON)
- [ ] PRD shows only overview until "Read More" clicked
- [ ] "Read More" click increments analytics count in Convex
- [ ] Field edits increment analytics count by field type
- [ ] Editing only available for draft/in_review status
- [ ] Auto-save works for all field edits
- [ ] `bun check` passes
- [ ] Verify in browser: collapse/expand animations smooth
- [ ] Verify in browser: analytics counts increment correctly

## Branch Name Suggestion

`feat/user-stories-review-ux`
