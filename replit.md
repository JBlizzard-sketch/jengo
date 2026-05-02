# Jengo — Building Community Management Platform

A full-stack building management platform for Nairobi apartment blocks (Kilimani, Westlands, Lavington, South B).

## Architecture

- **Frontend**: React + Vite (artifact: `jengo`) at path `/`
- **Backend**: Express 5 + Drizzle ORM (artifact: `api-server`) at path `/api`
- **Database**: PostgreSQL (Replit-provisioned, via `DATABASE_URL`)
- **API contract**: OpenAPI spec → Orval codegen → React Query hooks
- **Monorepo**: pnpm workspaces

## Key Packages

| Package | Purpose |
|---|---|
| `@workspace/jengo` | React + Vite frontend |
| `@workspace/api-server` | Express 5 backend |
| `@workspace/db` | Drizzle ORM schema + migrations |
| `@workspace/api-spec` | OpenAPI spec + Orval codegen |
| `@workspace/api-client-react` | Generated React Query hooks |
| `@workspace/api-zod` | Generated Zod schemas |

## Frontend Pages

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

## Backend Routes

All routes under `/api`:
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

## Database Schema (8 tables)

`buildings`, `units`, `residents`, `issues`, `issue_comments`, `announcements`, `visitors`, `payments`, `contractors`, `jobs`

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

## Hook Pattern

```tsx
import { useListBuildings, getListBuildingsQueryKey } from "@workspace/api-client-react";
const { data } = useListBuildings({ query: { queryKey: getListBuildingsQueryKey() } });
```

## Seeded Data

- 4 buildings (Kilimani Heights, Westlands Park, Lavington Court, South B Gardens)
- 9 residents, 11 units, 6 issues, 4 announcements, 5 visitors, 12 payments, 5 contractors, 4 jobs
