# Backend Dockerfile for Gift Genie
# Multi-stage build with dev, test, and production targets

# ============================================================================
# Base stage - Common dependencies
# ============================================================================
FROM python:3.13-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set working directory
WORKDIR /app

# Set common environment variables
ENV PYTHONPATH=/app/src \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# ============================================================================
# Dependencies stage - Install all dependencies including dev
# ============================================================================
FROM base AS deps

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install all dependencies (including dev/test dependencies)
RUN uv sync --frozen

# ============================================================================
# Development stage - Includes dev dependencies and hot-reloading
# ============================================================================
FROM deps AS development

# Copy application code
COPY . .

# Set PATH for virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run with hot-reloading enabled
CMD ["uvicorn", "gift_genie.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ============================================================================
# Test stage - Run tests with coverage
# ============================================================================
FROM deps AS test

# Copy application code
COPY . .

# Set PATH for virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Default command runs tests with coverage
CMD ["pytest", "--cov=gift_genie", "--cov-report=xml:/app/coverage.xml", "--cov-report=term"]

# ============================================================================
# Builder stage - Install production dependencies only
# ============================================================================
FROM base AS builder

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Create virtual environment and install production dependencies only
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
RUN uv sync --frozen --no-install-project --no-dev

# ============================================================================
# Production stage - Minimal runtime image
# ============================================================================
FROM python:3.13-slim AS production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv

# Copy application code
COPY --chown=appuser:appuser . .

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app/src \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "gift_genie.main:app", "--host", "0.0.0.0", "--port", "8000"]

