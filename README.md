# Gift Genie

Gift Genie is a web application designed to facilitate organized gift exchanges within groups. It allows users to create groups, add members, set exclusion rules (who cannot give gifts to whom), and automatically generate fair gift assignments through a randomized draw system.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Testing Strategy](#testing-strategy)
- [Project Scope](#project-scope)
  - [Core Features](#core-features)
  - [Future Features (Post-MVP)](#future-features-post-mvp)
- [Project Status](#project-status)
- [License](#license)

## Tech Stack

The project uses a modern tech stack with a Python backend and a React frontend.

| Category      | Technology                                                                                                                              |
|---------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| **Backend**   | [Python 3.13+](https://www.python.org/), [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy](https://www.sqlalchemy.org/), [Alembic](https://alembic.sqlalchemy.org/), [Pydantic](https://pydantic-docs.help.cn/), [PostgreSQL](https://www.postgresql.org/), [Ruff](https://docs.astral.sh/ruff/), [uv](https://github.com/astral-sh/uv) |
| **Frontend**  | [TypeScript](https://www.typescriptlang.org/), [React 18](https://react.dev/), [Vite](https://vitejs.dev/), [React Router](https://reactrouter.com/), [TanStack Query](https://tanstack.com/query/latest), [Zustand](https://github.com/pmndrs/zustand), [Axios](https://axios-http.com/), [Tailwind CSS](https://tailwindcss.com/), [Shadcn](https://ui.shadcn.com/) |
| **Testing**   | [Pytest](https://docs.pytest.org/), [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/), [Mock Service Worker](https://mswjs.io/), [Playwright](https://playwright.dev/)/[Cypress](https://www.cypress.io/), [Hurl](https://hurl.dev/) |
| **DevOps**    | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/)                                                     |

## Getting Started Locally

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following software installed on your system:

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Python 3.13+](https://www.python.org/downloads/)
- [Bun](https://bun.sh/)
- `uv` (can be installed with `pip install uv`)

### Installation

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/your-username/gift-genie.git
    cd gift-genie
    ```

2.  **Set up the Backend:**

    - Navigate to the backend directory:
      ```sh
      cd backend
      ```
    - Create a `.env` file for environment variables. You can copy the example if one is provided.
      ```sh
      # backend/.env
      DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie"
      # Add other environment variables as needed
      ```
    - Start the database container using Docker Compose:
      ```sh
      make db-up
      ```
    - Install Python dependencies:
      ```sh
      make install
      ```
    - Apply database migrations:
      ```sh
      make db-upgrade
      ```

3.  **Set up the Frontend:**

    - In a new terminal, navigate to the frontend directory:
      ```sh
      cd frontend
      ```
    - Install dependencies using Bun:
      ```sh
      bun install
      ```

### Running the Application

1.  **Start the Backend Server:**

    - In the `backend` directory:
      ```sh
      make run
      ```
    - The backend API will be available at `http://localhost:8000`.

2.  **Start the Frontend Development Server:**

    - In the `frontend` directory:
      ```sh
      bun dev
      ```
    - The frontend application will be available at `http://localhost:3000`. The Vite server is configured to proxy API requests to the backend.

## Available Scripts

### Backend

All backend commands are managed through the `Makefile` in the `backend` directory.

| Command        | Description                                                       |
|----------------|-------------------------------------------------------------------|
| `make install`   | Installs all Python dependencies using `uv sync`.                 |
| `make run`       | Starts the FastAPI development server with auto-reload.           |
| `make test`      | Runs the test suite using `pytest`.                               |
| `make lint`      | Checks for linting errors using `ruff`.                           |
| `make format`    | Formats the code using `ruff`.                                    |
| `make typecheck` | Runs static type checking using `mypy`.                           |
| `make db-up`     | Starts the PostgreSQL and Redis containers with Docker Compose.   |
| `make db-down`   | Stops the database and Redis containers.                          |
| `make db-upgrade`| Applies all pending database migrations using Alembic.            |
| `make db-reset`  | Resets the database by reverting and re-applying all migrations.  |

### Frontend

Frontend commands are defined in `frontend/package.json` and run with `bun`.

| Command       | Description                                                   |
|---------------|---------------------------------------------------------------|
| `bun dev`     | Starts the Vite development server.                           |
| `bun build`   | Builds the application for production.                        |
| `bun lint`    | Lints the codebase using ESLint.                              |
| `bun test`    | Runs the component and unit tests using Vitest.               |
| `bun preview` | Serves the production build locally for previewing.           |


## Testing Strategy

This project follows a comprehensive testing strategy to ensure code quality and application stability. For a detailed breakdown, please see the full [Test Plan](./.ai/test-plan.md).

-   **Unit & Integration Tests**:
    -   **Backend**: We use `pytest` with `pytest-asyncio` for asynchronous code. Tests cover individual components (unit) and interactions between layers like the API, use cases, and repositories (integration).
    -   **Frontend**: `Vitest` and `React Testing Library` are used for testing React components, hooks, and utility functions. API requests are mocked using `Mock Service Worker (MSW)`.

-   **End-to-End (E2E) Tests**:
    -   E2E tests will be implemented using `Playwright` or `Cypress` to simulate full user flows in a browser, ensuring the frontend and backend work together correctly from the user's perspective.

-   **API Tests**:
    -   We use `Hurl` for black-box testing of our API endpoints, verifying contracts, status codes, and error handling independently of the frontend.

## Project Scope

Gift Genie aims to simplify gift exchanges with a focus on fairness and custom rules.

### Core Features

-   **User Management**: Secure user registration and login for group administrators.
-   **Group Management**: Create and manage gift exchange groups.
-   **Member Management**: Add participants to groups. Members are lightweight and do not require user accounts.
-   **Exclusion Rules**: Define constraints on who can give gifts to whom (e.g., spouses don't exchange).
-   **Historical Exclusions**: Automatically prevent repeat pairings from previous years' draws.
-   **Draw System**: A robust algorithm generates fair and random assignments that respect all defined rules.
-   **Draw Lifecycle**: Draws can be in a `Pending` state (editable) or `Finalized` (immutable for historical records).
-   **Email Notifications**: Automatically notify members of their gift assignments once a draw is finalized.

### Future Features (Post-MVP)

-   Anonymous draw mode where not even the admin can see all pairings.
-   Password reset functionality.
-   "Remember me" for persistent login sessions.
-   User account deletion.

## Project Status

This project is currently **in active development**. The core features are being implemented, and the application is not yet production-ready.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.
