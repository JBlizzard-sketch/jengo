# Jengo — Building Community Management Platform

A full-stack building management platform for Nairobi apartment blocks (Kilimani, Westlands, Lavington, South B).

## Architecture

- **Frontend**: React + Vite (artifact: `jengo`) at path `/`
- **Backend**: Express 5 + Drizzle ORM (artifact: `api-server`) at path `/api`
- **Database**: PostgreSQL (Replit-provisioned, via `DATABASE_URL`)
- **Session store**: `connect-pg-simple` → `sessions` table in PostgreSQL
- **API contract**: OpenAPI spec → Orval codegen → React Query hooks
- **Monorepo**: pnpm workspaces
- **GitHub**: https://github.com/JBlizzard-sketch/jengo

## Key Packages

| Package | Purpose |
|---|---|
| `@workspace/jengo` | React + Vite frontend |
| `@workspace/api-server` | Express 5 backend |
| `@workspace/db` | Drizzle ORM schema + migrations |
| `@workspace/api-spec` | OpenAPI spec + Orval codegen |
| `@workspace/api-client-react` | Generated React Query hooks |
| `@workspace/api-zod` | Generated Zod schemas |

## Management Dashboard Pages

| Route | Component | Description |
|---|---|---|
| `/` | `Dashboard` | Platform summary, metrics, building scores |
| `/buildings` | `Buildings` | All buildings grid |
| `/buildings/:id` | `BuildingDetail` | Units, residents, issues per building |
| `/issues` | `Issues` | Issues list with status/category/priority filters |
| `/issues/new` | `NewIssue` | Submit new issue form |
| `/issues/:id` | `IssueDetail` | Issue detail, status updates, comments |
| `/announcements` | `Announcements` | Notice board with pin/unpin, create |
| `/visitors` | `Visitors` | Pre-clearance and check-in/out management |
| `/payments` | `Payments` | Service charge tracking and recording |
| `/contractors` | `Contractors` | Contractors and commissioned jobs |

## Resident Portal Pages (Phase 2)

| Route | Component | Description |
|---|---|---|
| `/portal` | `PortalLogin` | Resident sign-in (email + unit number) |
| `/portal/dashboard` | `PortalDashboard` | My unit, building contacts, open issues, payments |
| `/portal/issues` | `PortalIssues` | View own issues, submit new issue |
| `/portal/payments` | `PortalPayments` | View own service charge history |
| `/portal/announcements` | `PortalAnnouncements` | Building notices (read-only) |
| `/portal/visitors` | `PortalVisitors` | Pre-clear visitors for gate entry |

### Portal Auth
- Login: `POST /api/auth/login` — email + unit number → session cookie
- Session stored in PostgreSQL `sessions` table (7-day cookie)
- `ResidentAuthProvider` context in `artifacts/jengo/src/contexts/resident-auth.tsx`
- `PortalGuard` component redirects unauthenticated users to `/portal`
- Test credentials: `david.karanja@gmail.com` / unit `A1` (Kilimani Heights)

## Backend Routes

All routes under `/api`:

### Auth (Phase 2)
- `POST /api/auth/login` — login by email + unit number; sets session cookie
- `POST /api/auth/logout` — destroy session
- `GET /api/auth/me` — return current resident session

### Platform Administration (Phase 6)
- Buildings list — "Add Building" button opens full creation dialog (name, address, neighbourhood, units, service charge, caretaker)
- Building Detail — "Edit" button opens edit dialog (update name, address, caretaker, service charge)
- Building Detail → Units tab — "Add Unit" button opens creation dialog (unit number, floor, bedrooms, status, monthly rent)
- Global Search palette (Ctrl/Cmd+K or Search bar in sidebar) — searches buildings, residents, and issues live; keyboard navigable (↑↓ + Enter)

### Analytics & Operations (Phase 5)
- Dashboard now shows 3 recharts charts: Issues by Category (donut), Payment Collection (bar), Building Scores (horizontal bar)
- `POST /api/payments/bulk-generate` — generate monthly service charges for all active residents in a building (buildingId, month YYYY-MM, dueDate, optional overrideAmount)
- Management Issue Detail — contractor assignment dropdown (replaces freetext), lists all contractors from DB
- Payments page — "Generate Charges" button opens dialog: select building, month, due date → creates one pending charge per active resident

### Gate Security Terminal (Phase 4)
- `POST /api/gate/auth` — guard logs in with PIN (default: `1234`, set `GATE_PIN` env var to override)
- `GET /api/gate/me` — check gate session
- `POST /api/gate/logout` — lock terminal
- `GET /api/gate/visitors` — today's visitors across all buildings with unit/resident/building info
- `PATCH /api/gate/visitors/:id/checkin` — check a visitor in (sets `checked_in` + timestamp)
- `PATCH /api/gate/visitors/:id/checkout` — check out (sets `checked_out` + timestamp)
- `PATCH /api/gate/visitors/:id/deny` — deny entry

### Portal (resident-scoped, Phase 2 + 3)
- `GET /api/portal/home` — dashboard data (unit, building, stats, recent issues/payments/announcements)
- `GET /api/portal/issues` — resident's own issues
- `GET /api/portal/issues/:id` — single issue + comments thread
- `POST /api/portal/issues` — submit new issue
- `POST /api/portal/issues/:id/comments` — resident adds comment to own issue
- `GET /api/portal/payments` — resident's payments
- `POST /api/portal/payments/:id/submit-mpesa` — submit M-Pesa ref for management verification
- `GET /api/portal/announcements` — building announcements
- `GET /api/portal/visitors` — resident's visitors
- `POST /api/portal/visitors` — pre-clear a visitor

### Management
- `GET /api/healthz` — health check
- `GET/POST /api/buildings` — list and create buildings
- `GET/PATCH /api/buildings/:id` — building detail and update
- `GET/POST /api/buildings/:id/units` — units per building
- `GET/PATCH /api/units/:id` — unit detail and update
- `GET/POST /api/residents` — residents
- `GET/PATCH /api/residents/:id` — resident detail
- `GET/POST /api/issues` — issues with filters (status, priority, category, buildingId)
- `GET /api/issues/summary` — aggregate stats
- `PATCH /api/issues/:id` — update status, assign, resolve
- `GET/POST /api/issues/:id/comments` — issue comments
- `GET/POST /api/announcements` — announcements with pin support
- `PATCH/DELETE /api/announcements/:id` — update/delete
- `GET/POST /api/visitors` — visitor pre-clearance
- `GET /api/visitors/today` — today's visitor summary
- `PATCH /api/visitors/:id` — check-in, check-out, deny
- `GET/POST /api/payments` — payments with filters
- `GET /api/payments/summary` — collection stats
- `PATCH /api/payments/:id` — record payment (M-Pesa, bank transfer, cash)
- `GET/POST /api/contractors` — contractor registry
- `GET/POST /api/jobs` — commissioned jobs
- `PATCH /api/jobs/:id` — advance job status
- `GET /api/dashboard/summary` — platform-wide KPIs
- `GET /api/dashboard/activity` — recent activity feed
- `GET /api/dashboard/building-scores` — reputation scores

## Database Schema (10 tables)

`buildings`, `units`, `residents`, `issues`, `issue_comments`, `announcements`, `visitors`, `payments`, `contractors`, `jobs`, `sessions`

## Design System

- **Primary**: Orange-brown `hsl(24 75% 45%)` (Nairobi earth tones)
- **Background**: `hsl(36 33% 97%)` warm off-white
- **Sidebar**: `hsl(36 30% 95%)` warm cream
- **Font**: Inter
- **Components**: shadcn/ui (Card, Button, Dialog, Select, Form, Tabs, Badge, Sheet)

## Codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

Regenerates `@workspace/api-client-react` and `@workspace/api-zod` from the OpenAPI spec.

## DB Migrations

```bash
pnpm --filter @workspace/db run push
```

## GitHub Sync

```bash
node scripts/src/github-sync.mjs "commit message"
```

## Hook Pattern (management pages)

```tsx
import { useListBuildings, getListBuildingsQueryKey } from "@workspace/api-client-react";
const { data } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
```

## Portal fetch pattern (portal pages — no generated hooks)

```tsx
const res = await fetch("/api/portal/home", { credentials: "include" });
const data = await res.json();
```

## Seeded Data

- 4 buildings (Kilimani Heights, Westlands Park, Lavington Court, South B Gardens)
- 9 residents, 11 units, 6 issues, 4 announcements, 5 visitors, 12 payments, 5 contractors, 4 jobs
- Test resident: `david.karanja@gmail.com` / unit `A1`
