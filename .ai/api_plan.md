# REST API Plan

## 1. Resources
- Users: `users` table (admins who manage groups)
- Groups: `groups` table (configured by an admin)
- Members: `members` table (participants within a group)
- Exclusions: `exclusions` table (one-way or mutual constraints; manual/historical)
- Draws: `draws` table (pending or finalized draw instances)
- Assignments: `assignments` table (giver → receiver pairs within a draw)
- Auth: virtual resource for registration/login/logout, anchored on `users`

Notes
- All identifiers are UUID strings.
- API base path: `/api/v1`.
- Resource nesting mirrors ownership: groups own members, exclusions, and draws; draws own assignments.

## 2. Endpoints

Conventions
- Pagination: `page` (default 1), `page_size` (default 20, max 100)
- Sorting: `sort` supports comma-separated fields; prefix with `-` for descending (e.g., `sort=-created_at,name`)
- Filtering: explicit query params per resource (e.g., `status`, `is_active`)
- Responses include `meta` for lists: `{ total, page, page_size, has_next }`
- Error payload shape: `{ error: { code: string, message: string, details?: object } }`

### 2.1 Auth

POST /api/v1/auth/register
- Description: Register a new user
- Payload: `{ email: string, password: string, name: string }`
- Response: `201` `{ id, email, name, created_at }`
- Success: `201 Created`
- Errors:
  - `400 invalid_payload`
  - `409 email_conflict` (case-insensitive uniqueness)

POST /api/v1/auth/login
- Description: Authenticate user; issues JWT as httpOnly cookie and returns profile
- Payload: `{ email: string, password: string }`
- Response: `200` `{ user: { id, email, name }, token_type: "Bearer" }` (token also set as httpOnly cookie `access_token`; CSRF token via header `X-CSRF-Token`)
- Success: `200 OK`
- Errors: `401 invalid_credentials`, `429 rate_limited`

POST /api/v1/auth/logout
- Description: Invalidate session by clearing httpOnly cookie
- Response: `204` no body
- Success: `204 No Content`

GET /api/v1/auth/me
- Description: Get current user profile
- Response: `200` `{ id, email, name, created_at, updated_at }`
- Errors: `401 unauthorized`

PATCH /api/v1/auth/me
- Description: Update profile (name and/or email)
- Payload: `{ name?: string, email?: string }`
- Response: `200` `{ id, email, name, updated_at }`
- Errors: `400 invalid_payload`, `409 email_conflict`, `401 unauthorized`

POST /api/v1/auth/change-password
- Description: Change password for logged-in user
- Payload: `{ current_password: string, new_password: string }`
- Response: `204` no body
- Errors: `400 weak_password`, `401 unauthorized`, `403 invalid_current_password`

### 2.2 Groups

GET /api/v1/groups
- Description: List groups owned by current user
- Query: `search?: string` (by name), `page?`, `page_size?`, `sort?` (default `-created_at`)
- Response: `200` `{ data: GroupSummary[], meta }`
  - GroupSummary: `{ id, name, created_at, historical_exclusions_enabled, historical_exclusions_lookback }`
- Errors: `401 unauthorized`

POST /api/v1/groups
- Description: Create a new group (caller becomes admin)
- Payload: `{ name: string, historical_exclusions_enabled?: boolean, historical_exclusions_lookback?: number }`
- Response: `201` `{ id, name, admin_user_id, historical_exclusions_enabled, historical_exclusions_lookback, created_at, updated_at }`
- Errors: `400 invalid_payload`, `401 unauthorized`

GET /api/v1/groups/{groupId}
- Description: Get group details including member counts
- Response: `200` `{ id, name, admin_user_id, historical_exclusions_enabled, historical_exclusions_lookback, created_at, updated_at, stats: { member_count, active_member_count } }`
- Errors: `401 unauthorized`, `404 group_not_found`, `403 forbidden`

PATCH /api/v1/groups/{groupId}
- Description: Update group name and exclusion settings
- Payload: `{ name?: string, historical_exclusions_enabled?: boolean, historical_exclusions_lookback?: number }`
- Response: `200` `{ id, name, historical_exclusions_enabled, historical_exclusions_lookback, updated_at }`
- Errors: `400 invalid_payload`, `401 unauthorized`, `404 group_not_found`, `403 forbidden`

DELETE /api/v1/groups/{groupId}
- Description: Delete group and cascade-owned data
- Response: `204` no body
- Errors: `401 unauthorized`, `404 group_not_found`, `403 forbidden`

### 2.3 Members

GET /api/v1/groups/{groupId}/members
- Description: List members in a group
- Query: `is_active?: boolean`, `search?: string` (name/email), `page?`, `page_size?`, `sort?` (default `name`)
- Response: `200` `{ data: Member[], meta }`
  - Member: `{ id, group_id, name, email?, is_active, created_at }`
- Errors: `401 unauthorized`, `404 group_not_found`, `403 forbidden`

POST /api/v1/groups/{groupId}/members
- Description: Add a member to a group
- Payload: `{ name: string, email?: string, is_active?: boolean }`
- Response: `201` Member
- Errors:
  - `400 invalid_payload`
  - `409 email_conflict_in_group` (case-insensitive, only when email provided)
  - `409 name_conflict_in_group` (enforced at application layer)
  - `401 unauthorized`, `404 group_not_found`, `403 forbidden`

GET /api/v1/groups/{groupId}/members/{memberId}
- Description: Get member details
- Response: `200` Member
- Errors: `401 unauthorized`, `404 member_not_found`, `403 forbidden`

PATCH /api/v1/groups/{groupId}/members/{memberId}
- Description: Update member fields
- Payload: `{ name?: string, email?: string, is_active?: boolean }`
- Response: `200` Member
- Errors: `400 invalid_payload`, `409 email_conflict_in_group`, `409 name_conflict_in_group`, `409 cannot_deactivate_due_to_pending_draw`, `401 unauthorized`, `404 member_not_found`, `403 forbidden`

DELETE /api/v1/groups/{groupId}/members/{memberId}
- Description: Remove a member (cascades exclusions)
- Response: `204` no body
- Errors: `401 unauthorized`, `404 member_not_found`, `403 forbidden`

### 2.4 Exclusions

GET /api/v1/groups/{groupId}/exclusions
- Description: List exclusions in a group
- Query: `type?: 'manual'|'historical'`, `giver_member_id?: UUID`, `receiver_member_id?: UUID`, `page?`, `page_size?`, `sort?` (default `exclusion_type,name`)
- Response: `200` `{ data: Exclusion[], meta }`
  - Exclusion: `{ id, group_id, giver_member_id, receiver_member_id, exclusion_type, is_mutual, created_at, created_by_user_id? }`
- Errors: `401 unauthorized`, `404 group_not_found`, `403 forbidden`

POST /api/v1/groups/{groupId}/exclusions
- Description: Create a one-way or mutual manual exclusion
- Payload: `{ giver_member_id: UUID, receiver_member_id: UUID, is_mutual?: boolean }`
- Response: `201` `{ created: Exclusion[], mutual: boolean }` (returns one or two rows)
- Errors: `400 invalid_payload`, `409 duplicate_exclusion`, `409 self_exclusion_not_allowed`, `401 unauthorized`, `404 group_or_member_not_found`, `403 forbidden`

POST /api/v1/groups/{groupId}/exclusions/bulk
- Description: Create multiple exclusions in one request (manual)
- Payload: `{ items: { giver_member_id: UUID, receiver_member_id: UUID, is_mutual?: boolean }[] }`
- Response: `201` `{ created: Exclusion[] }`
- Errors: `400 invalid_payload`, `409 conflicts_present` (with `details` listing conflicts), `401 unauthorized`, `403 forbidden`, `404 group_or_member_not_found`

DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}
- Description: Delete a single exclusion row
- Response: `204` no body
- Errors: `401 unauthorized`, `404 exclusion_not_found`, `403 forbidden`

### 2.5 Draws

GET /api/v1/groups/{groupId}/draws
- Description: List draws for a group
- Query: `status?: 'pending'|'finalized'`, `page?`, `page_size?`, `sort?` (default `-created_at`)
- Response: `200` `{ data: Draw[], meta }`
  - Draw: `{ id, group_id, status, created_at, finalized_at?, notification_sent_at? }`
- Errors: `401 unauthorized`, `404 group_not_found`, `403 forbidden`

POST /api/v1/groups/{groupId}/draws
- Description: Create a new pending draw
- Payload: `{}` (no body) or `{ seed?: string }` for deterministic testing
- Response: `201` Draw
- Errors: `401 unauthorized`, `404 group_not_found`, `403 forbidden`

GET /api/v1/draws/{drawId}
- Description: Get a specific draw
- Response: `200` Draw
- Errors: `401 unauthorized`, `404 draw_not_found`, `403 forbidden`

DELETE /api/v1/draws/{drawId}
- Description: Delete a pending draw (hard delete)
- Response: `204` no body
- Errors: `409 cannot_delete_finalized_draw`, `401 unauthorized`, `404 draw_not_found`, `403 forbidden`

POST /api/v1/draws/{drawId}/execute
- Description: Execute draw algorithm and generate assignments for a pending draw; idempotent
- Payload: `{ seed?: string }`
- Response: `200` `{ draw: Draw, assignments: AssignmentSummary[] }`
  - AssignmentSummary: `{ giver_member_id, receiver_member_id }`
- Errors: `409 already_finalized`, `409 assignments_already_generated` (if locked), `422 no_valid_configuration` (violated constraints), `400 invalid_payload`, `401 unauthorized`, `404 draw_not_found`, `403 forbidden`

POST /api/v1/draws/{drawId}/finalize
- Description: Finalize a draw (immutable afterwards)
- Payload: `{}`
- Response: `200` Draw (with `status='finalized'` and `finalized_at` set)
- Errors: `409 already_finalized`, `409 no_assignments_to_finalize`, `401 unauthorized`, `404 draw_not_found`, `403 forbidden`

POST /api/v1/draws/{drawId}/notify
- Description: Send email notifications for a finalized draw; sets `notification_sent_at`
- Payload: `{ resend?: boolean }` (default false)
- Response: `202` `{ sent: number, skipped: number }`
- Errors: `409 draw_not_finalized`, `400 invalid_payload`, `401 unauthorized`, `404 draw_not_found`, `403 forbidden`

### 2.6 Assignments (read-only)

GET /api/v1/draws/{drawId}/assignments
- Description: List assignments for a draw (admin-only in MVP)
- Query: `include?: 'names'|'none'` (default `none`)
- Response: `200` `{ data: Assignment[], meta }`
  - Assignment: `{ id, draw_id, giver_member_id, receiver_member_id, created_at }`
  - When `include='names'`, each item also has `{ giver_name, receiver_name }`
- Errors: `401 unauthorized`, `403 forbidden`, `404 draw_not_found`

## 3. Authentication and Authorization
- Mechanism: Stateless JWT (HS256) issued on login; stored in httpOnly cookie `access_token` with `SameSite=Lax`, `Secure` in production. CSRF protection via `X-CSRF-Token` header.
- Alternate: Authorization header `Bearer <token>` supported for API clients; if present, overrides cookie.
- Token claims: `sub` (user_id), `exp`, `iat`.
- Passwords hashed with bcrypt.
- Access control:
  - All `/groups/*`, `/members/*`, `/exclusions/*`, `/draws/*`, `/assignments/*` require authentication.
  - Only group `admin_user_id` can manage/read their group’s resources, including assignments.
  - Finalized draws are immutable: only read and notify allowed.
- Rate limiting: Apply per-IP and per-user limits to `/auth/login`, `/draws/*/execute`, `/draws/*/finalize`, `/draws/*/notify` (e.g., 5/minute per endpoint) using FastAPI middleware.
- CORS: Allow frontend origin; restrict methods/headers; disallow wildcard credentials in production.

## 4. Validation and Business Logic

Users
- Email: case-insensitive uniqueness; well-formed email regex; max length 255
- Password: minimum length per policy; bcrypt hashing

Groups
- Name: required, trimmed, max length 120
- Historical exclusions: `historical_exclusions_enabled` default true; `historical_exclusions_lookback` >= 0 (default 1)
- Ownership: only creator (admin) can access/manage

Members
- Name: required; unique within group (application-level); trimmed, max length 120
- Email: optional; when present, case-insensitive unique per group; max length 255
- Status: `is_active` default true; cannot deactivate if member is required for a pending draw where constraints would fail (application layer)

Exclusions
- Manual exclusions: prevent duplicates (same direction); `giver_member_id != receiver_member_id`
- Mutual exclusions: create two directional rows; set `is_mutual=true`
- Historical exclusions: created automatically from last `historical_exclusions_lookback` finalized draws when executing a draw (not user-editable; surfaced as type `historical`)

Draws
- States: `pending`|`finalized`
- Create: allowed anytime; multiple pending allowed
- Execute: requires ≥ 3 active members; validate constraints; use deterministic seed if provided; generate exactly one assignment per active member; prohibit self-assignments
- Finalize: only if assignments exist; sets `finalized_at`; draw becomes immutable
- Delete: allowed only for pending draws; cascades assignments

Assignments (read-only)
- Uniqueness: one assignment per giver in a draw
- No self-assignments
- Names can be optionally included for admin convenience

List Pagination/Filtering/Sorting
- Pagination caps at 100 per page
- Sorting fields per resource:
  - Groups: `created_at`, `name`
  - Members: `name`, `email`, `created_at`
  - Exclusions: `exclusion_type`, `created_at`
  - Draws: `created_at`, `finalized_at`, `status`
  - Assignments: `created_at`
- Filtering aligned with indexes:
  - Members: `is_active`, `group_id`
  - Exclusions: `group_id`, `giver_member_id`, `receiver_member_id`, `exclusion_type`
  - Draws: `group_id`, `status`

Security & Performance
- UUIDs mitigate ID enumeration
- Rate limit sensitive endpoints
- Algorithm target: < 5s for up to 100 members; backtracking with constraint checks
- Logging/audit: record draw creation, execution attempts, finalization, deletions (pending)

Schemas (Pydantic v2 examples)
- Group: `{ id: UUID, name: str, historical_exclusions_enabled: bool, historical_exclusions_lookback: int, created_at: datetime, updated_at: datetime }`
- Member: `{ id: UUID, group_id: UUID, name: str, email?: str|None, is_active: bool, created_at: datetime }`
- Exclusion: `{ id: UUID, group_id: UUID, giver_member_id: UUID, receiver_member_id: UUID, exclusion_type: Literal['manual','historical'], is_mutual: bool, created_at: datetime, created_by_user_id?: UUID|None }`
- Draw: `{ id: UUID, group_id: UUID, status: Literal['pending','finalized'], created_at: datetime, finalized_at?: datetime|None, notification_sent_at?: datetime|None }`
- Assignment: `{ id: UUID, draw_id: UUID, giver_member_id: UUID, receiver_member_id: UUID, created_at: datetime }`

HTTP Status Reference
- 200 OK: successful GET/POST actions that do not create a new resource
- 201 Created: resource created
- 202 Accepted: async work enqueued (notifications)
- 204 No Content: successful deletion or update without body
- 400 Bad Request: structurally invalid input
- 401 Unauthorized: authentication required/missing/invalid
- 403 Forbidden: lacks permission (not group admin)
- 404 Not Found: resource not found or not owned
- 409 Conflict: state conflicts (uniqueness, finalized immutability, duplicates)
- 422 Unprocessable Entity: valid input but violates business constraints (e.g., impossible draw)

Implementation Notes (FastAPI + Clean Architecture)
- Routers per resource under `/api/v1`: `auth`, `groups`, `members`, `exclusions`, `draws`
- Dependency injection for `current_user` and `group_admin_guard`
- Use cases: `execute_draw`, `finalize_draw`, `send_notifications`
- Repositories: async SQLAlchemy with indexes utilized for filters
- OpenAPI: auto-generated; frontend types via `openapi-typescript`
