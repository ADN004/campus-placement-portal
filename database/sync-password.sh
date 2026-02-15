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
#
# Also ensures pg_hba.conf allows md5 auth for Docker network connections
# (scram-sha-256 can cause intermittent auth failures with connection pools).
# ============================================

PGDATA="${PGDATA:-/var/lib/postgresql/data}"

if [ -s "$PGDATA/PG_VERSION" ] && [ -n "$POSTGRES_PASSWORD" ]; then
  echo "🔄 Syncing PostgreSQL password with environment variable..."

  # Ensure pg_hba.conf uses md5 for Docker network connections (not scram-sha-256)
  # This is safe because postgres is only accessible within the Docker network.
  if grep -q 'scram-sha-256' "$PGDATA/pg_hba.conf" 2>/dev/null; then
    sed -i 's/scram-sha-256/md5/g' "$PGDATA/pg_hba.conf"
    echo "  → Updated pg_hba.conf: scram-sha-256 → md5"
  fi

  # Set password_encryption to md5 to match pg_hba.conf
  su-exec postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='' -c password_encryption=md5" -w start -l /tmp/pg_password_sync.log

  # Sync the password to match POSTGRES_PASSWORD env var
  # Don't suppress output so we can see errors
  su-exec postgres psql -U "${POSTGRES_USER:-postgres}" -d postgres -c \
    "ALTER USER \"${POSTGRES_USER:-postgres}\" PASSWORD '${POSTGRES_PASSWORD}';"

  # Stop PostgreSQL (the real entrypoint will start it properly)
  su-exec postgres pg_ctl -D "$PGDATA" -m fast -w stop

  echo "✅ Password synced successfully"
fi

# Hand off to the official PostgreSQL Docker entrypoint
exec docker-entrypoint.sh "$@"
