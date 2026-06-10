# ============================================
# STATE PLACEMENT CELL - DOCKER MAKEFILE
# ============================================
# Easy Docker management for the Campus Placement Portal
#
# Usage: make <target>
# Run 'make help' for available commands
#
# Requirements:
#   - Docker & Docker Compose
#   - GNU Make (Windows: install via chocolatey, scoop, or use Git Bash)
#
# ============================================

# Recipes use bash features (read -p); dash/sh is not sufficient
SHELL := /bin/bash

# Configuration
COMPOSE_FILE := docker-compose.yml
COMPOSE_DEV_FILE := docker-compose.dev.yml
COMPOSE_HUB_FILE := docker-compose.hub.yml
PROJECT_NAME := cpp

# Detect docker compose command (v2 vs v1)
DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Staging environment configuration
# Staging runs from the SAME compose file as production, but as a separate
# compose project with its own env file -> separate containers, volumes,
# network, ports, and database. See docs/STAGING.md
STAGING_ENV_FILE := .env.staging
STAGING_PROJECT := spc-staging
STAGING_DB_NAME := campus_placement_portal
STAGING_COMPOSE := $(DOCKER_COMPOSE) -p $(STAGING_PROJECT) --env-file $(STAGING_ENV_FILE) -f $(COMPOSE_HUB_FILE)

# Colors for terminal output (works in bash/zsh)
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

.PHONY: help
.DEFAULT_GOAL := help

# ============================================
# HELP
# ============================================

help: ## Show this help message
	@echo ""
	@echo "=========================================="
	@echo "  State Placement Cell - Docker Commands"
	@echo "=========================================="
	@echo ""
	@echo "PRODUCTION (local build):"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^(up|down|start|stop|restart|build|logs|status)" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
	@echo ""
	@echo "HUB DEPLOYMENT (Docker Hub images):"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^hub-" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
	@echo ""
	@echo "STAGING ENVIRONMENT (see docs/STAGING.md):"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^staging-" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-26s %s\n", $$1, $$2}'
	@echo ""
	@echo "DEVELOPMENT:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^dev" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
	@echo ""
	@echo "DATABASE:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^(seed|db-)" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
	@echo ""
	@echo "MAINTENANCE:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^(clean|prune|rebuild)" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
	@echo ""
	@echo "UTILITIES:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^(shell-|ps|images|env)" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
	@echo ""

# ============================================
# PRODUCTION COMMANDS
# ============================================

up: env-check ## Start all production containers
	@echo "Starting production containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo ""
	@echo "Containers started!"
	@echo "  Frontend: http://localhost"
	@echo "  Backend:  http://localhost:5000"
	@$(MAKE) --no-print-directory status

start: up ## Alias for 'up'

down: ## Stop all production containers
	@echo "Stopping production containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down
	@echo "Containers stopped."

stop: down ## Alias for 'down'

restart: ## Restart all production containers
	@echo "Restarting production containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) restart
	@$(MAKE) --no-print-directory status

build: env-check ## Build production images
	@echo "Building production images..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build
	@echo "Build complete!"

build-no-cache: env-check ## Build production images without cache
	@echo "Building production images (no cache)..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	@echo "Build complete!"

logs: ## View logs from all containers (follow mode)
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs -f

logs-backend: ## View backend logs only
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs -f backend

logs-frontend: ## View frontend logs only
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs -f frontend

logs-db: ## View database logs only
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) logs -f postgres

status: ## Show container status
	@echo ""
	@echo "Container Status:"
	@echo "-----------------"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) ps

ps: status ## Alias for 'status'

# ============================================
# HUB DEPLOYMENT COMMANDS (Docker Hub images)
# ============================================
# These commands use docker-compose.hub.yml which
# pulls pre-built images from Docker Hub.
# Used for server/production deployment.

hub-deploy: ## Deploy a pinned tag to PRODUCTION (usage: make hub-deploy TAG=main-<sha>)
	@if [ -z "$(TAG)" ]; then \
		echo "Usage: make hub-deploy TAG=main-<sha>"; \
		echo "Find tags in the GitHub Actions job summary, or in deploy-history.log"; \
		exit 1; \
	fi
	@case "$(TAG)" in main-*) ;; *) echo "ERROR: production deploys must use a main-* tag (got '$(TAG)')"; exit 1;; esac
	@CURRENT=$$(grep -E '^IMAGE_TAG=' .env 2>/dev/null | cut -d= -f2); \
	echo ""; \
	echo "  =========================================="; \
	echo "  PRODUCTION DEPLOYMENT"; \
	echo "  Currently deployed : $${CURRENT:-<not set>}"; \
	echo "  Target             : $(TAG)"; \
	echo "  =========================================="; \
	read -p "  Type the target tag to confirm: " confirm; \
	if [ "$$confirm" != "$(TAG)" ]; then echo "  Confirmation mismatch. Aborted."; exit 1; fi
	@if grep -qE '^IMAGE_TAG=' .env 2>/dev/null; then \
		sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$(TAG)|" .env; \
	else \
		echo "IMAGE_TAG=$(TAG)" >> .env; \
	fi
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) pull
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) up -d
	@echo "$$(date '+%Y-%m-%d %H:%M:%S')  production  $(TAG)" >> deploy-history.log
	@echo ""
	@echo "Production deployment of $(TAG) complete!"
	@$(MAKE) --no-print-directory hub-status

hub-pull: ## Pull latest images from Docker Hub
	@echo "Pulling latest images..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) pull

hub-up: ## Start Hub containers
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) up -d
	@$(MAKE) --no-print-directory hub-status

hub-down: ## Stop Hub containers
	@echo "Stopping Hub containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) down

hub-restart: ## Restart Hub containers
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) restart

hub-status: ## Show Hub container status
	@echo ""
	@echo "Hub Container Status:"
	@echo "---------------------"
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) ps

hub-ports: ## Show Hub container port mappings
	@echo ""
	@echo "Port Mappings:"
	@echo "--------------"
	@docker ps --filter "name=spc_" --format "table {{.Names}}\t{{.Ports}}"

hub-logs: ## View Hub backend logs (follow)
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) logs -f backend

hub-logs-all: ## View all Hub logs (follow)
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) logs -f

hub-logs-db: ## View Hub database logs
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) logs -f postgres

hub-seed: ## Seed the Hub database
	@echo "Running database seeding..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec backend node scripts/seedDatabase.js

hub-db-shell: ## Open PostgreSQL shell on Hub DB
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec postgres psql -U postgres -d campus_placement_portal

hub-db-sql: ## Run SQL on Hub DB (usage: make hub-db-sql SQL="SELECT 1")
	@if [ -z "$(SQL)" ]; then \
		echo "Usage: make hub-db-sql SQL=\"YOUR SQL HERE\""; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec postgres psql -U postgres -d campus_placement_portal -c "$(SQL)"

hub-db-tables: ## List all tables in Hub DB
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec postgres psql -U postgres -d campus_placement_portal -c "\dt"

hub-db-backup: ## Backup Hub database to ./backups folder
	@echo "Creating Hub database backup..."
	@mkdir -p backups
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec postgres pg_dump -U postgres campus_placement_portal > backups/hub_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup saved to backups/ folder"

hub-db-restore: ## Restore Hub database from backup (usage: make hub-db-restore FILE=backups/file.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make hub-db-restore FILE=backups/hub_backup_YYYYMMDD_HHMMSS.sql"; \
		exit 1; \
	fi
	@echo "This will OVERWRITE the PRODUCTION database with $(FILE)."
	@read -p "Type 'RESTORE PRODUCTION' to confirm: " confirm; \
	if [ "$$confirm" != "RESTORE PRODUCTION" ]; then echo "Aborted."; exit 1; fi
	@echo "Restoring Hub database from $(FILE)..."
	cat $(FILE) | $(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec -T postgres psql -U postgres -d campus_placement_portal
	@echo "Database restored!"

hub-migrate: ## Apply pending DB migrations to PRODUCTION (backs up first, asks confirmation)
	@echo "Migration status on PRODUCTION:"
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec backend node scripts/migrate.js --status
	@read -p "Type 'migrate' to back up the production DB and apply pending migrations: " confirm; \
	if [ "$$confirm" != "migrate" ]; then echo "Aborted."; exit 1; fi
	@$(MAKE) --no-print-directory hub-db-backup
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec backend node scripts/migrate.js

hub-cleanup-images: ## Remove local images unused by any container and older than 10 days
	@echo "This removes Docker images that are NOT used by any container (running or stopped)"
	@echo "and were created more than 10 days ago. Pinned, running images are never touched."
	@read -p "Continue? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	docker image prune -af --filter "until=240h"

hub-cron-setup: ## Install automated daily backup cron job (runs at 2 AM)
	@chmod +x scripts/spc-backup-cron.sh
	@( crontab -l 2>/dev/null | grep -v "spc-backup-cron.sh" ; \
	   echo "0 2 * * * $(PWD)/scripts/spc-backup-cron.sh >> $(HOME)/spc-backup.log 2>&1" ) | crontab -
	@echo "Cron job installed — daily backup at 2 AM"
	@echo "Logs → $(HOME)/spc-backup.log"
	@echo "Verify with: crontab -l"

hub-cron-remove: ## Remove automated backup cron job
	@crontab -l 2>/dev/null | grep -v "spc-backup-cron.sh" | crontab -
	@echo "Backup cron job removed."

hub-db-reset: ## Full Hub DB reset: stop, remove volume, pull, start, seed
	@echo "WARNING: This will DELETE ALL PRODUCTION DATA and recreate the database!"
	@read -p "Type 'RESET PRODUCTION' to confirm: " confirm; \
	if [ "$$confirm" != "RESET PRODUCTION" ]; then echo "Aborted."; exit 1; fi
	@echo "Stopping containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) down
	@echo "Removing database volume..."
	docker volume ls --format '{{.Name}}' | grep postgres_data | grep -v "^$(STAGING_PROJECT)_" | xargs -r docker volume rm || true
	@echo "Pulling latest images..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) pull
	@echo "Starting containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) up -d
	@echo "Waiting for database to initialize..."
	@sleep 30
	@echo "Seeding database..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec backend node scripts/seedDatabase.js
	@echo ""
	@echo "Database reset complete! Fresh start with seeded data."

hub-health: ## Check health of Hub services
	@echo "Checking Hub service health..."
	@echo ""
	@echo "Containers:"
	@docker ps --filter "name=spc_" --format "  {{.Names}}: {{.Status}}"
	@echo ""

hub-shell-backend: ## Open shell in Hub backend container
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec backend sh

hub-clean: ## Stop Hub containers and remove volumes
	@echo "Stopping Hub containers and removing volumes..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) down -v
	@echo "Hub cleanup complete."

# ============================================
# STAGING ENVIRONMENT COMMANDS
# ============================================
# Staging runs as a separate compose project (-p $(STAGING_PROJECT)) with its
# own env file ($(STAGING_ENV_FILE)) on the same host as production.
# Full guide: docs/STAGING.md
#
# Safety model:
#   - staging-guard       static checks on .env.staging before anything runs
#   - staging-guard-live  additionally verifies the RESOLVED containers are
#                         staging containers and are not production's

staging-guard:
	@if [ ! -f "$(STAGING_ENV_FILE)" ]; then \
		echo "ERROR: $(STAGING_ENV_FILE) not found."; \
		echo "Create it from the template: cp .env.staging.example $(STAGING_ENV_FILE)"; \
		exit 1; \
	fi
	@grep -qE '^APP_ENV=staging[[:space:]]*$$' $(STAGING_ENV_FILE) || { \
		echo "ERROR: $(STAGING_ENV_FILE) must contain APP_ENV=staging"; exit 1; }
	@PREFIX=$$(grep -E '^CONTAINER_PREFIX=' $(STAGING_ENV_FILE) | cut -d= -f2 | tr -d '[:space:]'); \
	if [ -z "$$PREFIX" ]; then echo "ERROR: CONTAINER_PREFIX must be set in $(STAGING_ENV_FILE)"; exit 1; fi; \
	if [ "$$PREFIX" = "spc" ]; then echo "ERROR: CONTAINER_PREFIX must not be 'spc' (that is production)"; exit 1; fi; \
	case "$$PREFIX" in *staging*) ;; *) echo "ERROR: CONTAINER_PREFIX must contain 'staging' (got '$$PREFIX')"; exit 1;; esac

staging-guard-live: staging-guard
	@SPG=$$($(STAGING_COMPOSE) ps -q postgres 2>/dev/null); \
	if [ -z "$$SPG" ]; then echo "ERROR: staging postgres is not running. Run 'make staging-up' first."; exit 1; fi; \
	SNAME=$$(docker inspect --format '{{.Name}}' $$SPG); \
	case "$$SNAME" in *staging*) ;; *) echo "ERROR: resolved container '$$SNAME' does not look like a staging container. Aborting."; exit 1;; esac; \
	PPG=$$($(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) ps -q postgres 2>/dev/null || true); \
	if [ -n "$$PPG" ] && [ "$$SPG" = "$$PPG" ]; then \
		echo "ERROR: staging and production resolved to the SAME postgres container. Aborting."; exit 1; \
	fi

# Internal: record the dataset mode shown by staging-status
# usage: $(MAKE) staging-set-mode MODE=empty [REFRESHED=1]
staging-set-mode:
	@$(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -c "\
		CREATE TABLE IF NOT EXISTS staging_meta ( \
			id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), \
			db_mode VARCHAR(20) NOT NULL, \
			mode_set_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \
			last_prod_refresh_at TIMESTAMP); \
		INSERT INTO staging_meta (id, db_mode) VALUES (1, '$(MODE)') \
		ON CONFLICT (id) DO UPDATE SET db_mode = '$(MODE)', mode_set_at = CURRENT_TIMESTAMP; \
		$(if $(REFRESHED),UPDATE staging_meta SET last_prod_refresh_at = CURRENT_TIMESTAMP WHERE id = 1;)" > /dev/null
	@echo "Staging dataset mode recorded: $(MODE)"

staging-deploy: staging-guard ## Deploy a pinned tag to staging (usage: make staging-deploy TAG=staging-<sha>)
	@if [ -z "$(TAG)" ]; then \
		echo "Usage: make staging-deploy TAG=staging-<sha>"; \
		echo "Find tags in the GitHub Actions job summary for the develop branch."; \
		exit 1; \
	fi
	@case "$(TAG)" in staging-*) ;; *) echo "ERROR: staging deploys must use a staging-* tag (got '$(TAG)')"; exit 1;; esac
	@if grep -qE '^IMAGE_TAG=' $(STAGING_ENV_FILE); then \
		sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$(TAG)|" $(STAGING_ENV_FILE); \
	else \
		echo "IMAGE_TAG=$(TAG)" >> $(STAGING_ENV_FILE); \
	fi
	$(STAGING_COMPOSE) pull
	$(STAGING_COMPOSE) up -d
	@echo "$$(date '+%Y-%m-%d %H:%M:%S')  staging     $(TAG)" >> deploy-history.log
	@echo ""
	@echo "Staging deployment of $(TAG) complete!"
	@$(STAGING_COMPOSE) ps

staging-up: staging-guard ## Start staging containers (uses pinned IMAGE_TAG)
	$(STAGING_COMPOSE) up -d
	@$(STAGING_COMPOSE) ps

staging-down: staging-guard ## Stop staging containers (volumes/data are kept)
	$(STAGING_COMPOSE) down

staging-restart: staging-guard ## Restart staging containers
	$(STAGING_COMPOSE) restart

staging-logs: staging-guard ## Follow staging backend logs (captured emails appear here)
	$(STAGING_COMPOSE) logs -f backend

staging-logs-all: staging-guard ## Follow all staging logs
	$(STAGING_COMPOSE) logs -f

staging-shell-backend: staging-guard ## Open shell in staging backend container
	$(STAGING_COMPOSE) exec backend sh

staging-db-shell: staging-guard-live ## Open PostgreSQL shell on the staging DB
	$(STAGING_COMPOSE) exec postgres psql -U postgres -d $(STAGING_DB_NAME)

staging-db-sql: staging-guard-live ## Run SQL on staging DB (usage: make staging-db-sql SQL="SELECT 1")
	@if [ -z "$(SQL)" ]; then echo "Usage: make staging-db-sql SQL=\"YOUR SQL HERE\""; exit 1; fi
	$(STAGING_COMPOSE) exec postgres psql -U postgres -d $(STAGING_DB_NAME) -c "$(SQL)"

staging-migrate: staging-guard-live ## Apply pending DB migrations to staging
	$(STAGING_COMPOSE) exec backend node scripts/migrate.js

staging-migrate-status: staging-guard-live ## Show applied/pending migrations on staging
	$(STAGING_COMPOSE) exec backend node scripts/migrate.js --status

staging-status: staging-guard ## Show staging mode, DB size, last prod refresh, dataset statistics
	@echo ""
	@echo "=========================================="
	@echo "  STAGING ENVIRONMENT STATUS"
	@echo "=========================================="
	@echo ""
	@echo "Pinned image tag : $$(grep -E '^IMAGE_TAG=' $(STAGING_ENV_FILE) | cut -d= -f2)"
	@PINNED=$$(grep -E '^IMAGE_TAG=' $(STAGING_ENV_FILE) | cut -d= -f2 | tr -d '[:space:]'); \
	SBC=$$($(STAGING_COMPOSE) ps -q backend 2>/dev/null); \
	if [ -n "$$SBC" ]; then \
		RUNNING=$$(docker inspect --format '{{.Config.Image}}' $$SBC | awk -F: '{print $$NF}'); \
		echo "Running image tag: $$RUNNING"; \
		if [ "$$RUNNING" != "$$PINNED" ]; then \
			echo ""; \
			echo "  ⚠ WARNING: running tag ($$RUNNING) differs from pinned IMAGE_TAG ($$PINNED)."; \
			echo "    The pinned tag has not been deployed. Run: make staging-deploy TAG=$$PINNED"; \
		fi; \
	fi
	@echo ""
	@echo "Containers:"
	@$(STAGING_COMPOSE) ps 2>/dev/null || true
	@echo ""
	@SPG=$$($(STAGING_COMPOSE) ps -q postgres 2>/dev/null); \
	if [ -z "$$SPG" ]; then \
		echo "Database         : NOT RUNNING (stopped or cleared — run 'make staging-up')"; \
		echo ""; \
		exit 0; \
	fi; \
	MODE=$$($(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -tAc \
		"SELECT db_mode || ' (set ' || to_char(mode_set_at, 'DD/MM/YYYY HH24:MI') || ')' FROM staging_meta WHERE id = 1" 2>/dev/null); \
	REFRESH=$$($(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -tAc \
		"SELECT COALESCE(to_char(last_prod_refresh_at, 'DD/MM/YYYY HH24:MI'), 'never') FROM staging_meta WHERE id = 1" 2>/dev/null); \
	SIZE=$$($(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -tAc \
		"SELECT pg_size_pretty(pg_database_size(current_database()))" 2>/dev/null); \
	echo "Dataset mode     : $${MODE:-unknown (staging_meta missing — DB changed outside make targets)}"; \
	echo "Last prod refresh: $${REFRESH:-never}"; \
	echo "Database size    : $${SIZE:-unknown}"; \
	echo ""; \
	echo "Dataset statistics:"; \
	$(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -c \
		"SELECT (SELECT COUNT(*) FROM students) AS students, \
		        (SELECT COUNT(*) FROM users) AS users, \
		        (SELECT COUNT(*) FROM jobs WHERE is_deleted = FALSE) AS jobs, \
		        (SELECT COUNT(*) FROM job_applications) AS applications, \
		        (SELECT COUNT(*) FROM notifications) AS notifications, \
		        (SELECT COUNT(*) FROM colleges) AS colleges" 2>/dev/null \
		|| echo "  (schema not initialized yet)"

staging-db-reset: staging-guard ## Reset staging DB to an EMPTY fresh schema (deletes all staging data)
	@read -p "Reset staging DB to an empty schema? All staging data will be lost. (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	$(STAGING_COMPOSE) down
	@docker volume rm $(STAGING_PROJECT)_postgres_data 2>/dev/null || true
	$(STAGING_COMPOSE) up -d
	@echo "Waiting for the database to initialize..."
	@sleep 30
	@$(MAKE) --no-print-directory staging-set-mode MODE=empty
	@echo ""
	@echo "Staging DB reset to empty schema."
	@echo "Next: 'make staging-db-seed-sample' for test data, or leave empty."

staging-db-clear: staging-guard ## Stop staging and DELETE ALL its volumes (frees disk when staging is not needed)
	@echo "This stops staging and deletes ALL staging volumes (database, uploads, logs,"
	@echo "and any volumes added to the compose file in the future)."
	@read -p "Clear the staging environment? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	$(STAGING_COMPOSE) down -v
	@echo "Staging cleared. Disk space released. Re-create any time with 'make staging-db-reset'."
	@echo "Note: old backups/staging_pre_refresh_*.sql files on the host are kept — delete manually when no longer needed."

staging-db-seed-sample: staging-guard-live ## Seed small sample dataset (10 students, 4 jobs, applications)
	@COUNT=$$($(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -tAc "SELECT COUNT(*) FROM colleges" 2>/dev/null || echo 0); \
	if [ "$$COUNT" = "0" ]; then \
		echo "Base data missing — running base seeder first (regions, colleges, super admin)..."; \
		$(STAGING_COMPOSE) exec backend node scripts/seedDatabase.js; \
	fi
	$(STAGING_COMPOSE) exec backend node scripts/seedStagingSample.js

staging-refresh-from-prod: staging-guard-live ## Overwrite staging DB with a fresh PRODUCTION clone (staging is backed up first)
	@echo "This will OVERWRITE the staging database with current PRODUCTION data."
	@echo "A staging backup is taken first. Production is only read (pg_dump), never written."
	@read -p "Continue? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	@mkdir -p backups
	@TS=$$(date +%Y%m%d_%H%M%S); \
	echo "1/4 Backing up staging -> backups/staging_pre_refresh_$$TS.sql"; \
	$(STAGING_COMPOSE) exec -T postgres pg_dump -U postgres $(STAGING_DB_NAME) > backups/staging_pre_refresh_$$TS.sql || exit 1; \
	echo "2/4 Dumping production -> backups/prod_for_staging_$$TS.sql"; \
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) exec -T postgres pg_dump -U postgres campus_placement_portal > backups/prod_for_staging_$$TS.sql || exit 1; \
	echo "3/4 Resetting staging schema..."; \
	$(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;" > /dev/null || exit 1; \
	echo "4/5 Restoring production data into staging..."; \
	cat backups/prod_for_staging_$$TS.sql | $(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -q || exit 1; \
	echo "    Removing temporary production dump (rollback backup staging_pre_refresh_$$TS.sql is kept)..."; \
	rm -f backups/prod_for_staging_$$TS.sql
	@echo "5/5 Sanitizing staging credentials..."
	@$(MAKE) --no-print-directory staging-db-sanitize
	@$(MAKE) --no-print-directory staging-set-mode MODE=prod-clone REFRESHED=1
	@echo ""
	@echo "Staging now contains a SANITIZED production clone."
	@echo "REMINDER: when real-data testing is done, run 'make staging-db-reset' (or staging-db-clear)"
	@echo "so production data does not linger in staging."

staging-db-sanitize: staging-guard-live ## Reset non-admin passwords to the known staging password, upsert staging admin, clear tokens
	$(STAGING_COMPOSE) exec backend node scripts/sanitizeStagingDb.js

staging-db-rollback: staging-guard-live ## Restore staging DB from a backup (usage: make staging-db-rollback FILE=backups/staging_pre_refresh_*.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make staging-db-rollback FILE=backups/staging_pre_refresh_YYYYMMDD_HHMMSS.sql"; \
		exit 1; \
	fi
	@read -p "Overwrite staging DB with $(FILE)? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;" > /dev/null
	cat $(FILE) | $(STAGING_COMPOSE) exec -T postgres psql -U postgres -d $(STAGING_DB_NAME) -q
	@$(MAKE) --no-print-directory staging-set-mode MODE=restored
	@echo "Staging DB restored from $(FILE)."

# ============================================
# DEVELOPMENT COMMANDS
# ============================================

dev: ## Start development environment with hot-reload
	@echo "Starting development environment..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) up -d
	@echo ""
	@echo "Development containers started!"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:5000"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) ps

dev-build: ## Build and start development environment
	@echo "Building and starting development environment..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) up -d --build
	@echo ""
	@echo "Development containers started!"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:5000"

dev-down: ## Stop development environment
	@echo "Stopping development containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) down
	@echo "Development containers stopped."

dev-logs: ## View development logs
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) logs -f

dev-restart: ## Restart development environment
	@echo "Restarting development containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) restart

dev-status: ## Show development container status
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) ps

# ============================================
# DATABASE COMMANDS
# ============================================

seed: ## Seed the database with initial data
	@echo "Running database seeding..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec backend node scripts/seedDatabase.js

seed-dev: ## Seed the development database
	@echo "Running database seeding (dev)..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) exec backend node scripts/seedDatabase.js

db-shell: ## Open PostgreSQL shell
	@echo "Connecting to PostgreSQL..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec postgres psql -U postgres -d campus_placement_portal

db-shell-dev: ## Open PostgreSQL shell (development)
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) exec postgres psql -U postgres -d campus_placement_portal_dev

db-backup: ## Backup the database to ./backups folder
	@echo "Creating database backup..."
	@mkdir -p backups
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec postgres pg_dump -U postgres campus_placement_portal > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup saved to backups/ folder"

db-restore: ## Restore database from backup (usage: make db-restore FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make db-restore FILE=backups/backup_file.sql"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	cat $(FILE) | $(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec -T postgres psql -U postgres -d campus_placement_portal
	@echo "Database restored!"

db-reset: ## Reset database (drop and recreate)
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Resetting database..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS campus_placement_portal;"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec postgres psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
	@echo "Database reset. Run 'make seed' to populate with initial data."

# ============================================
# SHELL ACCESS
# ============================================

shell-backend: ## Open shell in backend container
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec backend sh

shell-frontend: ## Open shell in frontend container
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec frontend sh

shell-db: ## Open shell in database container
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec postgres sh

# ============================================
# MAINTENANCE COMMANDS
# ============================================

clean: ## Stop containers and remove volumes
	@echo "Stopping containers and removing volumes..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down -v
	@echo "Cleanup complete."

clean-dev: ## Stop dev containers and remove volumes
	@echo "Stopping development containers and removing volumes..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) down -v
	@echo "Development cleanup complete."

clean-all: ## Remove all containers, volumes, and images for this project
	@echo "WARNING: This will remove all project containers, volumes, and images!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down -v --rmi all
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV_FILE) down -v --rmi all 2>/dev/null || true
	@echo "Full cleanup complete."

prune: ## Remove unused Docker resources (system-wide)
	@echo "Pruning unused Docker resources..."
	docker system prune -f
	@echo "Prune complete."

prune-all: ## Remove all unused Docker resources including volumes (CAUTION)
	@echo "WARNING: This will remove ALL unused Docker resources including volumes!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	docker system prune -af --volumes
	@echo "Full prune complete."

rebuild: down build up ## Rebuild and restart all containers

rebuild-backend: ## Rebuild only the backend service
	@echo "Rebuilding backend..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build backend
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d backend
	@echo "Backend rebuilt and restarted."

rebuild-frontend: ## Rebuild only the frontend service
	@echo "Rebuilding frontend..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build frontend
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d frontend
	@echo "Frontend rebuilt and restarted."

# ============================================
# UTILITY COMMANDS
# ============================================

images: ## List project Docker images
	@echo "Project Images:"
	@docker images | grep -E "cpp|campus" || echo "No project images found"

env-check: ## Check if .env file exists
	@if [ ! -f ".env" ]; then \
		echo ""; \
		echo "ERROR: .env file not found!"; \
		echo ""; \
		echo "Create it by running:"; \
		echo "  cp .env.docker.example .env"; \
		echo ""; \
		echo "Then edit .env with your configuration."; \
		echo ""; \
		exit 1; \
	fi

env-create: ## Create .env file from template
	@if [ -f ".env" ]; then \
		echo ".env already exists. Backup and overwrite? (y/N)"; \
		read confirm && [ "$$confirm" = "y" ] && cp .env .env.backup && cp .env.docker.example .env && echo "Created .env (backup saved to .env.backup)" || echo "Aborted."; \
	else \
		cp .env.docker.example .env; \
		echo ".env file created from template."; \
		echo "Edit it with your configuration before running 'make up'"; \
	fi

health: ## Check health of all services
	@echo "Checking service health..."
	@echo ""
	@echo "Backend:"
	@curl -s http://localhost:5000/health && echo " - OK" || echo "  - NOT RESPONDING"
	@echo ""
	@echo "Frontend:"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200" && echo "  - OK" || echo "  - NOT RESPONDING"
	@echo ""
	@echo "Database:"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && echo "  - OK" || echo "  - NOT RESPONDING"

# ============================================
# QUICK START COMMANDS
# ============================================

setup: env-create build up seed ## Full setup: create env, build, start, and seed database
	@echo ""
	@echo "=========================================="
	@echo "  Setup Complete!"
	@echo "=========================================="
	@echo ""
	@echo "Your application is now running!"
	@echo "  Frontend: http://localhost"
	@echo "  Backend:  http://localhost:5000"
	@echo ""

quick-start: env-check ## Quick start (assumes env is configured)
	@echo "Quick starting..."
	@if docker images cpp-backend:latest --format "{{.Repository}}" 2>/dev/null | grep -q "cpp-backend"; then \
		$(MAKE) --no-print-directory up; \
	else \
		echo "Images not found, building first..."; \
		$(MAKE) --no-print-directory build up; \
	fi

# ============================================
# DOCKER INFO
# ============================================

info: ## Show Docker and project information
	@echo ""
	@echo "=========================================="
	@echo "  Docker Information"
	@echo "=========================================="
	@echo ""
	@echo "Docker Version:"
	@docker --version
	@echo ""
	@echo "Docker Compose Version:"
	@$(DOCKER_COMPOSE) version
	@echo ""
	@echo "Compose Command: $(DOCKER_COMPOSE)"
	@echo ""
	@echo "Project Files:"
	@echo "  Production: $(COMPOSE_FILE)"
	@echo "  Development: $(COMPOSE_DEV_FILE)"
	@echo ""
