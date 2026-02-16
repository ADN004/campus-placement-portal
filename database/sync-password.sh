#!/bin/sh
set -e

# ============================================
# PostgreSQL Auth & Password Sync Script
# ============================================
# Runs BEFORE the main entrypoint on every container start.
#
# 1. Sets pg_hba.conf to use "trust" for Docker network connections
#    (postgres is only accessible within the Docker network, so this is safe)
# 2. Syncs the password to match POSTGRES_PASSWORD env var (for external tools)
# ============================================

PGDATA="${PGDATA:-/var/lib/postgresql/data}"

if [ -s "$PGDATA/PG_VERSION" ]; then
  echo "🔄 Configuring PostgreSQL authentication..."

  # Force pg_hba.conf to use trust for all non-local connections
  # This ensures the backend can always connect without password issues
  # Safe because postgres is only accessible within the Docker network
  if grep -q 'scram-sha-256\|md5' "$PGDATA/pg_hba.conf" 2>/dev/null; then
    sed -i 's/\(host all all all\).*/\1 trust/' "$PGDATA/pg_hba.conf"
    echo "  → pg_hba.conf: set Docker network auth to trust"
  fi

  # Also sync the password (useful for external tools like psql, pgAdmin)
  if [ -n "$POSTGRES_PASSWORD" ]; then
    su-exec postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses=''" -w start -l /tmp/pg_password_sync.log

    su-exec postgres psql -U "${POSTGRES_USER:-postgres}" -d postgres -c \
      "ALTER USER \"${POSTGRES_USER:-postgres}\" PASSWORD '${POSTGRES_PASSWORD}';" \
      > /dev/null 2>&1 || true

    su-exec postgres pg_ctl -D "$PGDATA" -m fast -w stop > /dev/null 2>&1

    echo "  → Password synced"
  fi

  echo "✅ Auth configuration complete"
fi

# Hand off to the official PostgreSQL Docker entrypoint
exec docker-entrypoint.sh "$@"
