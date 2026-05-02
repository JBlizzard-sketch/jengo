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

### Resident Detail Page (Phase 11)
- **Resident Detail page** (`/residents/:id`) — every resident row in the Residents list is now a clickable card with a chevron (Move Out button stops propagation so it still works). The detail page shows: initials avatar in Jengo orange, name, Active/Pending/Inactive badge, Owner-occupier tag, Move Out button; 3 summary cards (Total Paid in green, Overdue in red when > 0, Open Issues in amber when > 0); Unit & Building info card with clickable deep-links to Unit Ledger and Building Detail; Contact Details card with inline hover-to-edit for phone and email (pencil icon appears on hover, saves via PATCH); full Payment History (status badge, amount, due date, paid date, M-Pesa ref); and open building issues list with links to issue detail.

### Issue SLA & Contractor Job Detail (Phase 10)
- **Issue SLA tracking** — Issues list now shows age of every issue (e.g. "7h", "2d") with a clock icon. Issues open/in-progress for ≥ 48 hours get a red "SLA" badge on the row. A 5th summary card shows the total SLA breach count (highlighted red when > 0). A "Newest first / Oldest first" toggle lets management surface the oldest unresolved issues instantly.
- **Contractor Job Detail page** (`/contractors/jobs/:id`) — every job row in the Contractors list is now a clickable card with a chevron. The detail page shows: a 4-step visual progress stepper (Quoted → Approved → In Progress → Completed), building + contractor info cards, dates card (created, scheduled, completed), amounts card (quoted vs final — with inline "Set Final" editing), description, inline-editable completion notes, "Mark [next status]" button, and linked Issue shortcut if the job was created from an issue.

### Unit Ledger & Settings (Phase 9)
- **Unit Ledger page** (`/buildings/:id/units/:unitId`) — every unit row in building detail is now a clickable link (chevron indicator) leading to a full per-unit view: unit header (number, floor, bedrooms, status, rent), current resident card (name, phone, email, move-in date), 4 financial summary cards (Collected / Overdue / Outstanding / Collection Rate), open issues list for the building, and a complete payment history table with totals row
- **Settings page** (`/settings`, new sidebar item) — editable company profile (name, phone, email, office address), M-Pesa paybill + account prefix configuration, payment policy (grace period days, late-fee percentage); all saved to localStorage
- **Add Resident** button added to the global Residents page — opens a dialog to select building → units load dynamically → fill name, phone, email, move-in date, owner toggle; creates the resident without leaving the page

### Operations Tooling (Phase 8)
- **Collection Reports page** (`/reports` in sidebar) — month selector (last 12 months + All Time), 4 summary cards, per-building table (Total Charged / Collected / Overdue / Pending / Collection Rate) with colour-coded rate, Platform Total footer row, Export CSV button
- **Mark Overdue button** on Payments page — calls `POST /api/payments/mark-overdue` which bulk-updates all `pending` charges past their due date to `overdue`, then refreshes counts
- **Create Work Order from Issue** — amber "Work Order" card on Issue Detail page; clicking opens a dialog pre-filled with the issue title, lets management pick a contractor, optionally set quote + scheduled date, and creates a linked job in Contractors

### Resident Management & Exports (Phase 7)
- New `/residents` page in sidebar — all residents across every building in one view
- Search by name, phone, or email; filter by building and status
- Summary cards: Active / Pending / Moved Out counts
- "Move Out" action per resident → confirmation dialog → sets status to inactive, excluded from future bulk charges
- Payments page — "Export CSV" button downloads filtered payment records as a properly escaped CSV (month, description, amount, status, due date, paid date, method, M-Pesa ref, building)

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

## Phase History

| Phase | Features |
|---|---|
| 1–8 | Core CRUD: buildings, units, residents, issues, payments, visitors, contractors, announcements, portal |
| 9 | Unit Ledger, Settings page, Add Resident dialog, clickable unit rows |
| 10 | Issue SLA tracking (age labels, red badge ≥48h), Contractor Job Detail (stepper, notes, status progression) |
| 11 | Resident Detail page (avatar, summary cards, inline edit, payment history, open issues), Move Out button |
| 12 | Contractor star rating on completed jobs (`PATCH /api/contractors/:id`), Payment Waive button, Announcement search + category filter, TS clean-up |
