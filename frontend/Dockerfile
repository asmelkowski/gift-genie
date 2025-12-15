# Frontend Dockerfile for Gift Genie
# Multi-stage build with dev, test, and production targets

# ============================================================================
# Base stage - Common dependencies
# ============================================================================
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# ============================================================================
# Dependencies stage - Install all dependencies including devDependencies
# ============================================================================
FROM base AS deps

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies (includes devDependencies so vitest is available)
RUN bun install --frozen-lockfile

# ============================================================================
# Development stage - Run Vite dev server with HMR
# ============================================================================
FROM deps AS development

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run development server with hot-reloading
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# ============================================================================
# Test stage - Run tests with coverage
# ============================================================================
FROM deps AS test

# Copy application source
COPY . .

# Default command runs tests with coverage in non-watch mode
# Use vitest run explicitly to ensure CI mode and proper execution
ENV CI=true
CMD ["bun", "run", "test:coverage", "--reporter=verbose"]

# ============================================================================
# E2E stage - Run E2E tests with pre-installed Playwright browsers
# ============================================================================
FROM base AS e2e

# Install system dependencies required by Chromium and curl for connectivity testing
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    npm \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxrandr2 \
    libxext6 \
    libxfixes3 \
    libxdamage1 \
    libxcomposite1 \
    libxrender1 \
    libxkbcommon0 \
    libgbm1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libegl1 \
    libgl1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies (includes devDependencies so Playwright is available)
RUN bun install --frozen-lockfile

# Pre-install Playwright browsers (including system dependencies with --with-deps)
RUN npx playwright install --with-deps chromium

# Create test results directory
RUN mkdir -p /app/test-results
RUN mkdir -p /app/playwright/.auth
RUN mkdir -p /app/playwright/screenshots

# Copy application source
COPY . .

# Default command runs e2e tests
CMD ["npx", "playwright", "test"]

# ============================================================================
# Builder stage - Build production assets
# ============================================================================
FROM deps AS builder

# Copy application source
COPY . .

# Build the application
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# ============================================================================
# Production stage - Serve with nginx
# ============================================================================
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
