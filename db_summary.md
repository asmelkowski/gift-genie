# Database Planning Summary

<conversation_summary>

<decisions>
Based on the recommendations provided in the database planning document and user clarifications, the following key decisions should be implemented:

1. Include `created_at` and `updated_at` timestamps on `users` and `groups` tables with automatic triggers
2. Include `created_at` timestamp on `members` table
3. Enforce email uniqueness per group only, using composite unique constraint on `(group_id, email)`
4. Store exclusions as separate rows per direction with `is_mutual` boolean flag
5. Include `created_at` and `created_by_user_id` columns in `exclusions` table for audit purposes
6. Use PostgreSQL ENUM type for `draw_status` with values ('pending', 'finalized')
7. Include both `created_at` and `finalized_at` timestamps in `draws` table
8. Add optional `encrypted_receiver_id` column in `assignments` table for future anonymous mode support (using simplest encryption method available)
9. Use CHECK constraint on `draws` to prevent deletion of finalized draws (validation enforced in domain layer)
10. Add unique constraint on `(draw_id, giver_member_id)` in `assignments` table
11. Create indexes on all foreign key columns
12. Create composite index on `draws(group_id, status)`
13. Use boolean `is_active` field instead of ENUM for member status in MVP
14. Row-Level Security (RLS) implementation deferred - validation handled in domain layer
15. Add `notification_sent_at` timestamp to `draws` table (sufficient for MVP, no separate logging table needed)
16. Handle password validation at application layer, store hashed passwords as TEXT
17. Use stateless JWT tokens for MVP (no sessions table needed)
18. Add `exclusion_type` ENUM with values ('manual', 'historical')
19. Add historical exclusion settings directly to `groups` table: `historical_exclusions_enabled` (boolean), `historical_exclusions_lookback` (integer representing number of previous draws)
20. Implement case-insensitive email uniqueness for both `users` and `members` tables using LOWER() indexes
21. Use `ON DELETE CASCADE` for foreign key relationships
22. Use UUID for all primary keys (uuid_generate_v4())
23. Enforce business rules (minimum 3 members, preventing status changes on finalized draws) at domain layer, not database
24. Add CHECK constraint preventing self-assignments: `CHECK (giver_member_id != receiver_member_id)`
25. Single admin per group (store as `admin_user_id` foreign key)
26. Create partial index on `members(group_id) WHERE is_active = true`
27. Include `created_at` timestamp on `assignments` table
28. Historical exclusions calculated in domain layer based on previous N draws (lookback count)
29. Allow multiple pending draws per group (no unique constraint)
30. Hard delete only - no soft deletion mechanism needed (finalized draws cannot be deleted, pending draws can be hard deleted)
31. Database migrations managed via Alembic
32. Validation and business logic primarily in domain layer, minimal database-level constraints
</decisions>

<matched_recommendations>

**High Priority for MVP Implementation:**

1. **Timestamp Audit Fields**: All tables should have appropriate timestamp fields (`created_at`, `updated_at`, `finalized_at`, `notification_sent_at`) with auto-update triggers for `updated_at`

2. **Security Implementation**:
   - UUID primary keys to prevent enumeration attacks
   - Case-insensitive email handling for authentication and member management using LOWER() indexes
   - Security validation primarily in domain layer rather than database RLS

3. **Data Integrity Constraints** (Minimal Database-Level):
   - Unique constraint on `(draw_id, giver_member_id)` in assignments
   - CHECK constraint preventing self-assignments in assignments table
   - Composite unique constraint on `(group_id, LOWER(email))` for members where email is not null
   - Unique index on `LOWER(email)` for users
   - Foreign key constraints with CASCADE deletion

4. **Performance Optimization**:
   - Indexes on all foreign key columns
   - Composite index on `draws(group_id, status)`
   - Partial index on `members(group_id) WHERE is_active = true`

5. **Exclusion System Design**:
   - Separate rows per exclusion direction with `is_mutual` flag
   - `exclusion_type` ENUM ('manual', 'historical')
   - Historical exclusion settings on groups table: `historical_exclusions_enabled` (boolean) and `historical_exclusions_lookback` (integer)
   - Historical exclusions calculated in domain layer: lookback refers to number of previous draws; members not participating in previous draws simply won't have exclusions from those draws applied

6. **Draw Lifecycle Management**:
   - ENUM type for `draw_status` ('pending', 'finalized')
   - `finalized_at` and `notification_sent_at` timestamps
   - Domain layer prevents deletion/modification of finalized draws
   - Hard delete only for pending draws

7. **Cascade Deletion Strategy**: Use `ON DELETE CASCADE` from users → groups → members, exclusions, draws → assignments

8. **Future-Proofing**: Add `encrypted_receiver_id` column (TEXT or BYTEA) in assignments table for post-MVP anonymous mode using simplest available encryption

9. **Migration Management**: Alembic for all database schema migrations and versioning

**Deferred/Not Needed for MVP:**

10. Row-Level Security (RLS) policies - security handled in domain/application layer
11. Database triggers for business logic validation - handled in domain layer
12. Separate notifications/email log table - simple timestamp field sufficient
13. Sessions table for token management - stateless JWT for MVP
14. Draw execution audit table - application logging sufficient
15. Database function `get_historical_exclusions()` - logic in domain layer
16. Soft deletes via `deleted_at` column - not needed (finalized draws immutable, pending draws hard deleted)
17. Complex database-level CHECK constraints for business rules - domain layer responsibility

</matched_recommendations>

<database_planning_summary>

## Main Requirements for Database Schema

The Gift Genie MVP requires a PostgreSQL database supporting a Secret Santa draw system with the following core capabilities:

- **User Management**: Authenticated users (admins) who create and manage groups
- **Group Management**: Each group has a single admin owner and contains members with configurable historical exclusion settings
- **Member Management**: Track participants within groups with email and active status
- **Exclusion Rules**: Support both manual exclusions and automatic historical exclusions based on past N draws
- **Draw Execution**: Generate assignments ensuring each member gives to exactly one other member while respecting exclusions
- **Draw Finalization**: Lock draws after finalization and send email notifications to participants
- **Domain-Driven Validation**: Business rules and security enforced primarily in domain/application layers

## Key Entities and Their Relationships

1. **users**: Application users who create and manage groups
   - Fields: id (UUID PK), email (unique, case-insensitive via LOWER() index), password_hash (TEXT), created_at, updated_at
   - Auto-update trigger on updated_at

2. **groups**: Secret Santa groups managed by users
   - Fields: id (UUID PK), admin_user_id (FK → users), name, historical_exclusions_enabled (boolean, default true), historical_exclusions_lookback (integer, default 1), created_at, updated_at
   - Relationship: One user (admin) owns many groups (ON DELETE CASCADE)
   - Auto-update trigger on updated_at

3. **members**: Participants within groups
   - Fields: id (UUID PK), group_id (FK → groups), name, email (optional, case-insensitive unique per group), is_active (boolean, NOT NULL, default true), created_at
   - Relationship: One group has many members (ON DELETE CASCADE)
   - Constraint: Composite unique on (group_id, LOWER(email)) WHERE email IS NOT NULL
   - Index: Partial index on (group_id) WHERE is_active = true

4. **exclusions**: Rules preventing certain member pairings
   - Fields: id (UUID PK), group_id (FK → groups), giver_member_id (FK → members), receiver_member_id (FK → members), exclusion_type ENUM ('manual', 'historical'), is_mutual (boolean), created_at, created_by_user_id (FK → users)
   - Relationship: Belongs to one group, references two members as giver and receiver (ON DELETE CASCADE)
   - Design: Each exclusion direction stored as separate row with is_mutual flag for two-way exclusions
   - Indexes: On group_id, giver_member_id, receiver_member_id

5. **draws**: Draw instances for groups (pending or finalized)
   - Fields: id (UUID PK), group_id (FK → groups), status ENUM ('pending', 'finalized'), created_at, finalized_at (nullable), notification_sent_at (nullable)
   - Relationship: One group has many draws (ON DELETE CASCADE)
   - Domain constraint: Finalized draws cannot be deleted or have status changed (enforced in domain layer)
   - Hard delete only (no soft deletion) - pending draws can be deleted, finalized draws are immutable
   - Index: Composite on (group_id, status)

6. **assignments**: Individual giver-receiver pairings within a draw
   - Fields: id (UUID PK), draw_id (FK → draws), giver_member_id (FK → members), receiver_member_id (FK → members), encrypted_receiver_id (TEXT/BYTEA, nullable, for future anonymous mode), created_at
   - Relationship: One draw has many assignments (ON DELETE CASCADE)
   - Constraints:
     - Unique on (draw_id, giver_member_id) - each member gives to exactly one person
     - CHECK (giver_member_id != receiver_member_id) - prevent self-assignment
   - Indexes: On draw_id, giver_member_id, receiver_member_id

## Important Security and Scalability Concerns

**Security Architecture:**

- **Domain Layer Validation**: Primary security enforcement in domain/application layers rather than database-level RLS
  - User authorization checks before any data access
  - Business rule validation (minimum 3 active members, finalized draw immutability)
  - Member lifecycle management

- **UUID Primary Keys**: Prevents enumeration attacks and ID guessing on API endpoints

- **Case-Insensitive Email Handling**: Prevents duplicate accounts/members with different case variations using LOWER() indexes on both users and members tables

- **Cascade Deletion**: ON DELETE CASCADE ensures complete data removal when users delete accounts, preventing orphaned records

- **Immutable Finalized Draws**: Domain layer prevents modification or deletion of finalized draws, ensuring historical integrity

- **Password Security**: Validation at application layer, only store hashed passwords (bcrypt) in database as TEXT

- **Future Anonymous Mode**: `encrypted_receiver_id` field prepared for post-MVP encrypted assignment feature using simplest available encryption method

**Scalability:**

- **Indexing Strategy**: Comprehensive indexes on foreign keys and common query patterns:
  - Foreign key indexes on all FK columns
  - Composite index on (group_id, status) for draws
  - Partial index on (group_id) WHERE is_active = true for members

- **Historical Exclusions Logic**: Calculated in domain layer
  - `historical_exclusions_lookback` represents number of previous draws to consider
  - If a member wasn't part of a previous draw, no exclusions from that draw are applied to them
  - Flexible for groups that draw multiple times per year or once per year

- **Stateless Authentication**: JWT tokens avoid session table overhead for MVP scale

- **Migration Management**: Alembic handles all schema migrations, versioning, and rollbacks

**Performance Considerations:**

- Expected group sizes: 4-50 members
- Draw complexity: O(n²) for exclusion checking but manageable at expected scale
- No need for materialized views or complex caching in MVP
- Standard PostgreSQL features adequate for anticipated load
- Hard deletes only - no soft delete overhead or complexity

</database_planning_summary>

<unresolved_issues>

None. All major decisions have been clarified:

1. ✅ **Historical Exclusion Implementation**: Lookback refers to number of previous draws; members not in previous draws simply have no exclusions from those draws
2. ✅ **Validation Strategy**: Domain layer handles business logic validation and security checks
3. ✅ **RLS Policies**: Not needed - security in domain layer
4. ✅ **Notification Tracking**: `notification_sent_at` timestamp is sufficient for MVP
5. ✅ **Deletion Strategy**: Hard delete only - finalized draws cannot be deleted (domain layer enforces), pending draws can be hard deleted
6. ✅ **Migration Strategy**: Alembic for all database migrations
7. ✅ **Anonymous Mode Encryption**: Use simplest available encryption method for `encrypted_receiver_id` field

**Ready for Implementation**: The database schema is fully specified and ready for Alembic migration creation.

</unresolved_issues>

</conversation_summary>
