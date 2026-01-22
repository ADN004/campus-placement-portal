# Frontend Dockerfile - Production Optimized Multi-stage Build

# Stage 1: Build Dependencies
FROM node:18-alpine AS dependencies

# Add metadata
LABEL maintainer="State Placement Cell Team"
LABEL description="Frontend for State Placement Cell - 60 Polytechnic Colleges Kerala"
LABEL version="1.0.0"

WORKDIR /app

# Copy package files (package-lock.json is required for reproducible builds)
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Using npm install to ensure package.json dependencies are respected
RUN npm install --no-audit --progress=false \
    && npm cache clean --force

# Stage 2: Build Application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build arguments (can be passed during docker build)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the application with optimizations
RUN npm run build \
    && ls -la dist

# Stage 3: Production Server with Nginx
FROM nginx:1.25-alpine

# Install security updates
RUN apk --no-cache upgrade

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx user for security
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# Expose port 80
EXPOSE 80

# Health check - improved
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Add labels for better container management
LABEL org.opencontainers.image.title="State Placement Cell Frontend"
LABEL org.opencontainers.image.description="React frontend for campus placement management"
LABEL org.opencontainers.image.vendor="State Placement Cell Team"

# Start nginx (runs as nginx user by default in alpine)
CMD ["nginx", "-g", "daemon off;"]
