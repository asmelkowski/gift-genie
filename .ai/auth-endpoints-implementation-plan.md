# API Endpoint Implementation Plan: POST /api/v1/auth/register

## 1. Endpoint Overview
Registers a new user account. Accepts email, password, and display name; validates input; enforces case-insensitive email uniqueness; stores a bcrypt password hash; returns created user metadata.

## 2. Request Details
- HTTP Method: POST
- URL Structure: `/api/v1/auth/register`
- Parameters:
  - Required: `email` (string), `password` (string), `name` (string)
  - Optional: none
- Request Body:
  - JSON: `{ "email": string, "password": string, "name": string }`
  - Constraints:
    - `email`: valid email format, trimmed, length ≤ 254
    - `password`: length ≥ 8; additional strength checks (see Validation Rules)
    - `name`: non-empty after trim; length 1–100

## 3. Used Types
- DTOs (Pydantic):
  - `RegisterRequest`
    - `email: EmailStr`
    - `password: str` (custom validators for strength)
    - `name: constr(min_length=1, max_length=100, strip_whitespace=True)`
    - `model_config = ConfigDict(extra="forbid")`
  - `UserCreatedResponse`
    - `id: str`
    - `email: EmailStr`
    - `name: str`
    - `created_at: datetime`
- Command Model (Application layer):
  - `RegisterUserCommand`
    - `email: str`
    - `password: str`
    - `name: str`
- Domain Entity:
  - Existing `User` (backend/src/gift_genie/domain/entities/user.py)
- Repository Port (new):
  - `UserRepository` (domain/interfaces/users.py or extend repositories.py)
    - `async def create(self, user: User) -> User`
    - `async def get_by_email_ci(self, email: str) -> User | None`
    - `async def email_exists_ci(self, email: str) -> bool`
- Application Errors:
  - `EmailConflictError`

## 4. Response Details
- Success 201 Created
  - Body: `{ "id": string, "email": string, "name": string, "created_at": string }`
  - Headers: `Location: /api/v1/users/{id}` (recommended but optional)
- Errors
  - 400 `invalid_payload`: validation errors (FastAPI/Pydantic) or password strength failure
  - 409 `email_conflict`: case-insensitive duplicate email
  - 500 `server_error`: unexpected failures

## 5. Data Flow
1. Presentation (FastAPI)
   - Route handler `POST /api/v1/auth/register` parses `RegisterRequest`.
   - Builds `RegisterUserCommand` and calls `RegisterUserUseCase`.
2. Application (Use Case)
   - Normalize: `email_norm = email.strip()`; use lower-case only for lookups.
   - Pre-check `repo.email_exists_ci(email_norm)`; if true → raise `EmailConflictError`.
   - Hash password via `PasswordHasher.hash(password)` (bcrypt).
   - Construct domain `User` (id via `uuid4()` at infra or app; timestamps set by infra).
   - Persist via `UserRepository.create`.
   - Return domain `User`.
3. Infrastructure
   - `UserModel` persists to `users` table; ensure unique index on `lower(email)`.
   - Implement `UserRepositorySqlAlchemy` with CI queries using `func.lower(UserModel.email) == email.lower()`.
   - Catch `IntegrityError` on create (unique lower(email)) and raise `EmailConflictError` for race conditions.
4. Presentation
   - Map to `UserCreatedResponse` and return 201 (optionally set `Location`).

## 6. Security Considerations
- Passwords
  - Use bcrypt with a suitable cost (configurable; default ok for now). Never log plaintext or hashes.
- Input Hardening
  - `extra='forbid'` on DTOs, length caps on fields, trim whitespace.
- PII Handling
  - Log minimal PII; avoid full email in logs; use hashed or partial if needed.
- Transport
  - Enforce HTTPS in deployment; no tokens issued here.
- Abuse
  - Optional rate limiting on register to mitigate signup abuse.

## 7. Error Handling
- 400 invalid_payload
  - Pydantic validation errors auto-mapped by FastAPI.
  - Password strength failure returns `HTTPException(status_code=400, detail={"code": "invalid_payload", "field": "password"})`.
- 409 email_conflict
  - Either from pre-check or from `IntegrityError` mapping.
  - Response: `{ "code": "email_conflict" }`.
- 500 server_error
  - Log error with request id; return generic error body.
- Logging
  - Structured logs; include event: "user_register" and result; mask sensitive data.
  - No dedicated error table in current schema; rely on logs/APM.

## 8. Performance Considerations
- One insert + optional existence check; ensure `lower(email)` index is UNIQUE to avoid scans.
- Avoid N+1 issues: none expected.
- Minimize allocations by performing one repo call when skipping pre-check in high-load paths; still handle DB conflict.

## 9. Implementation Steps
1. Domain
   - Add `UserRepository` protocol: `create`, `get_by_email_ci`, `email_exists_ci`.
   - Define `EmailConflictError` in a shared domain/application errors module.
2. Infrastructure
   - Migration: alter `idx_users_email_lower` to UNIQUE (or drop/create unique index) on `lower(email)`.
   - Implement `UserRepositorySqlAlchemy` in `infrastructure/database/repositories/users.py`.
     - Map between domain `User` and `UserModel`.
     - Implement CI queries with `func.lower`.
     - Translate `IntegrityError` to `EmailConflictError`.
   - Add `PasswordHasher` in `infrastructure/security/passwords.py` (wrap `bcrypt`): `hash`, `verify`.
3. Application
   - DTO: `RegisterUserCommand` (dataclass) in `application/dto/`.
   - Use case: `RegisterUserUseCase` in `application/use_cases/register_user.py`.
     - Pre-check existence; hash password; persist user; return entity.
4. Presentation (FastAPI)
   - Router file `presentation/api/v1/auth.py` (or `auth/register.py`).
     - Pydantic models: `RegisterRequest`, `UserCreatedResponse` with `extra='forbid'`.
     - Dependency injection: DB session, `UserRepository`, and `PasswordHasher`.
     - Handler: try/except `EmailConflictError` → 409; return 201 on success (optional `Location` header).
5. Wiring
   - Include router in `main.py` under `/api/v1/auth`.
   - Ensure CORS and settings already configured.
6. Tests (pytest)
   - Unit tests: password hasher; repository CI lookups; use case conflict and success.
   - API tests: 201 success; 400 validation (bad email, weak password, blank name); 409 duplicate email (case-insensitive).
7. Docs
   - Update `.ai/rules/api-docs.md`-aligned docs with request/response and error codes.

## 10. Validation Rules (Concrete)
- Email: `EmailStr`, trim, length ≤ 254.
- Password: min length 8; must include at least 3 of 4 classes (lowercase, uppercase, digit, symbol); reject if contains email local-part or name (case-insensitive). On failure → 400 `invalid_payload` with field error.
- Name: trim; length 1–100.

## 11. Example Schemas
- RegisterRequest
  - `{ "email": "alice@example.com", "password": "Str0ng!Pass", "name": "Alice" }`
- UserCreatedResponse
  - `{ "id": "<uuid>", "email": "alice@example.com", "name": "Alice", "created_at": "2025-10-08T12:34:56Z" }`
