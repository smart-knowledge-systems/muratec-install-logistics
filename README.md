# Muratec Install Logistics

A comprehensive supply list management system for tracking Muratec manufacturing equipment from factory shipment in Japan through installation at US customer sites.

## Core Purpose

This application consolidates and manages supply list data from Muratec equipment installations, providing:

- **Multiple Views** on 16,000+ supply items organized by PWBS (Product Work Breakdown Structure) categories
- **Logistics Tracking** from factory departure through port transit to site delivery
- **Field Operations** for mobile workers: case move-in, inventory verification, parts picking
- **Project Scheduling** based on work packages (plNumbers) with PWBS dependency management
- **Installation Tracking** with item-level status and Earned Value Management (EVM) metrics

## Key Personas

| Persona            | Device         | Primary Workflows                        |
| ------------------ | -------------- | ---------------------------------------- |
| Import Coordinator | Desktop        | Shipment tracking, ETD/ETA updates       |
| Warehouse Manager  | Desktop/Tablet | Receiving, arrival planning, storage     |
| Project Scheduler  | Desktop        | PWBS/plNumber scheduling, Gantt views    |
| Site Manager       | Tablet         | Field ops dashboard, team coordination   |
| Move-in Team       | Mobile         | Case scanning, arrival confirmation      |
| Inventory Team     | Mobile         | Case verification, discrepancy reporting |
| Parts Picker       | Mobile         | Work package pick lists, kit assembly    |
| Installer          | Mobile         | Installation status, issue reporting     |
| Project Manager    | Desktop        | EVM dashboards, portfolio oversight      |

## Architecture

- **Data Hub**: M365 with Power Query for Excel consolidation from SharePoint
- **Backend**: Convex (real-time database)
- **Frontend**: Next.js 16 with React 19, App Router
- **Styling**: Tailwind CSS v4 with shadcn/ui components

## Feature PRDs

Detailed requirements in `tasks/`:

- `prd-supply-list-core-views.md` - Foundation views and filtering
- `prd-logistics-tracking.md` - Shipment tracking Japan→US
- `prd-field-operations.md` - Mobile workflows for field teams
- `prd-project-scheduling.md` - Work packages and Gantt charts
- `prd-installation-evm.md` - Install tracking and EVM dashboards

---

## AI Feature Request System

This project includes an AI-powered feature request system that generates PRDs and user stories using Claude. Key features:

- Streaming AI generation with real-time preview
- Rich text PRD editor with Tiptap
- Inline user story editing
- Auto-save with debouncing
- Refinement workflow for iterating on generated content

### Security Notice

> **⚠️ Development Only**: The current authentication system uses simple email-based localStorage auth for development purposes. **Do not deploy to production** without implementing proper authentication (OAuth, Clerk, NextAuth, etc.).
>
> See `docs/dev-log/plan-auth-sprint.md` for the authentication implementation plan.

## Getting Started

```bash
# Install dependencies
bun install

# Start development server (Next.js + Convex)
bun dev

# Or run Convex separately for debugging
bunx convex dev    # Terminal 1
bun run next dev   # Terminal 2
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Development

```bash
bun check      # Lint + typecheck
bun lint       # ESLint only
bun typecheck  # TypeScript only
bun format     # Prettier formatting
bun build      # Production build
bun preview    # Build + start preview
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (AI generation)
│   └── feature-requests/  # Feature request UI
├── components/
│   ├── ui/                # shadcn/ui primitives (do not modify)
│   └── feature-request/   # Feature-specific components
└── lib/
    ├── supply-list/       # Excel parsing library
    └── ai/                # AI response parsing

convex/                    # Convex backend
├── schema.ts             # Database schema
├── featureRequests.ts    # Feature request mutations/queries
└── users.ts              # User management

tasks/                     # Feature PRDs for development
docs/                      # Architecture decisions and dev logs
```
