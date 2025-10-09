# Agent Guidelines for Gift Genie

## Commands
- **Backend** (from `backend/`): read Makefile
- **Frontend** (from `frontend/`): read package.json

## Architecture
- **Clean Architecture**: Domain → Application (use cases) → Infrastructure → Presentation. Dependencies point inward only.
- Backend layers: `domain/entities` (business rules, dataclasses), `domain/interfaces` (ports), `application/use_cases`, `infrastructure` (adapters, db), `presentation/api`

## Code Style
- **Backend**: Python 3.13+, ruff (line-length 100, double quotes), mypy for types, async/await for I/O, FastAPI dependency injection, Pydantic models for validation
- **Frontend**: React 18 functional components with hooks, TypeScript strict mode, styled-components, prettier (single quotes, semi, 100 width), use `useCallback`/`useMemo` for performance
- **Imports**: Group stdlib → third-party → local. Backend: absolute from `src.gift_genie`. Frontend: relative for same directory, absolute otherwise
- **Types**: Backend uses type hints (`str | None`, not `Optional`), Frontend explicit types for props/returns
- **Naming**: Backend: snake_case. Frontend: camelCase for vars/functions, PascalCase for components/types
- **Error handling**: Backend raises `HTTPException`, Frontend try/catch with user-friendly messages
- **Commits**: Conventional commits format `type(scope): description` (feat, fix, docs, style, refactor, test, chore)

## Rules

- Architecture: read @.ai/rules/architecture.md
- Python: read @.ai/rules/python.md
- FastAPI: read @.ai/rules/fastapi.md
- Database: read @.ai/rules/database.md
- Pytest: read @.ai/rules/pytest.md
- Frontend - React: read @.ai/rules/frontend-react.md
- Frontend - React Query: read @.ai/rules/frontend-react-query.md
- Frontend - React Router: read @.ai/rules/frontend-react-router.md
- Frontend - Zustand: read @.ai/rules/frontend-zustand.md
- Frontend - Styled Components: read @.ai/rules/frontend-styled-components.md
- Tooling - ESLint: read @.ai/rules/tooling-eslint.md
- Tooling - Prettier: read @.ai/rules/tooling-prettier.md
- API Docs: read @.ai/rules/api-docs.md
- DevOps - Docker: read @.ai/rules/devops-docker.md
- Version Control: read @.ai/rules/version-control.md
