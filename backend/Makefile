# Makefile for backend operations

.PHONY: install run test lint format typecheck clean help db-up db-down db-upgrade db-downgrade db-revision db-current db-history db-reset

install:
	@echo "Installing dependencies..."
	uv sync

run: db-up
	@echo "Starting the application..."
	uv run uvicorn src.gift_genie.main:app --reload

test:
	@echo "Running tests..."
	uv run pytest

test-coverage:
	@echo "Running tests with coverage..."
	uv run pytest --cov=src.gift_genie --cov-report=html --cov-report=term
	@echo "Coverage report generated in htmlcov/index.html"

test-watch:
	@echo "Running tests in watch mode..."
	uv run pytest --looponfail

test-verbose:
	@echo "Running tests with verbose output..."
	uv run pytest -v

lint:
	@echo "Running linter (ruff check)..."
	uv run ruff check src/

format:
	@echo "Running code formatters ..."
	uv run ruff format src/

typecheck:
	@echo "Running type checker (mypy)..."
	uv run mypy src/

clean:
	@echo "Cleaning up..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage

db-up:
	@echo "Starting database and redis containers..."
	docker compose -f ../docker-compose.yml up -d postgres redis
	@echo "Waiting for database to be ready..."
	@for i in 1 2 3 4 5; do \
		docker compose -f ../docker-compose.yml exec -T postgres pg_isready -U postgres && break || sleep 2; \
	done
	@echo "Waiting for redis to be ready..."
	@for i in 1 2 3 4 5; do \
		docker compose -f ../docker-compose.yml exec -T redis redis-cli ping | grep -q PONG && break || sleep 2; \
	done

db-down:
	@echo "Stopping database and redis containers..."
	docker compose -f ../docker-compose.yml down

db-upgrade: db-up
	@echo "Applying database migrations..."
	uv run alembic upgrade head

db-downgrade: db-up
	@echo "Rolling back last migration..."
	uv run alembic downgrade -1

db-revision: db-up
	@echo "Creating new migration..."
	@read -p "Enter migration message: " msg; \
	uv run alembic revision --autogenerate -m "$$msg"

db-current: db-up
	@echo "Showing current migration..."
	uv run alembic current

db-history: db-up
	@echo "Showing migration history..."
	uv run alembic history --verbose

db-reset: db-up
	@echo "Resetting database (downgrade all + upgrade all)..."
	uv run alembic downgrade base
	uv run alembic upgrade head

help:
	@echo "Usage: make <command>"
	@echo ""
	@echo "Commands:"
	@echo "  install        Install dependencies"
	@echo "  run            Start the application"
	@echo "  test           Run tests"
	@echo "  test-coverage  Run tests with coverage report"
	@echo "  test-watch     Run tests in watch mode"
	@echo "  test-verbose   Run tests with verbose output"
	@echo "  lint           Run linter (ruff check)"
	@echo "  format         Run code formatters (ruff format)"
	@echo "  typecheck      Run type checker (mypy)"
	@echo "  clean          Clean up build artifacts"
	@echo ""
	@echo "Database Commands:"
	@echo "  db-up          Start database and redis containers (Docker Compose)"
	@echo "  db-down        Stop database and redis containers"
	@echo "  db-upgrade     Apply all pending migrations (starts DB if needed)"
	@echo "  db-downgrade   Rollback last migration (starts DB if needed)"
	@echo "  db-revision    Create a new migration (autogenerate, starts DB if needed)"
	@echo "  db-current     Show current migration revision (starts DB if needed)"
	@echo "  db-history     Show migration history (starts DB if needed)"
	@echo "  db-reset       Reset database (downgrade all + upgrade all, starts DB if needed)"
	@echo ""
	@echo "  help           Display this help message"
