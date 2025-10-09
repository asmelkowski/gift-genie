# Database Planning Questions and Recommendations

## Round 1: Initial Schema Analysis

<questions>

1. **Should the `users` table include columns for `created_at` and `updated_at` timestamps?**

   Recommendation: Yes, these audit fields are standard practice and help track account lifecycle. Include `created_at` (NOT NULL, default NOW()) and `updated_at` (NOT NULL, default NOW(), with trigger to auto-update).

2. **Should the `groups` table track both `created_at` and `updated_at` timestamps?**

   Recommendation: Yes, tracking when groups are created and last modified is valuable for analytics and debugging. Both should be NOT NULL with NOW() defaults.

3. **Should the `members` table enforce unique email addresses globally across all groups, or only within each group?**

   Recommendation: Email uniqueness should be scoped per group only (unique constraint on `(group_id, email)` where email is not null). This allows the same person to participate in multiple groups with the same email address.

4. **Should the `members` table include a `created_at` timestamp?**

   Recommendation: Yes, to track when members were added to groups, which helps with historical analysis.

5. **For the `exclusions` table, should one-way exclusions be stored as a single row, or should two-way exclusions be stored as two separate rows?**

   Recommendation: Store each exclusion direction as a separate row. Use a `is_mutual` boolean flag to indicate if it's part of a two-way exclusion. This simplifies queries and ensures consistency when creating mutual exclusions.

6. **Should the `exclusions` table include `created_at` and `created_by_user_id` columns for audit purposes?**

   Recommendation: Yes, tracking when exclusions were created and by whom helps with debugging and understanding group history.

7. **For the `draws` table, should there be an explicit `status` enum column with values `pending` and `finalized`?**

   Recommendation: Yes, use a PostgreSQL ENUM type for `draw_status` with values ('pending', 'finalized'). This makes the lifecycle explicit and enables database-level constraints.

8. **Should the `draws` table include both `created_at` and `finalized_at` timestamps?**

   Recommendation: Yes. `created_at` tracks when the draw was created, `finalized_at` (nullable) tracks when it was finalized. This supports the lifecycle and helps calculate how long draws remain pending.

9. **Should the `assignments` table be designed to support the POST-MVP anonymous mode feature where even admins cannot see results?**

   Recommendation: Yes, add an optional `encrypted_receiver_id` column (text/bytea) that can store encrypted assignment data for anonymous mode. For MVP, this field can be NULL and `receiver_member_id` is used directly.

10. **Should there be a database-level foreign key constraint preventing deletion of finalized draws?**

    Recommendation: Yes, use a CHECK constraint on a `deleted_at` column combined with `status` to ensure `deleted_at IS NULL` when `status = 'finalized'`. However, for true immutability, consider not having a `deleted_at` column at all and handling deletion only at the application layer for pending draws.

11. **Should the `assignments` table include a unique constraint to prevent duplicate giver-receiver pairs within the same draw?**

    Recommendation: Yes, add a unique constraint on `(draw_id, giver_member_id)` to ensure each member gives to exactly one person per draw.

12. **Should indexes be created on foreign key columns for performance?**

    Recommendation: Yes, create indexes on all foreign key columns: `groups.admin_user_id`, `members.group_id`, `exclusions.group_id`, `exclusions.giver_member_id`, `exclusions.receiver_member_id`, `draws.group_id`, `assignments.draw_id`, `assignments.giver_member_id`, `assignments.receiver_member_id`.

13. **Should there be a composite index on `draws` table for common queries filtering by group and status?**

    Recommendation: Yes, create a composite index on `(group_id, status)` to optimize queries fetching all pending or finalized draws for a specific group.

14. **Should the `members` table `status` field be an ENUM or a boolean `is_active`?**

    Recommendation: Use a boolean `is_active` (NOT NULL, default true) for simplicity in MVP. If more statuses are anticipated post-MVP, consider an ENUM.

15. **Should row-level security (RLS) policies be implemented to ensure users can only access their own groups and related data?**

    Recommendation: Yes, RLS is strongly recommended given the security requirements. Enable RLS on all tables and create policies that enforce: users can only access groups they admin, and can only access members/exclusions/draws/assignments for their own groups.

16. **For RLS implementation, should there be a helper function to check if a user owns a group?**

    Recommendation: Yes, create a PostgreSQL function `user_owns_group(user_id UUID, group_id UUID)` that checks if the user is the admin of the specified group. This function can be reused across multiple RLS policies.

17. **Should the `draws` table include a `notification_sent_at` timestamp to track when emails were sent?**

    Recommendation: Yes, add `notification_sent_at` (nullable timestamp) to track when finalization notifications were sent. This helps with debugging email delivery issues and prevents duplicate sends.

18. **Should there be a separate `notifications` or `email_log` table to track all notification attempts?**

    Recommendation: For MVP, the `notification_sent_at` field on `draws` is sufficient. Post-MVP, consider a dedicated table for detailed email logging including failures and retries.

19. **Should the `users` table password field have a minimum length enforced at the database level?**

    Recommendation: No, password validation (including minimum length and complexity) should be handled at the application layer before hashing. The database should store the hashed password (typically 60+ characters for bcrypt) as TEXT or VARCHAR(255).

20. **Should there be a `sessions` table for JWT token management or should stateless JWT be used?**

    Recommendation: For MVP, use stateless JWT tokens stored in httpOnly cookies. Post-MVP, if "remember me" or token revocation is needed, add a `sessions` table with token tracking.

21. **Should the database include a `draw_execution_log` or audit table to track draw attempts and failures?**

    Recommendation: For MVP, application logging is sufficient. Post-MVP, consider an audit table for compliance and debugging complex draw failures.

22. **Should the `exclusions` table differentiate between manual exclusions and historical (automatic) exclusions?**

    Recommendation: Yes, add an `exclusion_type` ENUM with values ('manual', 'historical'). This allows historical exclusions to be managed separately and makes it easier to enable/disable them per group settings.

23. **Should there be a `group_settings` table for configuration like historical exclusion rules, or should these be columns on the `groups` table?**

    Recommendation: For MVP with limited settings, add columns directly to `groups` table: `historical_exclusions_enabled` (boolean, default true), `historical_exclusions_lookback` (integer, default 1). Post-MVP, if settings grow complex, consider a separate JSONB column or settings table.

24. **Should the `members.email` column be case-insensitive for uniqueness checks?**

    Recommendation: Yes, use a unique partial index with LOWER(email) to ensure case-insensitive uniqueness within a group: `CREATE UNIQUE INDEX ON members(group_id, LOWER(email)) WHERE email IS NOT NULL`.

25. **Should the `users.email` column be case-insensitive for uniqueness and login?**

    Recommendation: Yes, use a unique index with LOWER(email) on the `users` table and always compare emails case-insensitively in queries.

26. **Should CASCADE deletes be used when a user deletes their account to remove all associated groups, members, etc.?**

    Recommendation: Yes, use `ON DELETE CASCADE` from `users` → `groups` → `members`, `exclusions`, `draws` → `assignments`. However, for POST-MVP account deletion feature, consider soft deletes instead to preserve historical data.

27. **Should soft deletes be implemented for any entities (using `deleted_at` column)?**

    Recommendation: For MVP, only `draws` may need a `deleted_at` column if you want to track deleted pending draws for audit purposes. Otherwise, hard deletes are acceptable for MVP simplicity.

28. **Should the primary keys use UUID or auto-incrementing integers?**

    Recommendation: Use UUID (uuid_generate_v4()) for all primary keys. This provides better security (non-guessable IDs), supports distributed systems, and prevents enumeration attacks on API endpoints.

29. **Should there be a constraint ensuring minimum 3 members per group before allowing a draw?**

    Recommendation: No, this business rule should be enforced at the application layer, not the database. Database constraints should focus on data integrity, not business logic.

30. **Should the `assignments` table include a `viewed_at` timestamp to track when members view their assignments?**

    Recommendation: For MVP where members receive assignments via email only, this is not needed. Post-MVP, if a member portal is added, this field would be useful.

31. **Should there be database-level constraints to prevent self-assignments (giver_member_id != receiver_member_id)?**

    Recommendation: Yes, add a CHECK constraint on `assignments` table: `CHECK (giver_member_id != receiver_member_id)`.

32. **Should the database support multiple admins per group?**

    Recommendation: No, based on PRD, only the creator is the admin. The `groups.admin_user_id` should be a single foreign key. Post-MVP, if multiple admins are needed, create a `group_admins` junction table.

33. **Should there be an index on `members.is_active` to optimize queries filtering active members?**

    Recommendation: Yes, create a partial index `CREATE INDEX ON members(group_id) WHERE is_active = true` to optimize queries fetching only active members for a group.

34. **Should the `assignments` table have a `created_at` timestamp?**

    Recommendation: Yes, although assignments are created when the draw is created, having `created_at` on assignments provides record-level timestamp granularity for debugging.

35. **For historical exclusions, should there be a view or helper function to calculate which pairings should be excluded based on lookback settings?**

    Recommendation: Yes, create a database function or view that returns historical exclusions based on group settings. For example: `get_historical_exclusions(group_id UUID, lookback_count INTEGER)` returns pairs that should be excluded.

36. **Should there be a materialized view for draw history and statistics per group?**

    Recommendation: Not for MVP. Given the expected group sizes (4-50 members) and draw frequency, regular queries will perform adequately. Post-MVP, consider if performance monitoring indicates a need.

37. **Should the database enforce that finalized draws cannot have their status changed back to pending?**

    Recommendation: Yes, use a CHECK constraint or trigger to prevent status transitions from 'finalized' to 'pending'. Example: Create a trigger that raises an exception if UPDATE attempts to change status from 'finalized' to any other value.

38. **Should there be a unique constraint preventing multiple pending draws for the same group?**

    Recommendation: No, based on PRD there's no restriction on multiple pending draws. Admin may want to prepare multiple scenarios before finalizing one and deleting others.

39. **Should notification failures be tracked at the database level?**

    Recommendation: For MVP, no. Log failures at the application level. Post-MVP, add a `notification_status` enum field or separate logging table if email delivery tracking becomes critical.

40. **Should there be database-level validation that all members in a draw's assignments belong to the same group as the draw?**

    Recommendation: Yes, this can be enforced through foreign key constraints. Ensure `assignments.draw_id` → `draws`, and both `assignments.giver_member_id` and `assignments.receiver_member_id` → `members`, with all members ultimately belonging to the same group via the draw's group_id.

</questions>
