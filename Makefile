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

# Configuration
COMPOSE_FILE := docker-compose.yml
COMPOSE_DEV_FILE := docker-compose.dev.yml
COMPOSE_HUB_FILE := docker-compose.hub.yml
PROJECT_NAME := cpp

# Detect docker compose command (v2 vs v1)
DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

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

hub-deploy: ## Pull latest Hub images and restart
	@echo "Deploying latest images from Docker Hub..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) pull
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) up -d
	@echo ""
	@echo "Deployment complete!"
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

hub-db-reset: ## Full Hub DB reset: stop, remove volume, pull, start, seed
	@echo "WARNING: This will DELETE ALL DATA and recreate the database!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Stopping containers..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_HUB_FILE) down
	@echo "Removing database volume..."
	docker volume ls --format '{{.Name}}' | grep postgres_data | xargs -r docker volume rm || true
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
