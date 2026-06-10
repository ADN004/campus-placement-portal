<div align="center">

# State Placement Cell — Campus Placement Portal

**A production-grade placement management platform serving 60 Government Polytechnic Colleges across Kerala.**

[![CI — Build & Push](https://github.com/ADN004/campus-placement-portal/actions/workflows/docker-hub.yml/badge.svg)](https://github.com/ADN004/campus-placement-portal/actions/workflows/docker-hub.yml)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)
![Deploys](https://img.shields.io/badge/deploys-immutable%20tags-success)

🌐 **Live:** [spc.gptcpalakkad.ac.in](https://spc.gptcpalakkad.ac.in)

</div>

---

One portal, three roles, sixty colleges. Students register against whitelisted PRN ranges, build verified profiles, and apply to eligibility-gated job postings. Placement officers manage their college's pipeline. A state-level super admin console governs everything — from job targeting across five regions to academic-year graduation archival. Shipped with a full staging environment, immutable-tag CI/CD, and one-command rollback.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environments & Deployment](#environments--deployment)
- [Database](#database)
- [Operations Reference](#operations-reference)
- [Repository Structure](#repository-structure)
- [Documentation Index](#documentation-index)

## Architecture

```text
                        ┌─────────────────────────────────────────────┐
 Internet ── HTTPS ──►  │ Host nginx (TLS, vhosts, staging auth gate) │
                        └───────┬─────────────────────┬───────────────┘
                                │ /                    │ /api
                        ┌───────▼────────┐    ┌────────▼────────┐
                        │ frontend       │    │ backend         │
                        │ nginx + React  │    │ Node 18/Express │
                        │ (static build) │    │ JWT · REST API  │
                        └────────────────┘    └────────┬────────┘
                                                       │ private Docker network
                                              ┌────────▼────────┐     ┌────────────┐
                                              │ PostgreSQL 15   │     │ Cloudinary │
                                              │ (no host port)  │     │ Gmail SMTP │
                                              └─────────────────┘     └────────────┘
```

Three containers per environment, orchestrated by Docker Compose. The database is reachable **only** inside the Docker network — no host port is ever exposed. Production and staging run side-by-side on one host as fully isolated compose projects (separate containers, volumes, networks, ports, databases, and credentials).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS · Framer Motion · Axios · jsPDF |
| Backend | Node.js 18 · Express · JWT · bcrypt · PDFKit · ExcelJS · Nodemailer |
| Database | PostgreSQL 15 · plain-SQL migrations · trigram search indexes · materialized views |
| Media | Cloudinary (auto-optimized image pipeline, per-environment accounts) |
| Infra | Docker multi-stage builds · GitHub Actions · Docker Hub · nginx · Let's Encrypt |

## Features

<details>
<summary><b>✨ Full Feature Catalogue</b> — every capability, traced from code (click to expand)</summary>

<br>

<details>
<summary><b>🔐 Authentication & Security Model</b></summary>
<br>

- **Stateless JWT authentication** with role claims (`student` / `placement_officer` / `super_admin`), 7-day expiry, bcrypt-hashed credentials.
- **PRN-gated student registration** — students can only register if their PRN falls inside an admin-managed whitelist (`prn_ranges` supports both ranges and single PRNs, with per-range enable/disable and audit fields for who disabled what and why).
- **Email verification flow** — approved students receive a branded verification email; tokens expire in 24 hours, resend attempts are counted and throttled.
- **Tiered rate limiting** (`express-rate-limit`): a general API limiter, a stricter auth limiter on login/registration, and a dedicated export limiter for PDF/Excel endpoints — with `RateLimit-*` standard headers and proxy-aware client IP resolution (`trust proxy`).
- **Hardened HTTP layer**: Helmet security headers, gzip compression (level 6, opt-out header respected), CORS allowlist driven by environment (supports multiple comma-separated origins), JSON body limits sized for base64 photo uploads.
- **Student blacklisting** with reason, timestamp, and acting-admin tracking — blacklisted students are excluded from every eligibility query in the system.
- **Activity logging middleware** records privileged actions to an `activity_logs` table, browsable from the admin console and auto-pruned after 14 days.

</details>

<details>
<summary><b>🎓 Student Experience</b></summary>
<br>

- **Role-aware login portal** — separate themed login pages for students, placement officers, and super admins behind a role-selection landing page.
- **Registration wizard** validating PRN whitelist membership, per-semester CGPA (supports a perfect 10.00), per-semester backlog counts, and document holdings (license, PAN, Aadhaar, passport).
- **Waiting room** — pending registrations land on a status page until their placement officer approves them; only then does email verification begin.
- **Extended profile system** — six structured sections (physical details, extended academics incl. SSLC/12th marks, family details, document verification, education preferences, personal details) with per-section completion tracking. Completing them is **enforced before any job application** is accepted.
- **Eligibility badges** — every job card shows the student exactly why they are or aren't eligible (CGPA, backlogs, branch, physical criteria, targeting) before they apply.
- **Smart application modal** — applications snapshot the student's profile state at apply-time (`tier2_snapshot`), collect job-specific custom field responses, and store validation results, so reviewers see what the data looked like at submission.
- **Resume builder** — a server-side PDFKit engine generates a clean navy-themed A4 resume combining verified system data (CGPA, college, branch) with student-curated content (skills as pills, projects, experience), downloadable in one click.
- **CGPA / backlog unlock windows** — semester 5/6 results can only be updated while an admin-opened time window is active, preventing silent grade edits mid-drive.
- **Profile photos via Cloudinary** with automatic resize (500×500 limit), quality and format optimization, organized per-PRN folders.

</details>

<details>
<summary><b>🏛️ Placement Officer Console</b></summary>
<br>

- **College-scoped everything** — officers see and manage only their own college's students, ranges, branches, and jobs.
- **Student lifecycle management**: approve/reject registrations (approval triggers the verification email), blacklist with reason, manually add students to job applications, and drill into full student detail modals.
- **College-scoped PRN ranges** — officers manage whitelist ranges for their own college alongside the global admin ranges.
- **College branch management** — per-college branch lists (stored as JSONB) drive registration dropdowns and eligibility checks.
- **Job request workflow** — officers draft job postings (with full eligibility criteria and requirement templates) that route to the super admin for approval; auto-approval is supported and flagged on the resulting job.
- **Drive scheduling** — date/time/location/instructions per job, with automatic branded schedule emails to every shortlisted student.
- **Placement poster generator** — auto-builds shareable placement-stats posters per college (placed counts, companies, highest/average package, company-wise breakdown), with student photo grids.
- **Targeted notifications** to their college's students, with read tracking.
- **Officer profiles** with Cloudinary photos and appointment history — when an officer is replaced, the predecessor is archived to `placement_officer_history` with removal reason.

</details>

<details>
<summary><b>🛡️ Super Admin Console</b></summary>
<br>

- **State-wide governance**: 5 regions, 60 colleges (seeded with official branch lists), officer appointments, and a multi-admin system with profile management.
- **Job management** — create/edit jobs with the full eligibility engine (below), **soft-delete with mandatory reason** (history preserved in `deleted_jobs_history`), and per-job views of applicants and eligible-but-not-applied students.
- **Job request approvals** — review officer-submitted postings, approve into live jobs, or reject with feedback.
- **Whitelist request approvals** — officers request PRN additions; admins adjudicate.
- **Requirement templates** — reusable per-company and per-job application requirement sets (including a "requires personal details" gate) that drive the smart application modal.
- **Notification center** — broadcast to all students, specific regions, specific colleges, or hand-picked students; recipient-level read receipts.
- **Academic year reset** — one guarded workflow graduates the outgoing batch: students are archived to `archived_students`, their Cloudinary photo folders are bulk-deleted, and the portal is reset for the incoming year.
- **Database backup from the browser** — streams a live `pg_dump` of the database as a timestamped `.sql` download, straight from the admin panel (spawned process, no temp files).
- **Activity log explorer** and **cross-college student management** with trigram-indexed fuzzy search over names and PRNs.

</details>

<details>
<summary><b>🎯 Job Eligibility Engine</b></summary>
<br>

Every posting composes any combination of:

- **Minimum CGPA** (`DECIMAL(4,2)` — a 10.00 scorer is handled correctly).
- **Backlog rules in three modes**: max total backlogs, backlogs evaluated only up to semester *N*, or an explicit allowlist of semesters where backlogs are tolerated.
- **Branch allowlists** matched against each college's JSONB branch data.
- **Physical criteria** — min/max height and weight ranges (for uniformed-service recruiters), validated at the schema level.
- **Audience targeting** — `all`, by region, by college, or `specific` combinations; targeting is resolved against numeric IDs with type-coercion-safe comparisons.
- **Time windows** — application start and deadline timestamps gate the apply button.

The same criteria are replicated in export SQL, so "eligible students" PDFs always agree with what students see.

</details>

<details>
<summary><b>📧 Email System</b></summary>
<br>

- Seven branded, mobile-responsive HTML templates: account verification, password reset, generic notification, drive schedule, shortlist, selection (with package/location/joining date), and rejection.
- **Environment-aware fail-safe transport**: real SMTP delivery requires `APP_ENV=production` *and* `EMAIL_MODE=smtp`. Any other environment composes every email normally but captures it to the application logs via Nodemailer's `jsonTransport` — **staging is physically incapable of emailing a real student**, even with production credentials present.
- Transport verification on startup, per-send structured logging.

</details>

<details>
<summary><b>📄 Documents, Exports & Reporting</b></summary>
<br>

- **Applicant exports in PDF and Excel** (`?format=pdf|excel`), with a field-selector UI to choose exactly which columns appear.
- **Host-officer awareness** — when the exporting officer's college hosts the job, Excel exports become a multi-sheet workbook (one sheet per participating college plus a summary); other officers get their single-college view.
- **Eligible-but-not-applied exports** — the eligibility engine run in reverse, surfacing students who qualify but haven't applied, including extended-profile data (height, weight, SSLC %, 12th %).
- **Placement posters** (server-side PDFKit) and **job detail PDFs** (client-side jsPDF) for printable notice-board output.
- **Student resume PDFs** as described above.

All export endpoints sit behind the dedicated export rate limiter.

</details>

<details>
<summary><b>⚙️ Background Automation</b></summary>
<br>

- **Daily age recomputation** — a scheduled job calls a database function to keep every student's age in sync with their date of birth.
- **Materialized view refresh** (`active_students_view`) keeping hot dashboards fast.
- **Activity log retention** — automatic deletion after 14 days.
- **Nightly database backups** — a cron-installed script (`make hub-cron-setup`) runs `pg_dump` inside the container at 2 AM, verifies dump size, and rotates files older than 30 days.

</details>

<details>
<summary><b>💎 Frontend Engineering</b></summary>
<br>

- **Route-level code splitting** — every page is `React.lazy`-loaded; the production bundle is chunked per route with vendor splitting.
- **Glassmorphism design system** — reusable `GlassCard` / `GlassButton` / `GlassStatCard` / `GradientOrb` primitives with a consistent gradient language.
- **Scroll-safe animation discipline** — Framer Motion is applied per-card/section with delay-based staggering (never `staggerChildren` on layout parents); backgrounds are static `position: fixed` with `pointer-events: none` — patterns chosen specifically to eliminate scroll-freeze bugs.
- **Skeleton loading system** — five purpose-built skeleton layouts (dashboards, tables, forms, profiles) with minimum-display-time hooks so content never flashes.
- **Auto-refresh** — polling hook with a visible refresh indicator on live lists (eligible students during drives).
- **Desktop view switcher** for data-dense officer/admin tables, `en-IN` locale dates throughout, and an unmissable amber **STAGING ribbon** baked into staging builds at compile time (dead-code-eliminated from production bundles).

</details>

<details>
<summary><b>🚀 DevOps & Release Engineering</b></summary>
<br>

- **Branch-based CI** (GitHub Actions): pushes to `develop` build `staging-<sha>` images; pushes to `main` build `main-<sha>` — three images each (frontend, backend, schema-preloaded database), published to Docker Hub with the exact deploy command printed in the job summary.
- **Immutable-tag deployments** — compose refuses to start without a pinned `IMAGE_TAG`; moving tags (`latest`, `staging`) exist only as pointers and are never deployed. Every deploy is recorded in `deploy-history.log`; **rollback is redeploying any previous tag by name**.
- **A true staging environment** — isolated database with four dataset modes (empty / seeded sample / sanitized production clone / cleared), credential sanitization after every production refresh, an HTTP basic-auth gate at the nginx layer, a separate Cloudinary account, and log-only email. See [docs/STAGING.md](docs/STAGING.md).
- **Layered safety guards** — destructive staging commands verify the environment file, container prefix, *and* resolved container identity before running; production-mutating commands require typed confirmations (the exact target tag, `RESTORE PRODUCTION`, …).
- **Plain-SQL migration system** with a transactional runner, `schema_migrations` tracking, and a staging-first application workflow.
- **Image hygiene** — a weekly retention workflow keeps the newest 15 production / 10 staging tags on Docker Hub; `make hub-cleanup-images` prunes stale local images without ever touching running ones.
- **Production-optimized images** — multi-stage builds, non-root users, `dumb-init` signal handling, container healthchecks, resource limits, and a PostgreSQL image with the schema baked into `/docker-entrypoint-initdb.d`.

</details>

</details>

## Getting Started

<details>
<summary><b>Prerequisites</b></summary>
<br>

| Tool | Version | Notes |
|---|---|---|
| Docker + Compose v2 | 24+ | the only hard requirement for running the stack |
| GNU Make | 4+ | drives all operations (Windows: Git Bash / WSL / scoop) |
| Node.js | 18+ | only for running frontend/backend outside Docker |
| Cloudinary account | free tier | photo uploads (optional for first run) |
| Gmail App Password | — | email delivery (optional for first run) |

</details>

### Clone & run locally

```bash
git clone https://github.com/ADN004/campus-placement-portal.git
cd campus-placement-portal

cp .env.docker.example .env        # then edit: DB password + JWT secret at minimum
make build && make up              # build images locally and start the stack
make seed                          # regions, 60 colleges, officers, super admin
```

Open `http://localhost` — the frontend proxies `/api` to the backend internally, so no URLs need configuring.

<details>
<summary><b>Hot-reload development environment</b></summary>
<br>

```bash
make dev          # Vite dev server on :5173, nodemon backend on :5000
make dev-logs     # follow output
make dev-down     # stop
```

Or fully manual (no Docker): `npm install && npm run dev` in `backend/` and `frontend/`, using `backend/.env.example` and `frontend/.env.example` as templates against a local PostgreSQL (`npm run db:setup && npm run db:seed`).

</details>

<details>
<summary><b>Environment configuration reference</b></summary>
<br>

All configuration is environment-driven; nothing is hardcoded to a domain or institution.

| File | Purpose |
|---|---|
| `.env.docker.example` | canonical template — production-style deployments |
| `.env.staging.example` | staging overlay: ports, container prefix, safe email, sanitize password |
| `backend/.env.example` / `frontend/.env.example` | bare-metal local development |

Key variables: `IMAGE_TAG` (pinned deploy version, **required**), `APP_ENV` (drives email safety + guards), `EMAIL_MODE`, `CONTAINER_PREFIX`, `FRONTEND_PORT` / `BACKEND_PORT`, `JWT_SECRET`, `FRONTEND_URL` (CORS + email links), `CLOUDINARY_*`, `EMAIL_*`, and `CREATE_SUPER_ADMIN` + credentials for non-interactive seeding.

</details>

## Environments & Deployment

```text
 develop ──push──► CI builds staging-<sha> ──make staging-deploy──► STAGING
                                                                    password-gated · isolated DB
    │                                                               no real email · amber ribbon
    │  verified on staging
    ▼
  main ────push──► CI builds main-<sha> ────make hub-deploy───────► PRODUCTION
                                            (typed confirmation)    immutable tag · logged
                                                                    rollback = previous tag
```

| Step | Command (server) |
|---|---|
| Deploy to staging | `make staging-deploy TAG=staging-<sha>` |
| Inspect staging | `make staging-status` — dataset mode, last prod refresh, image drift |
| Promote | merge `develop → main` (fast-forward), wait for CI |
| Back up production | `make hub-db-backup` |
| Deploy to production | `make hub-deploy TAG=main-<sha>` |
| Roll back | `make hub-deploy TAG=main-<previous-sha>` |

**Staging dataset modes:** `staging-db-reset` (empty schema) · `staging-db-seed-sample` (10 students, 4 jobs, known logins) · `staging-refresh-from-prod` (sanitized clone — every non-admin password rotated, production admins disabled, tokens cleared, automatically) · `staging-db-clear` (free the disk).

Full guides: [docs/STAGING.md](docs/STAGING.md) (workflow, safety model, rollback) and [docs/SERVER_SETUP.md](docs/SERVER_SETUP.md) (fresh-server bootstrap, nginx/TLS, server migration). nginx vhost templates — including the staging basic-auth gate — live in [`deploy/nginx/`](deploy/nginx/).

## Database

- **Single source of truth:** [`database/schema.sql`](database/schema.sql) — 30+ tables with composite, partial, and trigram indexes, applied automatically on first boot via the schema-preloaded postgres image.
- **Migrations:** ordered, idempotent SQL files in [`database/migrations/`](database/migrations/), applied transactionally by `backend/scripts/migrate.js` and tracked in `schema_migrations`. Staging first, always: `make staging-migrate` → verify → `make hub-migrate` (auto-backup + typed confirmation). Authoring rules: [database/migrations/README.md](database/migrations/README.md).
- **Seeding:** `make seed` / `make hub-seed` loads 5 regions, 60 colleges with official branch lists, placement officers, and an interactively- or env-created super admin.
- **Backups:** nightly cron (2 AM, size-verified, 30-day rotation), on-demand `make hub-db-backup`, and a super-admin browser download. Restore via `make hub-db-restore` (typed confirmation).

## Operations Reference

<details>
<summary><b>Make target catalogue</b> (run <code>make help</code> for the live list)</summary>
<br>

| Family | Highlights |
|---|---|
| Local | `up` `down` `build` `logs` `seed` `db-shell` `db-backup` `db-restore` |
| Dev | `dev` `dev-build` `dev-logs` `dev-down` |
| Production (`hub-*`) | `hub-deploy TAG=` `hub-status` `hub-logs` `hub-migrate` `hub-db-backup` `hub-db-restore FILE=` `hub-db-sql SQL=` `hub-cron-setup` `hub-cleanup-images` |
| Staging (`staging-*`) | `staging-deploy TAG=` `staging-status` `staging-logs` `staging-migrate` `staging-db-reset` `staging-db-seed-sample` `staging-refresh-from-prod` `staging-db-rollback FILE=` `staging-db-sanitize` `staging-db-clear` |

Safety properties: every destructive staging target runs layered guards (env file → container prefix → live container identity); every production-mutating target requires a typed confirmation; every deploy appends to `deploy-history.log`.

</details>

## Repository Structure

<details>
<summary><b>Directory map</b></summary>
<br>

```text
├── .github/workflows/      # CI: branch-based builds + weekly image retention
├── backend/
│   ├── config/             # database pool, Cloudinary, fail-safe email transport
│   ├── controllers/        # route handlers (auth, students, officers, admin, backups…)
│   ├── middleware/         # JWT auth, rate limiters, activity logger, error handler
│   ├── routes/             # Express routers mounted under /api
│   ├── scripts/            # migrate, seed, staging sample data, staging sanitizer
│   └── utils/              # PDF/resume/poster generators, scheduled jobs, cleanup
├── database/
│   ├── schema.sql          # full schema (fresh-install source of truth)
│   ├── migrations/         # ordered idempotent migrations + authoring rules
│   ├── seed-data.sql       # 5 regions, 60 colleges, officers
│   └── Dockerfile          # schema-preloaded PostgreSQL image
├── frontend/
│   └── src/                # pages (per role), components, hooks, services
├── deploy/nginx/           # host vhost templates (production + gated staging)
├── docs/                   # STAGING.md, SERVER_SETUP.md
├── scripts/                # server-side backup cron
├── docker-compose.yml      # local source build
├── docker-compose.dev.yml  # hot-reload development
├── docker-compose.hub.yml  # pinned-tag deployment (prod & staging)
└── Makefile                # the operations interface for everything above
```

</details>

## Documentation Index

| Document | Covers |
|---|---|
| [docs/STAGING.md](docs/STAGING.md) | staging workflow, dataset modes, sanitization, safety guards, promotion, rollback |
| [docs/SERVER_SETUP.md](docs/SERVER_SETUP.md) | fresh-server bootstrap, DNS/nginx/TLS, server migration runbook |
| [database/migrations/README.md](database/migrations/README.md) | migration authoring rules (idempotency, additive-first, schema.sql sync) |
| [deploy/nginx/](deploy/nginx/) | annotated vhost templates incl. the staging basic-auth gate |

---

<div align="center">

Built for the **Directorate of Technical Education, Kerala** — serving students across 60 polytechnic colleges.

</div>
