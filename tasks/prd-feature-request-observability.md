# PRD: AI Feature Request Observability & Real-time Persistence

## Overview

The current feature request system stalls during AI generation with no visibility into what's happening. This PRD addresses three problems:

1. **No observability** - Developers can't see stream chunks, state transitions, or timing
2. **Late persistence** - PRD/stories only saved after user submits, risking data loss
3. **Single-shot generation** - Users can't iterate on generated content with new instructions

The solution introduces comprehensive dev tools, real-time Convex persistence from first chunk, and an iterative refinement workflow where users can resubmit with additional instructions.

## Goals

- Provide full-stack observability for debugging AI streaming issues
- Persist PRD and user stories to Convex immediately, updating incrementally as chunks arrive
- Enable iterative refinement by storing prompt history and allowing resubmission
- Auto-save user edits with debounce to prevent data loss
- Replace boolean `submitted` with `submittedAt` timestamp for cleaner semantics

## User Stories

- As a **developer**, I want to see raw stream chunks, parsed state, and timing in both console and a visual debug panel so that I can diagnose streaming issues
- As a **user**, I want my generated PRD saved immediately so that I don't lose work if my browser crashes
- As a **user**, I want to refine the generated PRD by providing additional instructions so that I can iterate toward the ideal output
- As a **user**, I want my edits auto-saved so that I never have to remember to click "Save"

## Functional Requirements

### Dev Tools & Observability

1. **Console Logging**: Log stream chunks with timestamps, state transitions (input→generating→review), and parsing results to browser console
2. **Visual Debug Panel**: Togglable panel showing:
   - Raw stream output (scrolling, monospace)
   - Parsed PRD/stories state
   - Chunk count, bytes received, elapsed time
   - Current parsing state (awaiting PRD_START, in PRD, awaiting STORIES_START, etc.)
3. **Server-side Logging**: Log request metadata, token usage, stream duration, and any errors in the API route

### Real-time Convex Persistence

4. **Create on First Chunk**: Call Convex `create` mutation when first chunk arrives, returning document ID
5. **Incremental Updates**: Update Convex document as content accumulates (debounced to avoid excessive writes)
6. **Render from Convex**: Use `useQuery` to fetch PRD/stories from Convex, not local state
7. **Edit with Mutation**: User edits trigger `useMutation` calls (debounced, auto-save on blur/change)

### Schema Changes

8. **Replace `submitted` boolean**: Remove any boolean submitted field; add `submittedAt: v.optional(v.number())` timestamp
9. **Add prompt history**: Add `prompts: v.array(v.object({ content: v.string(), createdAt: v.number() }))` to store all user instructions
10. **Add generation metadata**: Add `generationStatus: v.union(v.literal("idle"), v.literal("generating"), v.literal("complete"), v.literal("error"))` for UI state

### Iterative Refinement

11. **Resubmit Button**: Add "Refine with AI" button in review step that opens a prompt input
12. **Include Context in Resubmit**: When resubmitting, send to API:
    - Full prompt history array with explanation that these are iterative refinements
    - Current PRD content (as edited by user)
    - Current user stories (as edited by user)
13. **Append to Prompt History**: New instruction appended to `prompts` array in Convex before calling API
14. **Reset Generation Status**: Set `generationStatus` to "generating" during refinement, preserving existing content until new content streams in

## Non-Goals (Out of Scope)

- Version history / undo for individual edits (just prompt-level iterations)
- Collaborative editing (single author per request)
- Offline support
- Export to external formats (PDF, etc.)

## Design Considerations

### Debug Panel

- Floating panel, toggled via keyboard shortcut (Ctrl+Shift+D) or dev-only button
- Semi-transparent overlay, draggable/resizable
- Only visible in development mode (`process.env.NODE_ENV === 'development'`)

### Auto-save UX

- Subtle "Saving..." / "Saved" indicator near edited field
- Debounce: 500ms after last keystroke, immediate on blur
- No disruptive modals or toasts

### Refine Flow

- "Refine with AI" button appears in review step
- Opens inline text input (not modal) below current PRD
- Shows prompt history as collapsible list
- During regeneration, current content remains visible but greyed out
- New content streams in and replaces when complete

## Technical Considerations

### Dependencies

- No new dependencies; uses existing `@ai-sdk/react`, Convex, shadcn/ui

### Convex Schema Changes

```typescript
// convex/schema.ts - featureRequests table updates
featureRequests: defineTable({
  title: v.string(),
  description: v.string(), // Original description (first prompt)
  prdContent: v.optional(v.string()),
  userStories: v.optional(
    v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
        acceptanceCriteria: v.array(v.string()),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low"),
        ),
        storyPoints: v.optional(v.number()),
      }),
    ),
  ),
  status: v.union(
    v.literal("draft"),
    v.literal("submitted"),
    v.literal("in_review"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("in_progress"),
    v.literal("completed"),
  ),
  generationStatus: v.union(
    v.literal("idle"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error"),
  ),
  prompts: v.array(
    v.object({
      content: v.string(),
      createdAt: v.number(),
    }),
  ),
  submittedAt: v.optional(v.number()),
  authorId: v.string(),
  authorEmail: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});
```

### New Convex Mutations

```typescript
// New mutations needed:
createDraft: mutation; // Create with first prompt, generationStatus: "generating"
updateGeneratedContent: mutation; // Update prdContent/userStories during streaming
updateGenerationStatus: mutation; // Set idle/generating/complete/error
addPrompt: mutation; // Append new prompt to array
updatePrdContent: mutation; // User edits to PRD
updateUserStories: mutation; // User edits to stories
submit: mutation; // Set submittedAt = Date.now(), status = "submitted"
```

### API Route Changes

```typescript
// POST /api/ai/generate-prd
// Request body additions:
{
  description: string,
  prompts?: Array<{ content: string, createdAt: number }>, // For refinements
  currentPrd?: string, // Current PRD state for refinements
  currentStories?: UserStory[], // Current stories for refinements
  isRefinement?: boolean,
}

// System prompt adjustment for refinements:
// "The user has iteratively refined this feature request.
//  Previous instructions: [prompts array]
//  Current PRD: [currentPrd]
//  Current User Stories: [currentStories]
//  New instruction: [latest prompt]
//  Please update the PRD and user stories based on this new instruction..."
```

### Performance

- Debounce Convex updates during streaming (every 500ms or on section complete)
- Debounce auto-save edits (500ms after last change)
- Debug panel uses virtualized scrolling for raw stream output

## Acceptance Criteria

- [ ] Console logs show timestamped chunks, state transitions, and parse results
- [ ] Debug panel displays raw stream, parsed state, timing metrics
- [ ] Debug panel only appears in development mode
- [ ] Feature request document created in Convex on first stream chunk
- [ ] PRD and stories update in Convex as stream progresses
- [ ] UI renders PRD/stories from `useQuery`, not local state
- [ ] User edits auto-save with debounce, showing save indicator
- [ ] `submittedAt` timestamp set on submit (no boolean field)
- [ ] Prompt history stored in `prompts` array
- [ ] "Refine with AI" allows new instructions with full context
- [ ] Refinement includes prompt history and current content in API call
- [ ] `bun check` passes
- [ ] Verify all flows in browser

## Branch Name Suggestion

`ralph/feature-request-observability`

---

## Next Steps

1. Review this PRD in `tasks/prd-feature-request-observability.md`
2. Run `/ralph` to convert to prd.json for autonomous execution
