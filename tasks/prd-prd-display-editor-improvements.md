# PRD: Improve PRD Display and Editor Experience

## Overview

The feature request PRD display currently shows bolded text but not headings (h1, h2, h3, etc.), making the document difficult to read and navigate. Additionally, the edit mode uses a raw markdown textarea, which is unfriendly for users who don't know markdown syntax. This PRD addresses both issues by fixing the typography/prose styles and implementing an inline markdown preview editor (similar to Notion).

## Goals

- Fix heading display in PRD preview so h1-h6 render with proper visual hierarchy
- Replace raw markdown textarea with an inline markdown editor that shows formatting as you type
- Maintain auto-save functionality in the new editor
- Keep the existing tab-based preview/edit UI pattern

## User Stories

- As a feature requester, I want to see PRD headings displayed with proper sizes so that I can quickly scan and navigate the document structure
- As a feature requester, I want to edit PRD content with inline formatting so that I don't need to know markdown syntax

## Functional Requirements

1. **Typography Fix**: The system must display markdown headings (h1-h6) with distinct visual styling (font size, weight, spacing)
2. **Typography Fix**: The system must style all markdown elements properly (lists, code blocks, blockquotes, links, tables)
3. **Inline Editor**: The edit mode must show formatted text as the user types (headings, bold, italic render inline)
4. **Inline Editor**: The system must provide keyboard shortcuts for common formatting (Ctrl+B for bold, Ctrl+I for italic, etc.)
5. **Inline Editor**: The system should provide a minimal floating toolbar for formatting options when text is selected
6. **Data Format**: The system must continue to store PRD content as markdown for compatibility
7. **Auto-save**: The editor must integrate with the existing auto-save mechanism (500ms debounce)

## Non-Goals (Out of Scope)

- Collaborative real-time editing
- Image upload/embedding
- Complex table editing
- Custom block types beyond standard markdown
- Changing the user stories editor (only PRD editor changes)

## Design Considerations

- Use Tiptap editor with markdown extension for inline markdown preview experience
- Keep the existing Card/Tabs UI structure
- Maintain dark mode support via prose-invert or editor theme
- Editor should match the visual style of the preview (same prose styling)
- Floating toolbar should be minimal: bold, italic, heading levels, bullet list, numbered list, code

## Technical Considerations

### Dependencies

- Add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`
- Consider `tiptap-markdown` for markdown serialization/deserialization

### Typography Fix

The current issue is that Tailwind CSS v4 doesn't include the typography plugin by default. Options:

1. Add `@tailwindcss/typography` plugin and configure prose styles
2. Create custom heading styles in globals.css targeting `.prose h1`, `.prose h2`, etc.

Recommended: Add typography plugin for comprehensive markdown styling.

### Component Changes

- `src/components/feature-request/prd-editor.tsx` - Replace textarea with Tiptap editor
- `src/app/globals.css` - Add typography plugin or custom prose styles
- New component: `src/components/ui/tiptap-editor.tsx` - Reusable rich text editor

### Data Flow

- Editor receives markdown string, converts to Tiptap document
- On change, serialize back to markdown for auto-save
- No database schema changes needed

## Acceptance Criteria

- [ ] Headings (h1-h6) display with distinct sizes and weights in PRD preview
- [ ] Lists, code blocks, and blockquotes render with proper styling
- [ ] Edit mode shows inline formatting (typing `# Hello` shows it as a heading)
- [ ] Bold (Ctrl+B) and italic (Ctrl+I) keyboard shortcuts work
- [ ] Auto-save continues to work with save indicator showing status
- [ ] Dark mode styling works correctly
- [ ] Existing PRD content loads and displays correctly in new editor
- [ ] bun check passes

## Branch Name Suggestion

`feat/prd-editor-rich-text`
