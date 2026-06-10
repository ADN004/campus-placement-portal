#!/bin/bash
# ============================================================
# SPC Kerala Polytechnics — Automated Database Backup Script
# ============================================================
# This script runs pg_dump inside the postgres Docker container
# and saves a timestamped .sql file to the backups/ folder.
#
# SETUP (one time, on the server):
#   make hub-cron-setup
#
# Or manually add to crontab (crontab -e):
#   0 2 * * * /root/dockers/campus-placement-portal/scripts/spc-backup-cron.sh >> /root/spc-backup.log 2>&1
#
# RESTORE a backup:
#   make hub-db-restore FILE=backups/hub_backup_YYYYMMDD_HHMMSS.sql
# ============================================================

set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$DEPLOY_DIR/backups"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.hub.yml"
KEEP_DAYS=30
LOG_PREFIX="[SPC-BACKUP $(date '+%Y-%m-%d %H:%M:%S')]"

echo "$LOG_PREFIX ─── Starting backup ───"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

FILENAME="hub_backup_$(date +%Y%m%d_%H%M%S).sql"
FILEPATH="$BACKUP_DIR/$FILENAME"

# Run pg_dump inside the postgres container
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U postgres campus_placement_portal > "$FILEPATH"

# Verify the dump is non-empty
SIZE=$(wc -c < "$FILEPATH")
if [ "$SIZE" -lt 1024 ]; then
  echo "$LOG_PREFIX ERROR: Backup file is suspiciously small ($SIZE bytes). Removing."
  rm -f "$FILEPATH"
  exit 1
fi

HUMAN_SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "$LOG_PREFIX Backup saved: $FILENAME ($HUMAN_SIZE)"

# Rotate: delete backups older than KEEP_DAYS days
DELETED=$(find "$BACKUP_DIR" -name "hub_backup_*.sql" -mtime "+$KEEP_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "$LOG_PREFIX Rotated $DELETED backup(s) older than $KEEP_DAYS days"
fi

echo "$LOG_PREFIX ─── Done ───"
