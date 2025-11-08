# Gift Genie Database Schema

## 1. Tables

### 1.1 users
Application users who create and manage groups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID (uuid_generate_v4()) |
| email | TEXT | NOT NULL | User's email address (case-insensitive uniqueness via index) |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| name | TEXT | NOT NULL | User's display name |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp (auto-updated via trigger) |

**Notes:**
- Email uniqueness enforced via unique index on LOWER(email)
- Password validation handled at application layer
- JWT tokens used for authentication (stateless, no sessions table)

### 1.2 groups
Gift exchange groups managed by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID (uuid_generate_v4()) |
| admin_user_id | UUID | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Group owner/admin |
| name | TEXT | NOT NULL | Group name |
| historical_exclusions_enabled | BOOLEAN | NOT NULL DEFAULT true | Enable automatic exclusions based on past draws |
| historical_exclusions_lookback | INTEGER | NOT NULL DEFAULT 1 | Number of previous draws to consider for exclusions |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Group creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp (auto-updated via trigger) |

**Notes:**
- Single admin per group (no multi-admin support in MVP)
- Historical exclusion settings stored directly on group
- Lookback count represents number of previous finalized draws to check
- Deleting a user cascades to delete all their groups

### 1.3 members
Participants within gift exchange groups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID (uuid_generate_v4()) |
| group_id | UUID | NOT NULL REFERENCES groups(id) ON DELETE CASCADE | Parent group |
| name | TEXT | NOT NULL | Member's name (must be unique within group context) |
| email | TEXT | NULL | Optional email for notifications (case-insensitive uniqueness per group) |
| is_active | BOOLEAN | NOT NULL DEFAULT true | Active status for participation in draws |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Member creation timestamp |

**Constraints:**
- UNIQUE (group_id, LOWER(email)) WHERE email IS NOT NULL

**Notes:**
- Members are lightweight entities separate from app users
- Email is optional but recommended for notifications
- Name uniqueness enforced at application layer (business logic)
- Inactive members excluded from draws without deletion
- Deleting a group cascades to delete all its members

### 1.4 exclusions
Rules preventing specific member pairings in draws.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID (uuid_generate_v4()) |
| group_id | UUID | NOT NULL REFERENCES groups(id) ON DELETE CASCADE | Parent group |
| giver_member_id | UUID | NOT NULL REFERENCES members(id) ON DELETE CASCADE | Member who cannot give to receiver |
| receiver_member_id | UUID | NOT NULL REFERENCES members(id) ON DELETE CASCADE | Member who cannot receive from giver |
| exclusion_type | exclusion_type_enum | NOT NULL | Type: 'manual' or 'historical' |
| is_mutual | BOOLEAN | NOT NULL DEFAULT false | If true, exclusion applies in both directions |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Exclusion creation timestamp |
| created_by_user_id | UUID | NULL REFERENCES users(id) ON DELETE SET NULL | User who created the exclusion (null for system-generated) |

**Notes:**
- Each exclusion direction stored as separate row
- Historical exclusions automatically created by domain layer based on past N draws
- For mutual exclusions, both directions are stored with is_mutual flag
- Self-exclusions (giver = receiver) implicitly enforced, not stored
- Deleting a member cascades to delete their exclusions

### 1.5 draws
Draw instances for groups (pending or finalized).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID (uuid_generate_v4()) |
| group_id | UUID | NOT NULL REFERENCES groups(id) ON DELETE CASCADE | Parent group |
| status | draw_status_enum | NOT NULL DEFAULT 'pending' | Draw status: 'pending' or 'finalized' |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Draw creation timestamp |
| finalized_at | TIMESTAMPTZ | NULL | Timestamp when draw was finalized |
| notification_sent_at | TIMESTAMPTZ | NULL | Timestamp when email notifications were sent |

**Notes:**
- Multiple pending draws allowed per group (no unique constraint)
- Finalized draws are immutable (cannot be modified or deleted) - enforced in domain layer
- Pending draws can be hard deleted
- Each finalized draw triggers new email notifications
- Historical exclusions calculated from finalized draws only
- Deleting a group cascades to delete all its draws

### 1.6 assignments
Individual giver-receiver pairings within a draw.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated UUID (uuid_generate_v4()) |
| draw_id | UUID | NOT NULL REFERENCES draws(id) ON DELETE CASCADE | Parent draw |
| giver_member_id | UUID | NOT NULL REFERENCES members(id) ON DELETE CASCADE | Member giving the gift |
| receiver_member_id | UUID | NOT NULL REFERENCES members(id) ON DELETE CASCADE | Member receiving the gift |
| encrypted_receiver_id | TEXT | NULL | Encrypted receiver ID for future anonymous mode (post-MVP) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | Assignment creation timestamp |

**Constraints:**
- UNIQUE (draw_id, giver_member_id)
- CHECK (giver_member_id != receiver_member_id)

**Notes:**
- Each member gives to exactly one person per draw (enforced by unique constraint)
- Self-assignment prevented by CHECK constraint
- encrypted_receiver_id prepared for post-MVP anonymous mode feature
- Deleting a draw cascades to delete all its assignments

## 2. Relationships

### Entity Relationship Diagram

```
users (1) ────< (N) groups
  │
  │ (created_by_user_id, optional)
  │
  └────< (N) exclusions

groups (1) ────< (N) members
  │
  ├────< (N) exclusions
  │
  └────< (N) draws

members (1) ────< (N) exclusions (as giver)
  │
  ├────< (N) exclusions (as receiver)
  │
  ├────< (N) assignments (as giver)
  │
  └────< (N) assignments (as receiver)

draws (1) ────< (N) assignments
```

### Relationship Details

| Parent | Child | Cardinality | ON DELETE | Description |
|--------|-------|-------------|-----------|-------------|
| users | groups | 1:N | CASCADE | User owns multiple groups |
| users | exclusions | 1:N | SET NULL | User creates exclusions (optional tracking) |
| groups | members | 1:N | CASCADE | Group contains multiple members |
| groups | exclusions | 1:N | CASCADE | Group has multiple exclusion rules |
| groups | draws | 1:N | CASCADE | Group has multiple draws over time |
| members | exclusions (giver) | 1:N | CASCADE | Member as giver in exclusions |
| members | exclusions (receiver) | 1:N | CASCADE | Member as receiver in exclusions |
| members | assignments (giver) | 1:N | CASCADE | Member as giver in assignments |
| members | assignments (receiver) | 1:N | CASCADE | Member as receiver in assignments |
| draws | assignments | 1:N | CASCADE | Draw contains multiple assignments |

**Cascade Deletion Flow:**
- Deleting a user → deletes all their groups → deletes all members, exclusions, draws → deletes all assignments
- Deleting a group → deletes all members, exclusions, and draws → deletes all assignments
- Deleting a member → deletes related exclusions and assignments
- Deleting a draw → deletes all assignments

## 3. Enums

### 3.1 draw_status_enum
```sql
CREATE TYPE draw_status_enum AS ENUM ('pending', 'finalized');
```

**Values:**
- `pending`: Draw is in progress, can be edited or deleted
- `finalized`: Draw is locked and immutable, used for historical exclusions

### 3.2 exclusion_type_enum
```sql
CREATE TYPE exclusion_type_enum AS ENUM ('manual', 'historical');
```

**Values:**
- `manual`: User-created exclusion rule (e.g., spouse, parent-child)
- `historical`: System-generated exclusion based on past N draws

## 4. Indexes

### 4.1 Primary Key Indexes
All tables have primary key indexes on `id` column (UUID) - automatically created.

### 4.2 Foreign Key Indexes
```sql
CREATE INDEX idx_groups_admin_user_id ON groups(admin_user_id);
CREATE INDEX idx_members_group_id ON members(group_id);
CREATE INDEX idx_exclusions_group_id ON exclusions(group_id);
CREATE INDEX idx_exclusions_giver_member_id ON exclusions(giver_member_id);
CREATE INDEX idx_exclusions_receiver_member_id ON exclusions(receiver_member_id);
CREATE INDEX idx_exclusions_created_by_user_id ON exclusions(created_by_user_id);
CREATE INDEX idx_draws_group_id ON draws(group_id);
CREATE INDEX idx_assignments_draw_id ON assignments(draw_id);
CREATE INDEX idx_assignments_giver_member_id ON assignments(giver_member_id);
CREATE INDEX idx_assignments_receiver_member_id ON assignments(receiver_member_id);
```

### 4.3 Unique Indexes
```sql
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE UNIQUE INDEX idx_members_group_email_lower ON members(group_id, LOWER(email)) WHERE email IS NOT NULL;
```

### 4.4 Composite Indexes
```sql
CREATE INDEX idx_draws_group_status ON draws(group_id, status);
```

### 4.5 Partial Indexes
```sql
CREATE INDEX idx_members_group_active ON members(group_id) WHERE is_active = true;
```

### Index Purpose Summary

| Index | Purpose | Query Pattern |
|-------|---------|---------------|
| idx_users_email_lower | Case-insensitive email uniqueness and login | SELECT WHERE LOWER(email) = ? |
| idx_members_group_email_lower | Case-insensitive email uniqueness per group | SELECT WHERE group_id = ? AND LOWER(email) = ? |
| idx_groups_admin_user_id | Find all groups for a user | SELECT WHERE admin_user_id = ? |
| idx_members_group_id | List members in a group | SELECT WHERE group_id = ? |
| idx_members_group_active | Filter active members for draws | SELECT WHERE group_id = ? AND is_active = true |
| idx_exclusions_group_id | List exclusions for a group | SELECT WHERE group_id = ? |
| idx_exclusions_giver_member_id | Find exclusions by giver | SELECT WHERE giver_member_id = ? |
| idx_exclusions_receiver_member_id | Find exclusions by receiver | SELECT WHERE receiver_member_id = ? |
| idx_draws_group_status | Find pending/finalized draws for a group | SELECT WHERE group_id = ? AND status = ? |
| idx_assignments_draw_id | List assignments for a draw | SELECT WHERE draw_id = ? |
| idx_assignments_giver_member_id | Find assignment by giver | SELECT WHERE giver_member_id = ? |

## 5. Triggers

### 5.1 Updated At Triggers

Automatically update `updated_at` timestamp on record modification.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 6. PostgreSQL Policies (Row-Level Security)

**RLS is NOT implemented for MVP.** Security and access control are enforced in the domain and application layers:

- User authentication via JWT tokens
- Authorization checks in use cases before data access
- Business rule validation in domain entities
- Admin-only access to group management enforced in API layer

**Rationale for deferring RLS:**
- Simpler implementation and debugging
- Adequate security for MVP scope
- Application-layer enforcement provides flexibility
- Can be added post-MVP if stricter database-level security needed

## 7. Design Decisions and Notes

### 7.1 UUID Primary Keys
- All tables use UUID primary keys (uuid_generate_v4())
- Prevents enumeration attacks on API endpoints
- No sequential ID guessing
- Better for distributed systems and data portability

### 7.2 Case-Insensitive Email Handling
- Users table: Unique index on LOWER(email) prevents "user@example.com" and "User@Example.com"
- Members table: Composite unique index on (group_id, LOWER(email)) prevents duplicates per group
- Authentication queries use LOWER(email) for case-insensitive matching

### 7.3 Exclusion Storage Model
- Each exclusion direction stored as separate row
- `is_mutual` flag indicates two-way exclusions
- Allows efficient querying: "who can't X give to?" → single direction lookup
- Historical exclusions automatically created by domain layer after draw finalization
- `exclusion_type` distinguishes manual vs system-generated rules

### 7.4 Historical Exclusions Logic
- Settings stored on groups table: `historical_exclusions_enabled`, `historical_exclusions_lookback`
- Lookback count = number of previous finalized draws to check
- Calculated in domain layer, not database functions
- If member wasn't in a previous draw, no exclusions from that draw apply
- Flexible for groups with varying draw frequencies

### 7.5 Draw Immutability
- Finalized draws cannot be modified or deleted (enforced in domain layer)
- `finalized_at` timestamp marks the point of immutability
- Pending draws can be hard deleted (no soft delete mechanism)
- All finalized draws contribute to historical exclusions
- If changes needed after finalization, admin creates new draw

### 7.6 Multiple Draws Per Group
- No unique constraint on pending draws per group
- Multiple finalized draws can coexist (multi-year history)
- Each draw independent with its own assignments
- Draw history tracked via timestamps (created_at, finalized_at)

### 7.7 Cascade Deletion Strategy
- All foreign keys use ON DELETE CASCADE (except created_by_user_id which uses SET NULL)
- Ensures complete data removal when user deletes account
- Prevents orphaned records
- Groups, members, exclusions, draws, and assignments all cascade appropriately

### 7.8 Anonymous Mode Preparation
- `encrypted_receiver_id` column in assignments table (nullable, TEXT)
- Reserved for post-MVP anonymous mode feature
- Will use simplest available encryption method
- Currently unused in MVP (assignments visible to admin)

### 7.9 Notification Tracking
- `notification_sent_at` timestamp on draws table
- Sufficient for MVP (tracks if/when notifications sent)
- No separate email log table needed
- Can be extended post-MVP if detailed delivery tracking required

### 7.10 Authentication Strategy
- Stateless JWT tokens (no sessions table)
- Password hashing with bcrypt (stored in password_hash column)
- Password validation rules enforced at application layer
- Token expiration and refresh handled in application code

### 7.11 Business Rules Validation
Enforced in domain/application layers, not database:
- Minimum 3 active members required for draw
- Name uniqueness within group
- Valid draw configurations (exclusions don't make draw impossible)
- Member active status changes restricted when part of pending draws
- Finalized draw immutability

### 7.12 Migration Management
- All schema changes managed via Alembic
- Version-controlled migrations in `backend/src/gift_genie/infrastructure/database/migrations/`
- Alembic commands: `alembic revision --autogenerate`, `alembic upgrade head`, `alembic downgrade`
- Initial migration includes all tables, enums, indexes, triggers

### 7.13 Performance Considerations
- Expected group sizes: 4-50 members
- Draw algorithm complexity: O(n²) for exclusion checking
- Standard PostgreSQL features adequate for MVP scale
- Comprehensive indexing strategy for common query patterns
- Partial index on active members optimizes draw preparation queries
- Composite index on (group_id, status) optimizes draw filtering

### 7.14 Data Integrity Constraints
Minimal database-level constraints (most validation in domain layer):
- NOT NULL on required fields
- UNIQUE constraints on (draw_id, giver_member_id) - each member gives once per draw
- CHECK constraint preventing self-assignments: giver_member_id != receiver_member_id
- Foreign key constraints with CASCADE deletion
- Case-insensitive email uniqueness via functional indexes

### 7.15 Timestamp Strategy
- `created_at`: All tables (immutable, set on insert)
- `updated_at`: Users and groups (auto-updated via trigger)
- `finalized_at`: Draws (set when status changes to 'finalized')
- `notification_sent_at`: Draws (set when emails sent)
- All timestamps use TIMESTAMPTZ (timezone-aware)

## 8. Sample Queries

### 8.1 Authentication
```sql
-- User login
SELECT id, email, password_hash, name
FROM users
WHERE LOWER(email) = LOWER('user@example.com');
```

### 8.2 Group Management
```sql
-- Get all groups for a user
SELECT id, name, created_at, historical_exclusions_enabled, historical_exclusions_lookback
FROM groups
WHERE admin_user_id = 'user-uuid-here'
ORDER BY created_at DESC;

-- Get group with members
SELECT g.*, COUNT(m.id) as member_count, COUNT(CASE WHEN m.is_active THEN 1 END) as active_member_count
FROM groups g
LEFT JOIN members m ON m.group_id = g.id
WHERE g.id = 'group-uuid-here'
GROUP BY g.id;
```

### 8.3 Member Management
```sql
-- List active members for draw preparation
SELECT id, name, email, is_active
FROM members
WHERE group_id = 'group-uuid-here' AND is_active = true
ORDER BY name;

-- Check email uniqueness within group (case-insensitive)
SELECT id FROM members
WHERE group_id = 'group-uuid-here' AND LOWER(email) = LOWER('member@example.com');
```

### 8.4 Exclusions
```sql
-- Get all exclusions for a group
SELECT e.*,
       mg.name as giver_name,
       mr.name as receiver_name
FROM exclusions e
JOIN members mg ON e.giver_member_id = mg.id
JOIN members mr ON e.receiver_member_id = mr.id
WHERE e.group_id = 'group-uuid-here'
ORDER BY e.exclusion_type, mg.name;

-- Check if exclusion exists (for validation)
SELECT id FROM exclusions
WHERE giver_member_id = 'giver-uuid' AND receiver_member_id = 'receiver-uuid';
```

### 8.5 Draw Operations
```sql
-- Get all draws for a group
SELECT id, status, created_at, finalized_at, notification_sent_at
FROM draws
WHERE group_id = 'group-uuid-here'
ORDER BY created_at DESC;

-- Get pending draws only
SELECT id, created_at
FROM draws
WHERE group_id = 'group-uuid-here' AND status = 'pending'
ORDER BY created_at DESC;

-- Get last N finalized draws (for historical exclusions)
SELECT id, finalized_at
FROM draws
WHERE group_id = 'group-uuid-here' AND status = 'finalized'
ORDER BY finalized_at DESC
LIMIT 3;
```

### 8.6 Assignments
```sql
-- Get all assignments for a draw
SELECT a.*,
       mg.name as giver_name,
       mr.name as receiver_name,
       mg.email as giver_email
FROM assignments a
JOIN members mg ON a.giver_member_id = mg.id
JOIN members mr ON a.receiver_member_id = mr.id
WHERE a.draw_id = 'draw-uuid-here'
ORDER BY mg.name;

-- Get historical pairings (for exclusion calculation)
SELECT d.id as draw_id, d.finalized_at, a.giver_member_id, a.receiver_member_id
FROM draws d
JOIN assignments a ON a.draw_id = d.id
WHERE d.group_id = 'group-uuid-here' AND d.status = 'finalized'
ORDER BY d.finalized_at DESC;
```

### 8.7 Historical Exclusion Calculation
```sql
-- Get pairings from last N draws for a group (used by domain layer)
WITH recent_draws AS (
    SELECT id, finalized_at
    FROM draws
    WHERE group_id = 'group-uuid-here' AND status = 'finalized'
    ORDER BY finalized_at DESC
    LIMIT 1  -- lookback count from groups.historical_exclusions_lookback
)
SELECT a.giver_member_id, a.receiver_member_id, d.finalized_at
FROM assignments a
JOIN recent_draws d ON d.id = a.draw_id
ORDER BY d.finalized_at DESC;
```

## 9. Migration Checklist

### Initial Migration (001_initial_schema.py)
- [ ] Enable uuid-ossp extension: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- [ ] Create ENUM types: draw_status_enum, exclusion_type_enum
- [ ] Create users table with indexes
- [ ] Create groups table with indexes
- [ ] Create members table with indexes and constraints
- [ ] Create exclusions table with indexes
- [ ] Create draws table with indexes
- [ ] Create assignments table with indexes and constraints
- [ ] Create update_updated_at_column() function
- [ ] Create triggers for users.updated_at and groups.updated_at
- [ ] Add all foreign key constraints with CASCADE
- [ ] Verify all indexes created correctly

### Post-Migration Validation
- [ ] Verify all tables exist: `\dt`
- [ ] Verify all indexes exist: `\di`
- [ ] Verify ENUMs created: `\dT`
- [ ] Verify triggers exist: `\dy`
- [ ] Test CASCADE deletion on sample data
- [ ] Test case-insensitive email uniqueness
- [ ] Test updated_at trigger on users and groups
- [ ] Verify CHECK constraint prevents self-assignments
- [ ] Test unique constraint on (draw_id, giver_member_id)

## 10. Future Enhancements (Post-MVP)

### 10.1 Anonymous Mode
- Implement encryption for `encrypted_receiver_id` field
- Add `is_anonymous` boolean to draws table
- Application logic to prevent admin viewing assignments when anonymous

### 10.2 Password Reset
- Add `password_reset_tokens` table with expiration
- Token: UUID, user_id FK, expires_at, used_at (single-use enforcement)

### 10.3 Account Deletion
- Add `deleted_at` soft delete column to users (if retention policy requires)
- Current CASCADE deletion adequate for MVP

### 10.4 Advanced Auditing
- Add `audit_log` table for tracking all draw actions
- Columns: id, entity_type, entity_id, action, user_id, timestamp, metadata (JSONB)

### 10.5 Email Delivery Tracking
- Add `email_logs` table for detailed notification tracking
- Columns: id, draw_id, member_id, email, sent_at, delivered_at, opened_at, status

### 10.6 Row-Level Security (RLS)
- Implement RLS policies if stricter database-level security needed
- Policy: Users can only access their own groups and related data

### 10.7 Performance Optimization
- Add materialized view for group statistics (if querying becomes slow)
- Consider partitioning draws/assignments table (if data volume grows significantly)
- Add database connection pooling configuration (PgBouncer)

### 10.8 Multi-Admin Support
- Add `group_admins` junction table for many-to-many relationship
- Migrate existing groups to have single admin in junction table
