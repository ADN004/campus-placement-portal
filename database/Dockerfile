# Database Dockerfile - PostgreSQL with schema pre-loaded
# Used for Docker Hub deployment so professor doesn't need source files
#
# NOTE: Build context must be the project root directory, not ./database
# Example: docker build -f database/Dockerfile -t spc-database .
FROM postgres:15-alpine

LABEL maintainer="State Placement Cell Team"
LABEL description="PostgreSQL database for State Placement Cell with schema pre-loaded"

# Copy the complete schema (already includes everything from all migrations)
# Migrations are NOT included here because they're for upgrading existing
# databases, not fresh installs. schema.sql is the single source of truth.
COPY database/schema.sql /docker-entrypoint-initdb.d/01-schema.sql

# Password sync script: ensures the postgres password always matches the
# POSTGRES_PASSWORD env var, even on existing volumes where the default
# Docker entrypoint skips password setup.
COPY database/sync-password.sh /usr/local/bin/sync-password.sh
RUN chmod +x /usr/local/bin/sync-password.sh

ENTRYPOINT ["sync-password.sh"]
CMD ["postgres"]
