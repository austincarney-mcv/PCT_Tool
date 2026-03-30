# Project Control Tool (PCT) — Claude Code Context Document

## Status
**In active development.** The app is functional but may contain bugs, incomplete features, or placeholder data. Do not assume any module is fully production-ready without verifying. The source Excel file (`10162 - Project Control Tool.xlsx`) has been deleted — it is no longer relevant. All data is now seeded directly into SQLite.

---

## What This App Is

A multi-project web platform for architectural/engineering consultancies to manage construction projects. It digitises an Excel-based project control tool previously used for a single project (Project 10162 — Lot 31, The Hub, Heathwood, client Prekaro Projects).

The app is used by a **small internal team** (architects and engineers). UX priority is speed of data entry over complexity.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite, JSX (no TypeScript), Tailwind-style CSS via CSS variables |
| Backend | Node.js / Express 4 |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (flat-file users via `.env`, no users table in DB) |
| Data fetching | TanStack React Query v5 |
| Charts | Recharts |
| HTTP client | Axios |

### Ports
- API server: `http://localhost:3002`
- Vite dev client: `http://localhost:5175`

### Start / Stop
- `start_server.bat` — launches both processes (project root)
- `stop_server.bat` — kills both ports (project root)

---

## Directory Structure

```
014_PCT_App/
├── client/              React + Vite frontend
│   └── src/
│       ├── api/         Axios API wrappers (one file per domain)
│       ├── components/  Shared + feature-specific components
│       ├── context/     AuthContext, ProjectContext
│       ├── hooks/       useColumnResize
│       ├── pages/       One page component per module
│       └── App.jsx      Router + auth guard
├── server/              Node/Express backend
│   ├── config/          database.js, constants.js
│   ├── controllers/     One controller per domain
│   ├── db/              schema.sql, migrate.js
│   ├── middleware/       auth.js (JWT verify + requireAdmin), errorHandler.js
│   ├── routes/          One router per domain
│   ├── services/        c2c.service.js, excel.export.js
│   └── utils/           jwt.js, dateUtils.js
├── data/                pct.db (SQLite), server.log
├── scripts/             seed_demo.py
├── deploy/              start-server.bat (production/logging variant)
├── CLAUDE_CONTEXT.md    This file
└── README.txt           End-user guide
```

---

## Authentication

Users are defined in `server/.env` as `APP_USERS=username:password:role,...`. There is **no users table** in the database.

Current dev credentials (from `.env`):
- `superadmin` / `ultima` — role: `admin`
- `viewer` / `viewer123` — role: `viewer`

Roles:
- **admin** — can unlock past C2C weeks via a 24-hour override
- **viewer** — read-only implied; all authenticated users can write except admin-gated routes

JWT expiry: 8 hours. Refresh endpoint available at `/api/auth/refresh`.

---

## Database

**File:** `data/pct.db`
**Schema:** `server/db/schema.sql`
**Migration:** runs on every server start via `migrate()` in `server.js` — uses `CREATE TABLE IF NOT EXISTS` so it is safe to re-run. Incremental column additions are handled via a try/catch `ALTER TABLE` list in `migrate.js`.

### Tables

| Table | Purpose |
|-------|---------|
| `projects` | Project metadata |
| `team_resources` | Team members with hourly rates, per project |
| `drawings` | Deliverables / drawing register |
| `c2c_snapshots` | Weekly C2C snapshot headers (one row per week per phase) |
| `c2c_resource_allocations` | Utilisation fractions per resource per snapshot |
| `c2c_discipline_financials` | Fee summary per discipline per snapshot |
| `approvals` | Statutory approvals tracker |
| `critical_items` | Critical items register |
| `design_changes` | Design change register |
| `risks` | Risk & issue register |
| `rfis` | RFI log |
| `lessons_learnt` | Lessons learnt register |
| `sid_hazards` | Safety in Design hazard register |
| `value_log` | Value engineering log |
| `brief_compliance` | Brief compliance checklist |

### Known Schema TODOs (from inline comments)
- `c2c_discipline_financials.synergy_net_residual` — hidden in the CS phase view but preserved in the DB. May be swapped with `fee_less_wip` or merged when an external finance/billing DB integration is scoped.
- `c2c_discipline_financials.fee_less_wip` — placeholder default of `$1,000` per discipline. Needs connection to an external finance/billing system once that integration is scoped.

---

## Sample Data

Seeded via `scripts/seed_demo.py`. **Two projects** in the live DB:

| ID | Project Number | Name | Client |
|----|---------------|------|--------|
| 1 | 00000001 | Functional Test | Demo Client |
| 6 | 00010162 | Lot 31 The Hub Heathwood | Prekaro Projects |

Project 6 (10162) is the primary demo project with full data across all modules. Project 1 is a minimal functional test project.

### C2C Sample Data — Project 6

**Design phase** (weeks sorted by week_number, all dates past):

| Week | Date |
|------|------|
| W1–W12 | 2025-09-08 → 2025-11-24 (W7, W8 missing — not in source) |

**Construction Services phase** (all dates corrected to be past/current/future relative to today):

| Weeks | Date range | Status |
|-------|-----------|--------|
| W1–W12 | 2025-12-08 → 2026-03-09 | Past |
| W13 | 2026-03-23 | Past |
| W14 | 2026-03-30 | Current |
| W15–W20 | 2026-04-06 → 2026-05-11 | Future |

> **Note:** CS W1–W12 were originally seeded with 2026/2027 dates (from the Excel planning dates). They were corrected on 2026-03-30 to 2025/2026 dates so they are consistently classified as "past" by the hide/show logic.

---

## C2C Module — Key Behaviours

This is the most complex module. Understand these behaviours before modifying it.

### Week Status Classification
Both client and server independently calculate week status from `snapshot_date`:
- `snapshot_date < activeMon` → **past** (locked, excluded from CTC calc)
- `snapshot_date` within current Mon–Sun → **current** (unlocked, included in CTC)
- `snapshot_date > current week` → **future** (unlocked, included in CTC)

"Active Monday" on weekdays = this week's Monday. On Saturday/Sunday = next Monday.

### CTC Calculation
- `hours = weekly_utilisation × 37.5 × remaining_weeks`
- `cost_to_complete = sum(hours × hourly_rate)` per resource
- Only **current and future** weeks feed into CTC — past weeks are excluded
- `adjusted_net_residual = synergy_net_residual − total_net_to_carry` (STORED generated column)
- `under_over = adjusted_net_residual − construction_doc_cost_to_complete` (STORED generated column)

### Locking
- Past weeks are **auto-locked** by the server on every `getStageView` call
- Current/future weeks are **auto-unlocked** by the same call
- Admins can unlock a past week for 24 hours via `admin_unlocked_until` field
- Lock state is enforced server-side before any allocation/financial update

### Stage View vs Week View
- **Stage View** — horizontal spreadsheet with all weeks as columns; one row per team member. This is the primary view. Has a hide/show past weeks toggle and a colour-coded legend.
- **Week View** — one snapshot at a time, selected from a pill list. Shows allocations + financials for that snapshot.

### Column Colour Coding (Stage View)
| Status | Header colour | Body colour |
|--------|--------------|-------------|
| Past | `#6b9e82` (green) | `#f0f4f1` (muted green-white) |
| Current | `#d97706` (amber) | `rgba(217,119,6,0.07)` (amber tint) |
| Future | `var(--color-primary)` | default |

---

## Frontend Architecture Notes

- **ProjectContext** — holds the selected project ID globally. All pages read `useProject()` to get `projectId`. No project selected = empty state shown.
- **AuthContext** — holds JWT token, user object, `isAuthenticated`, `isAdmin`. Persists token to localStorage.
- All API calls route through `client/src/api/client.js` (Axios instance with base URL + auth header interceptor).
- Pages are flat — no nested routing beyond the top-level module routes.
- Column resizing in tables uses the shared `useColumnResize` hook (drag-to-resize table headers).
- `EditableCell` component is used for inline editing across multiple modules.

---

## API Routes

All routes require Bearer JWT. Base: `/api/`

| Prefix | Module |
|--------|--------|
| `/api/auth` | Login, refresh |
| `/api/projects` | Project CRUD |
| `/api/projects/:id/drawings` | Deliverables schedule |
| `/api/projects/:id/resources` | Team resources |
| `/api/projects/:id/c2c` | C2C snapshots, allocations, financials, stage-view, trend |
| `/api/projects/:id/approvals` | Approvals tracker |
| `/api/projects/:id/critical-items` | Critical items register |
| `/api/projects/:id/design-changes` | Design change register |
| `/api/projects/:id/risks` | Risk & issue register |
| `/api/projects/:id/rfis` | RFI log |
| `/api/projects/:id/lessons` | Lessons learnt |
| `/api/projects/:id/sid` | SiD hazard register |
| `/api/projects/:id/value-log` | Value log |
| `/api/projects/:id/brief-compliance` | Brief compliance |
| `/api/projects/:id/summary` | Project summary (dashboard data) |
| `/api/health` | Health check (no auth) |

---

## Disciplines (shared constant — server + client must stay in sync)

`Architecture`, `Civil`, `Structural`, `Hydraulics`, `Landscaping`, `Certifier`, `Fire Engineering`, `Fire Services`, `Builder/CM`

Defined in `server/config/constants.js` and mirrored in `C2CPage.jsx`.

---

## Regulatory Context

Queensland, Australia construction projects:
- Planning Act (Development Approval)
- Building Act / NCC / Queensland Development Code
- Plumbing and Drainage Act
- Water Supply Act (Unity Water)
- WHS legislation (Safety in Design register is legally required)

---

## Known / Likely Issues (as at 2026-03-30)

- App is in active development — individual modules may have incomplete CRUD, missing validation, or UI rough edges
- `fee_less_wip` in C2C financials uses a placeholder default of $1,000 — not connected to real billing data
- `synergy_net_residual` field (design phase financial) references an internal finance system ("Synergy") — no integration exists yet
- No password hashing — credentials are plain text in `.env` (acceptable for internal tool, not production)
- No user management UI — users are managed by editing `.env` directly
- Excel export (`excel.export.js` service) exists but export UI coverage across modules may be incomplete
- Some registers (Risks, RFIs, Value Log) were lightly populated in seed data — may surface edge cases with empty states
