# Gift Genie Tech Stack

## Overview
- **Architecture**: Clean Architecture — Domain → Application (use cases) → Infrastructure → Presentation (API)
- **API**: REST under `/api/v1`
- **OpenAPI**: Frontend types generated via `openapi-typescript`
- **Dev flow**: Vite dev server on `3000` proxies `/api` to backend on `8000`

## Backend
- **Language**: Python 3.13
- **Framework**: FastAPI (with CORS middleware)
- **ASGI Server**: Uvicorn
- **Architecture**: Domain entities and interfaces → Application use cases/DTOs → Infrastructure (DB, config) → Presentation (routers)
- **ORM / Migrations**: SQLAlchemy 2.x, Alembic
- **Database**: PostgreSQL via async driver (`postgresql+asyncpg`), URL in `Settings.DATABASE_URL`
- **Validation & Config**: Pydantic v2, `pydantic-settings`
- **Testing**: pytest, pytest-asyncio, httpx
- **Linting & Types**: Ruff (format + check, 100 cols, double quotes), mypy
- **Dependency/Tasks**: `uv` (sync/run); Makefile targets: `install`, `run`, `test`, `lint`, `format`, `typecheck`

## Frontend
- **Language**: TypeScript 5
- **UI Library**: React 18
- **Build/Dev**: Vite 5 with `@vitejs/plugin-react`
- **Routing**: `react-router-dom` v6
- **Data Fetching/Cache**: `@tanstack/react-query`
- **HTTP Client**: Axios with request/response interceptors; base URL from `VITE_API_BASE_URL` (defaults to `http://localhost:8000/api/v1`)
- **State Management**: Zustand
- **Styling**: styled-components v6
- **Lint/Format**: ESLint (@typescript-eslint, react-refresh), Prettier (singleQuote, semi, printWidth 100)
- **Types**: `openapi-typescript` generates `src/types/api.ts`
- **Aliases**: TS/Vite path aliases (`@`, `@/components`, `@/pages`, etc.)
- **Dev Server**: Port 3000; proxy `/api` → `http://localhost:8000`
