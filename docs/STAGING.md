# Staging / Production Deployment Guide

A safe staging environment for testing every change before it reaches
production. Both environments run on the same host from the same
`docker-compose.hub.yml`, fully isolated by configuration.

```text
develop branch ── push ──> CI builds  staging-<sha> images
                              │
                              ▼  make staging-deploy TAG=staging-<sha>
                  STAGING   staging subdomain · own DB · own Cloudinary
                            emails captured to logs · UI shows STAGING banner
                              │  verify, then merge develop -> main
                              ▼
main branch ──── push ──> CI builds  main-<sha> images
                              │
                              ▼  make hub-deploy TAG=main-<sha>  (typed confirmation)
                  PRODUCTION
```

## 1. Environment isolation at a glance

| Concern | Production | Staging |
|---|---|---|
| Compose project | directory default | `spc-staging` (`make staging-*` handles this) |
| Env file | `.env` | `.env.staging` |
| Containers | `spc_postgres` / `spc_backend` / `spc_frontend` | `spc-staging_*` |
| Ports | 8081 / 5002 | 8082 / 5003 (set in `.env.staging`) |
| Database | own volume | own volume (never shared) |
| Image tags | `main-<sha>` | `staging-<sha>` |
| Email | real delivery (`APP_ENV=production` + `EMAIL_MODE=smtp`) | **forced capture-to-logs** — `APP_ENV=staging` makes real delivery impossible in code, even with production SMTP credentials present |
| Cloudinary | production account | separate (free) staging account |
| UI | normal | amber “STAGING ENVIRONMENT” ribbon + `[STAGING]` tab title |

## 2. Image tagging (immutable deploys)

Every CI build publishes immutable tags: `main-<shortsha>` (from `main`) or
`staging-<shortsha>` (from `develop`), plus moving convenience tags
(`latest`, `staging`) that are **never deployed**.

- The deployed tag is pinned as `IMAGE_TAG=` in each environment's env file.
  Compose refuses to start without it — no accidental `latest` deploys.
- Tags for each build are shown in the GitHub Actions job summary.
- `deploy-history.log` (on the server, git-ignored) records every deploy.
- Retention: a weekly GitHub Actions job keeps the newest 15 `main-*` and
  10 `staging-*` tags per repo; moving tags are never deleted. On the server,
  `make hub-cleanup-images` prunes unused local images older than 10 days.

## 3. Staging database modes

Staging supports four dataset modes. The current mode is tracked in the
staging database itself (`staging_meta` table) and shown by `make staging-status`.

| Command | Resulting mode | When to use |
|---|---|---|
| `make staging-db-reset` | `empty` — fresh schema, no data | Start of a feature cycle; clean migration testing |
| `make staging-db-seed-sample` | `sample` — base data + 10 students, 4 jobs, 6 applications, 3 notifications | **Default for day-to-day testing.** Known logins (below), predictable data |
| `make staging-refresh-from-prod` | `prod-clone` — full production copy, **automatically sanitized** | Only for migration rehearsal, performance checks, or data-dependent bugs. Staging is backed up first; production is only ever read |
| `make staging-db-clear` | (none — volumes deleted) | Staging not needed for a while; frees the disk a prod clone occupies |

**Hygiene rule:** after finishing real-data testing on a `prod-clone`, run
`staging-db-reset` or `staging-db-clear` so production data does not linger.

### Automatic credential sanitization (prod-clone mode)

The final step of `staging-refresh-from-prod` runs
`backend/scripts/sanitizeStagingDb.js` (also available standalone as
`make staging-db-sanitize`):

1. **Every non-super-admin password is reset** to `STAGING_SANITIZE_PASSWORD`
   (default `Staging@123`) — production credentials stop working on staging,
   and testers can log in as any real-shaped student or officer account.
2. **A dedicated staging super admin** is created/reset from
   `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `.env.staging` — always use
   this account for staging admin work, never a production admin login.
3. **All super admin accounts cloned from production are deactivated**
   (`is_active = FALSE`), so no production credential of any kind remains
   usable on staging. This step is skipped (with a loud warning) if the
   dedicated staging admin is not configured, so staging is never left
   without an active admin.
4. **Pending email verification tokens are cleared**, so no token minted by
   production is honored by staging. Password-reset links cross-fail anyway
   because the environments use different `JWT_SECRET`s.

The script refuses to run when `APP_ENV=production`.

Sample dataset logins (password `Student@123`):
`spc.sample.student1@staging.invalid` … `student10@staging.invalid`
(8 approved + verified, student9 pending, student10 blacklisted; `.invalid`
is a reserved TLD — these addresses can never receive real mail.)

### staging-status

```bash
make staging-status
```

Shows: pinned image tag, container state, **dataset mode + when it was set**,
**last production refresh time**, database size, and row counts for students,
users, jobs, applications, notifications, and colleges. If the `staging_meta`
table is missing (DB modified outside the make targets), the mode reports as
`unknown`.

## 4. Safety guards

- Every destructive staging command runs `staging-guard` (checks
  `.env.staging` exists, `APP_ENV=staging`, `CONTAINER_PREFIX` contains
  `staging` and isn't production's) and, where containers are touched,
  `staging-guard-live` (the *resolved* postgres container must be a staging
  container and must not be the same container as production's).
- `staging-refresh-from-prod` touches production with exactly one read-only
  command (`pg_dump`). All writes go through the guarded staging handle.
- Production-mutating commands require typed confirmation:
  - `make hub-deploy TAG=...` — type the exact target tag
  - `make hub-migrate` — type `migrate` (auto-backs-up first)
  - `make hub-db-restore` — type `RESTORE PRODUCTION`
  - `make hub-db-reset` — type `RESET PRODUCTION`

## 5. Promotion workflow (develop → staging → production)

1. Commit work to `develop`, push. CI publishes `staging-<sha>` (see Actions summary).
2. `make staging-deploy TAG=staging-<sha>`
3. If the change includes migrations: `make staging-migrate`
4. Verify on the staging URL (banner confirms which environment you're on).
   For data-sensitive changes, `make staging-refresh-from-prod` first.
5. Merge `develop` into `main` (prefer fast-forward so the shipped commit is
   byte-identical to what staging verified). Push. CI publishes `main-<sha>`.
6. `make hub-db-backup`
7. If migrations: `make hub-migrate`
8. `make hub-deploy TAG=main-<sha>`
9. Smoke-check production. If anything is wrong:
   - App rollback: `make hub-deploy TAG=main-<previous-sha>` (see `deploy-history.log`)
   - Data rollback: `make hub-db-restore FILE=backups/...` (only if a migration must revert)

## 6. Database migrations

See [database/migrations/README.md](../database/migrations/README.md) for the
full rules. Short version: ordered idempotent SQL files in
`database/migrations/`, applied by `make staging-migrate` / `make hub-migrate`,
tracked in `schema_migrations`. Always staging first; always fold the change
into `schema.sql` in the same commit; prefer additive changes so image
rollback stays safe after a migration has run.

## 7. Email & Cloudinary isolation

**Email:** `backend/config/emailService.js` only creates a real SMTP
transport when `APP_ENV=production` **and** `EMAIL_MODE=smtp`. In staging,
every email is fully composed and written to the backend logs
(`make staging-logs`, look for `EMAIL SAFE MODE`) — useful for verifying
templates and flows without any risk of delivery.

**Cloudinary:** staging uses a separate (free) Cloudinary account configured
in `.env.staging`. After a production refresh, staging's DB contains
production image URLs — they still *display* (public URLs), but any staging
upload/delete hits only the staging account.

## 8. Server setup (one-time)

Everything in this section runs **on the server** (`root@gptcpalakkad`,
`~/dockers/campus-placement-portal`) or in your DNS/Git hosting — Claude has
no server access; execute these manually. Staging values used throughout:
domain `staging.spc.gptcpalakkad.ac.in`, frontend port `8082`, backend port
`5003`.

### 8.1 Pre-flight: verify host resources

```bash
free -h                      # want ≥ ~700 MB available (staging caps at ~0.5 GB + overhead)
df -h /                      # want a few GB free (images + staging volume + dumps)
nproc
docker stats --no-stream     # current production usage for reference
```

If RAM is tight, lower `POSTGRES_MEM_LIMIT` / `BACKEND_MEM_LIMIT` in
`.env.staging` — staging serves one tester, not 60 colleges.

### 8.2 Create the develop branch (local machine)

```bash
git checkout main && git pull
git checkout -b develop
git push -u origin develop
```

CI builds `staging-<sha>` images for every push to `develop`. Open the
GitHub Actions run → job summary → copy the immutable tag.

### 8.3 DNS

Add a record at your DNS provider (same IP as the main domain):

```text
Type A      staging.spc.gptcpalakkad.ac.in   →  <server public IP>
```

Verify propagation before continuing:

```bash
dig +short staging.spc.gptcpalakkad.ac.in
```

### 8.4 Update deployment files on the server

The server needs the Phase-2 versions of `Makefile`,
`docker-compose.hub.yml`, and the `.env.staging.example` template. From the
`develop` branch (raw GitHub URLs), in `~/dockers/campus-placement-portal`:

```bash
cd ~/dockers/campus-placement-portal
cp Makefile Makefile.bak && cp docker-compose.hub.yml docker-compose.hub.yml.bak

BASE=https://raw.githubusercontent.com/ADN004/campus-placement-portal/develop
curl -fsSO $BASE/Makefile
curl -fsSO $BASE/docker-compose.hub.yml
curl -fsSO $BASE/.env.staging.example
```

**Immediately afterwards — in the same session — add the bridge values to the
production `.env`:**

```bash
grep -q '^IMAGE_TAG=' .env || printf 'IMAGE_TAG=latest\nCONTAINER_PREFIX=spc\nAPP_ENV=production\nEMAIL_MODE=smtp\n' >> .env
```

Why this matters: the new compose file refuses to interpolate without
`IMAGE_TAG`, and that would break **every** `docker compose -f
docker-compose.hub.yml ...` invocation — including the nightly backup cron
(`spc-backup-cron.sh`), `make hub-logs`, and `make hub-db-backup` — until a
tag is set. `IMAGE_TAG=latest` is a temporary bridge that reproduces today's
behavior *exactly* (the running containers came from `:latest`), so nothing
is interrupted. It is replaced by a pinned immutable tag in step 8.8, after
which `latest` is never used again.

Verify the bridge before moving on:

```bash
make hub-status                          # must work
bash scripts/spc-backup-cron.sh          # nightly backup must still succeed
```

### 8.5 Basic-auth gate + nginx vhost

```bash
sudo apt-get install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd_spc_staging spcstaging
# choose the gate password when prompted; add more users without -c
```

Create `/etc/nginx/sites-available/spc-staging` (mirror your production
vhost's TLS/style conventions):

```nginx
server {
    listen 80;
    server_name staging.spc.gptcpalakkad.ac.in;

    # never index staging
    add_header X-Robots-Tag "noindex, nofollow" always;

    client_max_body_size 10M;

    # API: JWT auth applies; basic auth MUST be off here because the app
    # sends Authorization: Bearer <jwt> and the two cannot coexist.
    location /api/ {
        auth_basic off;
        proxy_pass http://127.0.0.1:5003/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Entire UI behind the gate — protects every page before it loads
    location / {
        auth_basic "Staging Environment";
        auth_basic_user_file /etc/nginx/.htpasswd_spc_staging;
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/spc-staging /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS (same mechanism as the main domain):
sudo certbot --nginx -d staging.spc.gptcpalakkad.ac.in
```

### 8.6 Create .env.staging

```bash
cd ~/dockers/campus-placement-portal
cp .env.staging.example .env.staging
nano .env.staging
```

Fill in: `DOCKERHUB_USERNAME=adn004`, `IMAGE_TAG=staging-<sha>` (from 8.2),
a fresh `JWT_SECRET` (`openssl rand -hex 64`), a staging `DB_PASSWORD`,
`FRONTEND_URL=https://staging.spc.gptcpalakkad.ac.in`, the **staging
Cloudinary account** credentials, the staging admin email/password, and a
`STAGING_SANITIZE_PASSWORD`. Keep `APP_ENV=staging`,
`CONTAINER_PREFIX=spc-staging`, `EMAIL_MODE=log`, ports `8082`/`5003`.

### 8.7 First staging deployment

```bash
make staging-deploy TAG=staging-<sha>   # pulls images, starts the stack
make staging-status                     # schema self-initializes in ~30s
make staging-db-seed-sample             # base data + sample dataset
```

Verify:

1. `https://staging.spc.gptcpalakkad.ac.in` prompts for the gate password,
   then loads the app **with the amber STAGING ribbon** and `[STAGING]` tab title.
2. Log in as the staging admin (from `.env.staging`) and as
   `spc.sample.student1@staging.invalid` / `Student@123`.
3. Trigger any email flow, then `make staging-logs` — the email appears as an
   `EMAIL SAFE MODE` log line and nothing is delivered.
4. `make staging-status` reports mode `sample`.

### 8.8 One-time production migration to pinned tags

When staging is verified and you merge `develop` → `main`, CI publishes
`main-<sha>`. Then, on the server:

```bash
cd ~/dockers/campus-placement-portal
make hub-deploy TAG=main-<sha>          # asks you to type the tag to confirm
```

`hub-deploy` rewrites `IMAGE_TAG` in `.env` automatically, replacing the
temporary `IMAGE_TAG=latest` bridge from step 8.4 — from this point
production runs only pinned immutable tags.

Notes:

- Container names, volumes, and ports are unchanged (`CONTAINER_PREFIX=spc`,
  added in 8.4, reproduces today's names) — this is an ordinary recreate,
  same brief restart as any previous `hub-deploy`.
- `APP_ENV=production` + `EMAIL_MODE=smtp` (also added in 8.4) keep real
  email delivery exactly as it is now (these match the compose defaults;
  setting them explicitly is for clarity).
- From now on every deploy is `make hub-deploy TAG=main-<sha>` and every tag
  is recorded in `deploy-history.log`.

## 9. Rollback procedures

### 9.1 Staging — application

```bash
tail deploy-history.log                      # find the previous staging tag
make staging-deploy TAG=staging-<previous-sha>
```

### 9.2 Staging — database

```bash
ls backups/staging_pre_refresh_*             # taken automatically before every refresh
make staging-db-rollback FILE=backups/staging_pre_refresh_<ts>.sql
# or discard entirely:
make staging-db-reset && make staging-db-seed-sample
```

### 9.3 Production — application

```bash
tail deploy-history.log                      # find the last good main-<sha>
make hub-deploy TAG=main-<previous-sha>      # typed confirmation required
```

Works as long as the tag still exists (retention keeps the newest 15
`main-*` tags ≈ months of history). Because migrations are additive-first
(see `database/migrations/README.md`), the previous image runs fine against
a migrated schema — app rollback does **not** require a data rollback.

### 9.4 Production — database

Only needed if a migration or data corruption must be reverted. **Take a
fresh backup first** so even the rollback is reversible:

```bash
make hub-db-backup                                       # snapshot current state
make hub-db-restore FILE=backups/hub_backup_<ts>.sql     # type RESTORE PRODUCTION
```

⚠ Restoring loses all data written after the backup was taken (`hub-migrate`
always creates one immediately before applying migrations). After a restore,
`schema_migrations` automatically reflects the backup's state — re-running
`make hub-migrate` later re-applies what's pending.

### 9.5 Removing staging entirely

```bash
make staging-db-clear                        # stop + delete staging volumes
sudo rm /etc/nginx/sites-enabled/spc-staging && sudo nginx -t && sudo systemctl reload nginx
# optionally delete the DNS record and .env.staging
```

Production is untouched by any of this — the environments share nothing.
