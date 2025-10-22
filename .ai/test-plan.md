# Test Plan for Gift Genie Application

## 1. Introduction and Testing Objectives

### 1.1. Introduction
This document describes the strategy, scope, resources, and schedule for testing the "Gift Genie" application. The project consists of a Python backend (FastAPI) and a TypeScript frontend (React). The goal of this plan is to ensure the highest product quality by systematically detecting and eliminating bugs at all stages of development.

### 1.2. Testing Objectives
The main objectives of the testing process are:
- **Functional Verification**: To ensure that all application features work according to business requirements, including group management, draws, and exclusion handling.
- **Stability and Performance Assurance**: To identify and eliminate performance bottlenecks and ensure the application is stable under standard load.
- **Security Guarantee**: To verify that user data is secure and the system is resilient to basic attacks.
- **Code Quality Assurance**: To maintain high code quality through unit tests, static analysis, and code reviews.
- **Usability (UX/UI) Validation**: To check if the user interface is intuitive, consistent, and responsive.

## 2. Scope of Testing

### 2.1. In-Scope Features
- **Authentication Module**: Registration, login, logout, user session management.
- **Group Management Module**: Creating, editing, deleting groups.
- **Member Management Module**: Adding, editing, deleting members from groups.
- **Exclusion Management Module**: Defining pairs of members who cannot draw each other.
- **Draw Module**: Creating a new draw, running the draw algorithm, finalizing results.
- **Draw Results Module**: Securely displaying results to individual users.
- **Notifications**: (If applicable) Sending email/push notifications about draw results.
- **API**: All endpoints exposed by the backend.

### 2.2. Out-of-Scope Features
- Large-scale load testing (above 1000 concurrent users) is out of scope for this phase.
- Testing of third-party dependencies (e.g., email servers, hosting) – their reliability is assumed.

## 3. Types of Testing

The following types of tests will be conducted:

- **Unit Tests**:
  - **Backend**: Testing individual functions, classes, and methods in isolation (e.g., draw algorithm, use case logic, Pydantic validation).
  - **Frontend**: Testing single React components, hooks, and utility functions.

- **Integration Tests**:
  - **Backend**: Testing cooperation between application layers (API -> Use Case -> Repository), verifying the correctness of queries against a test database.
  - **Frontend**: Testing interactions between components (e.g., form and list), integration with `react-query` hooks and a mocked API.

- **End-to-End (E2E) Tests**:
  - Simulating full user paths in a browser, from login to viewing draw results. Verifying the consistency of data flow between the frontend and backend.

- **API Tests**:
  - Directly testing API endpoints using tools like Hurl or Postman, verifying the contract (requests/responses), HTTP status codes, and error handling.

- **Security Tests**:
  - Basic penetration testing, verifying authorization (a user cannot access another group's data), checking the correctness of password hashing.

- **Usability and UI/UX Tests**:
  - Manual verification of UI consistency, responsiveness (RWD) on different devices, and overall application intuitiveness.

- **Regression Tests**:
  - Automatically running key tests (unit, integration, E2E) after every code change to ensure new features have not broken existing ones.

## 4. Test Scenarios (Examples)

### Scenario 1: Full Gift Draw Cycle
1.  **Registration and Login**: User A creates an account and logs in.
2.  **Group Creation**: User A creates a group "Smith Family".
3.  **Adding Members**: User A adds 4 members to the group: B, C, D, E.
4.  **Defining Exclusions**: User A defines an exclusion: B cannot draw C (and vice versa).
5.  **Draw Creation**: User A creates a "Christmas 2025" draw within the group.
6.  **Running the Draw**: User A runs the draw.
7.  **Verifying Results**: User A checks that the draw has been completed. User B logs in and checks their result – it cannot be C. User C logs in and checks their result – it cannot be B.

### Scenario 2: Validation Error Handling
1.  **Registration**: A user tries to create an account with the password "123". The system should return an error about the password being too short.
2.  **Group Creation**: A user tries to create a group without providing a name. The form should display a "required field" message.
3.  **Adding a Member**: A user tries to add a member with an invalid email format. The system should return a validation error.

### Scenario 3: Authorization Test
1.  **Login**: User A logs in. User X logs in.
2.  **Group Creation**: User A creates group G1.
3.  **Access Attempt**: User X tries to access the details of group G1 (e.g., by directly entering the URL). The system should deny access (403 Forbidden or 404 Not Found error).

## 5. Test Environment

- **Development Environment (Local)**: On developers' machines using a local PostgreSQL database in a Docker container. Vite dev server proxies to the backend.
- **CI/CD Environment (Continuous Integration)**: An isolated environment (e.g., GitHub Actions) where unit tests, integration tests, and linting are run automatically after every push to the repository. It uses a separate, clean database for each test run.
- **Staging Environment**: A separate application instance that is a mirror of the production environment. E2E tests and manual tests (UAT) will be conducted here before deployment to production.

## 6. Testing Tools

| Purpose | Tool | Application |
|---|---|---|
| **Backend Testing** | `pytest`, `pytest-asyncio` | Framework for unit and integration tests in Python. |
| **HTTP Client** | `httpx` (within FastAPI's `TestClient`) | Simulating HTTP requests to the API in tests. |
| **Frontend Testing**| `vitest`, `React Testing Library`| Framework for unit and integration testing of React components. |
| **API Mocking** | `Mock Service Worker (msw)` | Intercepting and mocking network requests in frontend tests. |
| **E2E Testing** | `Playwright` or `Cypress` | Automating tests in a browser, simulating user actions. |
| **API Tests** | `Hurl` (as per the repository) | Testing the API contract and business logic from an HTTP client's perspective. |
| **CI/CD** | `GitHub Actions` | Automating the building, testing, and deployment of the application. |
| **Code Quality** | `Ruff`, `mypy`, `ESLint`, `Prettier` | Static code analysis, formatting, and type checking. |

## 7. Test Schedule

Testing is a continuous process integrated into the development cycle (CI/CD).
- **Unit and Integration Tests**: Written concurrently with production code by developers.
- **Regression Tests**: Run automatically after every push to the main development branch.
- **E2E Tests**: Developed as key functionalities stabilize. Run in CI/CD before every deployment to staging/production.
- **Manual Tests (UAT)**: Conducted on the staging environment before each new version release. Estimated time: 1-2 business days per release cycle.

## 8. Test Acceptance Criteria

### 8.1. Entry Criteria
- Code has successfully passed static analysis (linting, type checking).
- All new features have unit and/or integration test coverage.
- The application has been successfully deployed to the dedicated test environment.

### 8.2. Exit Criteria
- 100% of automated tests (unit, integration, E2E) pass successfully.
- Code coverage is maintained at a level no lower than 80% for key backend modules.
- All identified critical (blocker) and major bugs have been fixed.
- Reported bugs with lower priority have been analyzed and scheduled for fixing in subsequent iterations.
- The test plan has been fully executed.

## 9. Roles and Responsibilities

- **Developers**:
  - Responsible for writing unit and integration tests for the code they create.
  - Fixing bugs detected at all testing stages.
  - Maintaining high code quality and adhering to static analysis rules.
- **QA Engineer / Tester**:
  - Creating and maintaining this test plan.
  - Designing and implementing E2E tests.
  - Conducting manual exploratory and UAT testing.
  - Managing the bug reporting and tracking process.
- **Project Manager / Product Owner**:
  - Defining priorities for tested functionalities.
  - Final acceptance of the product based on test results (UAT).

## 10. Bug Reporting Procedures

All detected bugs will be reported and tracked in a project management system (e.g., Jira, GitHub Issues).

Each bug report must include:
- **Title**: A concise and unambiguous description of the problem.
- **Environment**: Where the bug occurred (e.g., local, staging, production).
- **Steps to Reproduce**: A precise, numbered list of actions leading to the bug.
- **Expected Result**: What should have happened.
- **Actual Result**: What actually happened.
- **Priority**: The bug's impact on the application (e.g., Blocker, Critical, Major, Minor).
- **Attachments**: Screenshots, video recordings, console/network logs.
