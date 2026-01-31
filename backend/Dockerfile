# Backend Dockerfile - Production Optimized
# Multi-stage build for smaller image size
#
# NOTE: Build context must be the PROJECT ROOT (not ./backend)
# Example: docker build -f backend/Dockerfile -t spc-backend .

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies

# Add metadata
LABEL maintainer="State Placement Cell Team"
LABEL description="Backend API for State Placement Cell - 60 Polytechnic Colleges Kerala"
LABEL version="1.0.0"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files (from backend/ since context is project root)
COPY backend/package*.json ./

# Install production dependencies
# Uses npm ci if package-lock.json exists, falls back to npm install otherwise
RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev --no-audit --progress=false; \
    else \
        npm install --omit=dev --no-audit --progress=false; \
    fi \
    && npm cache clean --force

# Stage 2: Production Image
FROM node:18-alpine

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create app user for security (don't run as root)
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from build stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy backend application code
COPY --chown=nodejs:nodejs backend/ .

# Copy database files for seeding (seed script reads from /database/)
COPY --chown=nodejs:nodejs database/ /database/

# Create necessary directories with proper permissions
RUN mkdir -p uploads logs \
    && chown -R nodejs:nodejs uploads logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Environment variables (can be overridden)
ENV NODE_ENV=production
ENV PORT=5000

# Health check - improved with better error handling
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]
