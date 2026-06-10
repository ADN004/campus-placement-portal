# Server Setup & Migration Guide

How to stand up this project on a **fresh server** — production, staging, or
both — and how to **migrate** an existing deployment to a new server.
Companion to [STAGING.md](STAGING.md) (staging workflow details).

Everything environment-specific lives in git-ignored files on the server:

| File | Contains | In repo? |
|---|---|---|
| `.env` | production config + pinned `IMAGE_TAG` | template: `.env.docker.example` |
| `.env.staging` | staging config + pinned `IMAGE_TAG` | template: `.env.staging.example` |
| `/etc/nginx/sites-available/<domain>` | vhosts | templates: `deploy/nginx/*.conf.example` |
| `/etc/nginx/.htpasswd_spc_staging` | staging gate credentials | recreate with `htpasswd` |
| TLS certificates | Let's Encrypt | regenerate with `certbot` |
| `backups/`, `deploy-history.log` | dumps, deploy record | server-local |

## 1. Fresh server: prerequisites

Ubuntu/Debian assumed. As root (or with sudo):

```bash
# Docker Engine + compose plugin — https://docs.docker.com/engine/install/
curl -fsSL https://get.docker.com | sh

apt-get install -y git make nginx certbot python3-certbot-nginx apache2-utils
```

## 2. Fresh production setup

### 2.1 DNS

Create an A record for your production domain pointing to the server IP.
Verify: `dig +short <your-domain>` returns the IP.

### 2.2 Clone and configure

```bash
mkdir -p ~/dockers && cd ~/dockers
git clone https://github.com/ADN004/campus-placement-portal.git
cd campus-placement-portal

cp .env.docker.example .env
nano .env
```

Required values in `.env`:

- `DOCKERHUB_USERNAME` — account holding the built images
- `IMAGE_TAG=main-<sha>` — an immutable tag from the latest `main` CI build
  (GitHub → Actions → newest "Build and Push to Docker Hub" run → summary)
- `DB_PASSWORD`, `JWT_SECRET` (`openssl rand -hex 64`), `SETUP_SECRET_KEY`
- `FRONTEND_URL=https://<your-domain>`
- `FRONTEND_PORT` / `BACKEND_PORT` — host ports (this deployment uses 8081/5002)
- Cloudinary + Email (Gmail app password) credentials
- `CREATE_SUPER_ADMIN=true` + `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`
  for non-interactive seeding
- Keep `APP_ENV=production`, `EMAIL_MODE=smtp`, `CONTAINER_PREFIX=spc`

### 2.3 nginx + TLS

```bash
cp deploy/nginx/spc-production.conf.example /etc/nginx/sites-available/<your-domain>
nano /etc/nginx/sites-available/<your-domain>   # replace DOMAIN + ports
ln -s /etc/nginx/sites-available/<your-domain> /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d <your-domain>                # choose redirect option
```

### 2.4 Deploy, seed, automate backups

```bash
make hub-deploy TAG=main-<sha>      # type the tag to confirm
make hub-seed                       # regions, colleges, officers, super admin
make hub-migrate                    # apply any migrations newer than schema.sql
make hub-cron-setup                 # nightly 2 AM DB backup to ./backups/
```

Verify: site loads over HTTPS, admin login works, `make hub-status` healthy.

## 3. Staging setup

Follow [STAGING.md §8](STAGING.md#8-server-setup-one-time). Short form: DNS
record for the staging subdomain → `cp .env.staging.example .env.staging` and
fill (separate JWT secret, **separate Cloudinary account**, `EMAIL_MODE=log`)
→ gate file via `htpasswd` → `deploy/nginx/spc-staging.conf.example` as the
vhost → certbot → `make staging-deploy TAG=staging-<sha>` →
`make staging-db-seed-sample`.

## 4. Migrating to a new server

### 4.1 On the OLD server — take everything portable

```bash
cd ~/dockers/campus-placement-portal
make hub-db-backup                   # fresh production dump in ./backups/

# collect secrets + state (NOT in git):
tar czf ~/spc-migration.tar.gz \
    .env .env.staging backups/ deploy-history.log \
    -C /etc/nginx .htpasswd_spc_staging
```

Copy to the new server: `scp ~/spc-migration.tar.gz root@NEW_IP:~/`

Note: student photos/logos live in **Cloudinary** (remote — nothing to move).
The `backend_uploads` volume normally holds only transient files; if you have
stored anything permanent there, also export it:
`docker run --rm -v campus-placement-portal_backend_uploads:/u -v ~/:/out alpine tar czf /out/uploads.tar.gz -C /u .`

### 4.2 On the NEW server

1. Do steps **1** and **2.2–2.3** above (prereqs, clone, nginx) — but instead
   of writing `.env` fresh, restore it:

   ```bash
   cd ~/dockers/campus-placement-portal
   tar xzf ~/spc-migration.tar.gz
   mv .htpasswd_spc_staging /etc/nginx/   # if staging is being migrated too
   ```

2. Start the stack and restore the database:

   ```bash
   make hub-deploy TAG=<IMAGE_TAG already in .env>   # type tag to confirm
   make hub-db-restore FILE=backups/hub_backup_<newest>.sql   # type RESTORE PRODUCTION
   ```

3. Cut over DNS: change the A record(s) to the new server IP. Keep the old
   server running until DNS has propagated (`dig +short`), then run certbot
   on the new server (certs are per-server; don't copy them):

   ```bash
   certbot --nginx -d <your-domain> [-d <staging-domain>]
   ```

4. Re-enable the backup cron: `make hub-cron-setup`. Re-create staging
   (section 3) — or skip it; staging is always rebuildable from scratch.

5. Decommission the old server only after verifying logins, photo display,
   and an email round-trip on the new one.

### 4.3 Migration gotchas

- **TLS before DNS propagates:** certbot's HTTP challenge fails until the
  domain resolves to the new server. Set a low DNS TTL a day ahead if you
  need a fast cutover.
- **Writes during cutover:** anything written to the old server after your
  final dump is lost. For a clean cutover: `make hub-down` on the old server,
  final `make hub-db-backup`, copy, restore, switch DNS.
- **Gmail/Cloudinary credentials** travel inside `.env` — nothing to
  reconfigure unless you *want* new accounts.
- The compose project name comes from the **directory name** — keep
  `campus-placement-portal` as the folder name or volume names will differ
  (a fresh restore makes this moot, but consistency avoids confusion).
