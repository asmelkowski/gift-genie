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

# Default command runs tests with coverage
CMD ["bun", "run", "test:coverage"]

# ============================================================================
# Builder stage - Build production assets
# ============================================================================
FROM deps AS builder

# Copy application source
COPY . .

# Build the application
RUN bun run build

# ============================================================================
# Production stage - Serve with nginx
# ============================================================================
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css text/javascript application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy (if needed)
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

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

