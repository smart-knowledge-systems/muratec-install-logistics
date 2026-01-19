# Git Commit Style Guide

This guide establishes commit message conventions for the Muratec Install Logistics codebase. It's designed for a codebase primarily maintained by Claude Code with human oversight, where commit history serves as critical documentation for future developers and LLM agents.

## Quick Reference

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**

```
feat(supply-list): add continuation row linking for packing splits

Items can be split across multiple shipping cases (梱包分割). This adds
logic to detect continuation rows and copy parent item data to them,
enabling queries by itemNumber to return all related packing entries.

Decision: Denormalize at Convex ingest time rather than Power Query
to keep M language simple and make TypeScript logic testable.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Format Rules

### Subject Line (Required)

- **Max 50 characters** - Truncated in most git tools otherwise
- **Imperative mood** - "Add feature" not "Added feature" or "Adds feature"
- **No period** at the end
- **Lowercase** after the type prefix

### Body (When Needed)

- **Blank line** between subject and body
- **Wrap at 72 characters**
- **Explain "why", not "what"** - The diff shows what changed; the message explains the reasoning
- Include context that won't be obvious from code alone

### Footer (When Applicable)

- `Co-Authored-By:` for AI-assisted commits
- `BREAKING CHANGE:` for breaking changes
- `Refs:` for issue/PR references
- `Closes:` for auto-closing issues

---

## Type Prefixes

| Type       | When to Use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature or capability                               |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or correcting tests                              |
| `build`    | Changes to build process or dependencies                |
| `ci`       | CI/CD configuration changes                             |
| `chore`    | Maintenance tasks (formatting, config updates)          |
| `revert`   | Reverting a previous commit                             |

---

## Project-Specific Scopes

Use these scopes to indicate which part of the codebase is affected:

| Scope         | Directory/Area                                   |
| ------------- | ------------------------------------------------ |
| `supply-list` | `src/lib/supply-list/*` - Excel parsing pipeline |
| `convex`      | `convex/*` - Database functions and schema       |
| `ui`          | `src/components/*` - React components            |
| `api`         | `src/app/api/*` - Route handlers                 |
| `auth`        | Authentication-related code                      |
| `ai`          | AI/LLM integration (AI SDK, prompts)             |
| `parser`      | Specifically `parsers/*` within supply-list      |
| `validator`   | Specifically `validators/*` within supply-list   |

**Multiple scopes:** Use the most specific single scope, or omit if changes span many areas.

---

## Decision Documentation

### When to Include Context in Commit Body

Include architectural context when:

1. **Choosing between alternatives** - Document what you chose and why
2. **Non-obvious implementations** - Explain the reasoning behind unusual code
3. **Domain-specific logic** - Especially for Japanese manufacturing terminology
4. **Breaking from conventions** - Justify departures from established patterns

### Decision Documentation Pattern

```
feat(supply-list): implement deletion detection via strike-through

Excel files mark deleted items with strike-through formatting OR by
adding "削除" to the description. Both patterns must be detected.

Alternatives considered:
- Filter deleted rows entirely: Rejected - audit trail needed
- Separate deleted items table: Over-engineered for current needs

Decision: Mark rows with `isDeleted: true` and preserve in dataset.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Linking to Extended Documentation

For major architectural decisions, reference the dev-log:

```
feat(convex): add featureRequests table with status workflow

Implements database schema for AI-generated feature requests.
Supports draft → review → approved → in-progress → done workflow.

See docs/dev-log/feature-request-system.md for full architecture.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## AI-Assisted Workflow Guidelines

### Co-Authored-By Convention

All commits generated with Claude Code assistance must include:

```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

This provides transparency and helps trace AI-generated code for auditing.

### Commit Granularity with AI

When Claude Code generates multiple changes:

1. **Prefer atomic commits** - One logical change per commit
2. **Use commits as save points** - Easier to revert AI missteps
3. **Don't batch unrelated changes** - Even if generated in one session

**Good:**

```
feat(parser): extract header metadata from rows 4 and 6
refactor(parser): separate filename parsing into dedicated module
fix(validator): handle missing partNumber gracefully
```

**Avoid:**

```
feat: implement parsing improvements and fixes
```

### Human Review Requirements

Before committing AI-generated code:

1. **Verify the change matches intent** - AI may over-engineer
2. **Check for security issues** - Injection, secrets exposure
3. **Ensure tests pass** - Run `bun check` before committing
4. **Review type safety** - AI sometimes uses `any` or unsafe casts

---

## Examples

### Good Commit Messages

```
feat(supply-list): parse packing split continuation rows

Continuation rows contain "ItemNo.XXX 梱包分割" in description but lack
item/part numbers. This detects the pattern and links to parent rows.

Business context: Manufacturing packing lists split large items across
multiple shipping cases. The full item info appears once, with
subsequent rows showing only case allocation details.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

```
fix(validator): return partial data on Zod validation failure

Previously, validation errors caused entire rows to be dropped.
Now returns partial SupplyItem with nulls for failed fields.

Why: Source Excel files have inconsistent data quality. Graceful
degradation preserves usable data while logging specific failures.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

```
refactor(api): migrate from fetch to AI SDK streamText

Replaces manual streaming implementation with Vercel AI SDK.
Reduces boilerplate and provides better TypeScript types.

No behavior change - same API contract, better internals.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

```
docs: add architecture decision record for M365 vs Dataverse

Documents why we chose Power Query + Next.js over Power Platform.
Key factor: Dataverse requires premium licensing not available.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Poor Commit Messages (Avoid)

```
fix: bug fix
```

_Why it's bad: No context about what was fixed or why_

```
feat: add stuff
```

_Why it's bad: Meaningless description_

```
WIP
```

_Why it's bad: Commits should be complete, not work-in-progress_

```
feat(supply-list): add isDeleted property to SupplyItem schema,
update parser to detect strike-through formatting, modify validator
to handle deletion cases, add tests for all scenarios
```

_Why it's bad: Too long, batches multiple changes, should be separate commits_

---

## Commit Message Checklist

Before committing, verify:

- [ ] Subject line is 50 chars or less
- [ ] Uses imperative mood ("Add" not "Added")
- [ ] Type prefix is appropriate
- [ ] Scope matches affected code area
- [ ] Body explains "why" (if body included)
- [ ] `Co-Authored-By` included for AI-assisted commits
- [ ] `bun check` passes
- [ ] Commit is atomic (one logical change)

---

## References

- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [How to Write a Git Commit Message](https://cbea.ms/git-commit/)
- [LLM Coding Workflow - Addy Osmani](https://addyosmani.com/blog/ai-coding-workflow/)
