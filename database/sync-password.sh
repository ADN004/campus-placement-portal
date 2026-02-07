#!/bin/sh
set -e

# ============================================
# PostgreSQL Password Sync Script
# ============================================
# PROBLEM: POSTGRES_PASSWORD only sets the password during first-time
# database initialization (empty volume). On subsequent container starts
# with an existing volume, it's completely ignored. This causes password
# mismatches when the backend expects the env var password.
#
# SOLUTION: This wrapper runs BEFORE the main entrypoint. If the database
# is already initialized, it temporarily starts PostgreSQL, syncs the
# password to match POSTGRES_PASSWORD, then stops it. The real entrypoint
# then starts PostgreSQL properly.
# ============================================

PGDATA="${PGDATA:-/var/lib/postgresql/data}"

if [ -s "$PGDATA/PG_VERSION" ] && [ -n "$POSTGRES_PASSWORD" ]; then
  echo "🔄 Syncing PostgreSQL password with environment variable..."

  # Start PostgreSQL temporarily (Unix socket only - no external connections)
  pg_ctl -D "$PGDATA" -o "-c listen_addresses=''" -w start -l /tmp/pg_password_sync.log

  # Sync the password to match POSTGRES_PASSWORD env var
  psql -U "${POSTGRES_USER:-postgres}" -d postgres -c \
    "ALTER USER \"${POSTGRES_USER:-postgres}\" PASSWORD '${POSTGRES_PASSWORD}';" \
    > /dev/null 2>&1

  # Stop PostgreSQL (the real entrypoint will start it properly)
  pg_ctl -D "$PGDATA" -m fast -w stop > /dev/null 2>&1

  echo "✅ Password synced successfully"
fi

# Hand off to the official PostgreSQL Docker entrypoint
exec docker-entrypoint.sh "$@"
