# =============================================================================
# NEXUS CHAT - React/Vite Frontend Dockerfile
# =============================================================================
# Multi-stage build for optimized image size
# 
# Build: docker build -t nexuschat-frontend:latest ./client
# Run:   docker run -p 5173:5173 nexuschat-frontend:latest
# =============================================================================

# =============================================================================
# STAGE 1: BUILDER
# =============================================================================
# Use Node 18 Alpine for building the React application
# - Alpine Linux is lightweight (~5MB base image)
# - Node 18 is the LTS version with long-term support
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for dependency caching)
# This allows Docker to cache npm install between builds
COPY package*.json ./

# Install dependencies
# - --prefer-offline: Use cached packages when available
# - --no-audit: Skip security audit (faster builds)
# - --no-fund: Skip funding messages (cleaner output)
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy source code
COPY . .

# =============================================================================
# BUILD ARGUMENTS
# =============================================================================
# These can be overridden at build time
# Example: docker build --build-arg VITE_API_URL=https://api.example.com
ARG VITE_API_URL=http://localhost:8080/api
ARG VITE_WEBSOCKET_URL=ws://localhost:8080/ws
ARG VITE_APP_ENV=development

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL
ENV VITE_APP_ENV=$VITE_APP_ENV

# Build the React application
# - npm run build runs Vite build command
# - Creates optimized production build in dist/ folder
RUN npm run build

# =============================================================================
# STAGE 2: RUNTIME
# =============================================================================
# Use Node 18 Alpine for serving static files
# - We use serve package to serve the static files
FROM node:18-alpine AS runtime

# Install serve for serving static files
# -s: serve single page application (SPA) mode
# -l: listen on specified port
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nexuschat && \
    adduser -S nexuschat -u 1001

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership
RUN chown -R nexuschat:nexuschat /app

# Switch to non-root user
USER nexuschat

# =============================================================================
# PORT CONFIGURATION
# =============================================================================
# Expose the port that serve will run on
# Default: 5173 (Vite dev server) or 3000 (serve default)
EXPOSE 5173

# =============================================================================
# HEALTH CHECK
# =============================================================================
# Verify the server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# =============================================================================
# ENTRYPOINT
# =============================================================================
# Run serve to serve static files
# -s: SPA mode (redirects all routes to index.html)
# -l 5173: Listen on port 5173
# -p: Proxy API requests to backend (optional, see below)
ENTRYPOINT ["serve", "-s", "dist", "-l", "5173"]

# =============================================================================
# PROXY CONFIGURATION (Optional)
# =============================================================================
# To proxy API requests to backend, use:
# ENTRYPOINT ["serve", "-s", "dist", "-l", "5173", "-p", "http://backend:8080"]
# 
# Or create a serve.json config file:
# {
#   "rewrites": [
#     { "source": "/api/**", "destination": "http://backend:8080/api/$1" }
#   ]
# }
# =============================================================================

# =============================================================================
# BUILD ARGUMENTS (set at runtime)
# =============================================================================
# Example: docker build --build-arg VITE_API_URL=https://api.example.com \
#                    --build-arg VITE_WEBSOCKET_URL=wss://ws.example.com \
#                    --build-arg VITE_APP_ENV=production \
#                    -t nexuschat-frontend:latest ./client
#
# Or set environment variables:
# docker build --build-arg VITE_APP_ENV=production -t nexuschat-frontend:latest ./client
# =============================================================================