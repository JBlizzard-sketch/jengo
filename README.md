# Jengo — Building Community Management Platform

> A full production-grade platform for managing Nairobi apartment blocks across Kilimani, Westlands, Lavington, and South B.

Jengo replaces the fragmented combination of WhatsApp groups, Excel sheets, and word-of-mouth that most Nairobi buildings rely on. It gives property managers, caretakers, and residents a single platform to track issues, collect service charges, manage visitors, post announcements, and oversee contractor jobs — all with real-time data and a clear building reputation score.

---

## Features

### Management Dashboard
- Platform-wide KPIs: total buildings, open issues, collection rate, total residents
- Per-building reputation scores (0–10)
- Real-time activity feed

### Buildings
- Full property registry with neighbourhood, caretaker, management company, and service charge
- Per-building unit list with occupancy status and monthly rent
- Per-building resident directory, active issues, and reputation score

### Issue Tracker
- Submit issues with category (noise, maintenance, parking, security, utility, visitor, other), priority (low → urgent), and optional photo/audio evidence URL
- Status workflow: Open → In Progress → Resolved → Closed
- Threaded comment system with author roles (resident, caretaker, management, security)
- Summary metrics: open, in-progress, resolved counts and average resolution time

### Notice Board
- Replace the building WhatsApp group with an official digital notice board
- Post announcements with categories: General, Maintenance, Utility, Emergency, Event, AGM
- Pin/unpin important announcements
- Per-building scoping

### Visitor Management
- Resident pre-clearance of expected visitors with name, phone, ID number, purpose, date & time
- Security gate workflow: Pending → Approved → Checked In → Checked Out (or Denied)
- Today's visitor summary dashboard per building

### Service Charge Payments
- Track service charge payments per unit per month
- Record M-Pesa (with transaction reference), bank transfer, or cash payments
- Collection rate, overdue, outstanding, and total collected metrics
- Filter by building and payment status

### Contractors & Jobs
- Contractor registry with trade (plumbing, electrical, carpentry, cleaning, etc.) and star rating
- Commission jobs with quoted amount, scheduled date, and notes
- Job workflow: Quoted → Approved → In Progress → Completed
- Track final vs quoted amounts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 7 + TypeScript |
| Routing | Wouter |
| State & Data | TanStack Query (React Query) |
| UI Components | shadcn/ui + Tailwind CSS v4 |
| Backend | Express 5 + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| API Contract | OpenAPI 3.0 → Orval codegen |
| Monorepo | pnpm workspaces |

---

## Monorepo Structure

```
jengo/
├── artifacts/
│   ├── jengo/              # React + Vite frontend (served at /)
│   └── api-server/         # Express 5 backend (served at /api)
├── lib/
│   ├── db/                 # Drizzle ORM schema + migrations
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   └── api-zod/            # Generated Zod validation schemas
├── scripts/                # Utility scripts (e.g. seed, git-push)
├── pnpm-workspace.yaml
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (set `DATABASE_URL` env var)

### Install Dependencies

```bash
pnpm install
```

### Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

### Seed Sample Data

```bash
pnpm --filter @workspace/db run seed
```

### Run Development Servers

Frontend (port 25552):
```bash
pnpm --filter @workspace/jengo run dev
```

API Server (port 8080):
```bash
pnpm --filter @workspace/api-server run dev
```

### Regenerate API Client

After editing `lib/api-spec/src/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## API Endpoints

All endpoints are prefixed with `/api`.

### Buildings
| Method | Path | Description |
|---|---|---|
| GET | `/buildings` | List all buildings |
| POST | `/buildings` | Create a building |
| GET | `/buildings/:id` | Get building detail |
| PATCH | `/buildings/:id` | Update building |
| GET | `/buildings/:id/units` | List units in building |
| POST | `/buildings/:id/units` | Create unit |

### Residents
| Method | Path | Description |
|---|---|---|
| GET | `/residents` | List residents (filter: buildingId, unitId, status) |
| POST | `/residents` | Create resident |
| GET | `/residents/:id` | Get resident |
| PATCH | `/residents/:id` | Update resident |

### Issues
| Method | Path | Description |
|---|---|---|
| GET | `/issues` | List issues (filter: buildingId, status, priority, category) |
| GET | `/issues/summary` | Aggregate stats |
| POST | `/issues` | Create issue |
| GET | `/issues/:id` | Get issue detail |
| PATCH | `/issues/:id` | Update status, assign, resolve |
| GET | `/issues/:id/comments` | List comments |
| POST | `/issues/:id/comments` | Add comment |

### Announcements
| Method | Path | Description |
|---|---|---|
| GET | `/announcements` | List announcements (filter: buildingId, category, isPinned) |
| POST | `/announcements` | Create announcement |
| PATCH | `/announcements/:id` | Update (pin/unpin) |
| DELETE | `/announcements/:id` | Delete |

### Visitors
| Method | Path | Description |
|---|---|---|
| GET | `/visitors` | List visitors (filter: buildingId, date, status) |
| GET | `/visitors/today` | Today's summary by building |
| POST | `/visitors` | Pre-clear visitor |
| PATCH | `/visitors/:id` | Check in / check out / deny |

### Payments
| Method | Path | Description |
|---|---|---|
| GET | `/payments` | List payments (filter: buildingId, status, month) |
| GET | `/payments/summary` | Collection stats |
| POST | `/payments` | Create payment record |
| PATCH | `/payments/:id` | Record payment |

### Contractors & Jobs
| Method | Path | Description |
|---|---|---|
| GET | `/contractors` | List contractors |
| POST | `/contractors` | Add contractor |
| GET | `/jobs` | List jobs |
| POST | `/jobs` | Commission job |
| PATCH | `/jobs/:id` | Advance job status |

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/summary` | Platform-wide KPIs |
| GET | `/dashboard/activity` | Recent activity feed |
| GET | `/dashboard/building-scores` | Reputation scores per building |

---

## Database Schema

```
buildings         → core property registry
units             → individual apartment units
residents         → resident profiles linked to units
issues            → community issue tracker
issue_comments    → threaded comments on issues
announcements     → notice board posts
visitors          → pre-cleared visitor log
payments          → service charge payment records
contractors       → contractor registry
jobs              → commissioned work orders
```

---

## Design System

Jengo uses a warm Nairobi earth-tone palette:

| Token | Value | Usage |
|---|---|---|
| Primary | `hsl(24 75% 45%)` | Orange-brown — CTAs, active nav, accent |
| Background | `hsl(36 33% 97%)` | Warm off-white page background |
| Sidebar | `hsl(36 30% 95%)` | Warm cream sidebar |
| Secondary | `hsl(36 25% 90%)` | Card backgrounds, chips |
| Muted | `hsl(36 20% 94%)` | Subtle backgrounds |

Font: **Inter** via system stack.

---

## Building Reputation Score

Each building has a reputation score (0–10) calculated from:
- **Issue resolution rate** — how quickly open issues get resolved
- **Payment collection rate** — percentage of service charges paid on time
- **Visitor compliance** — pre-clearance adherence
- **Announcements activity** — management engagement with residents

The score is visible on the dashboard, building cards, and building detail pages.

---

## Roadmap

### Phase 2 — Resident Portal
- Resident-facing web app (separate login, unit-scoped view)
- Submit and track their own issues
- View and pay service charges via M-Pesa STK push
- View announcements and pre-clear their own visitors

### Phase 3 — Mobile App (Expo / React Native)
- iOS and Android apps for residents and caretakers
- Push notifications for issue updates, visitor arrivals, payment reminders
- QR code-based visitor check-in at the gate

### Phase 4 — Automation & Intelligence
- Automated payment reminders via SMS (Africa's Talking)
- M-Pesa C2B STK push integration for direct payment
- AI-generated building health reports (monthly)
- Predictive maintenance alerts based on issue patterns

### Phase 5 — Marketplace
- Connect buildings with vetted contractors
- Contractor bidding on open jobs
- Verified ratings and payment history

---

## Contributing

This is a private platform under active development. Contributions by invite only.

---

## License

Private — All rights reserved. © 2025 Jengo.
