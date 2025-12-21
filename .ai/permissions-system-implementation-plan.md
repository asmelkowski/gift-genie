# Permission System Implementation Plan

## 1. Problem Statement & Objectives

### Current Limitations

The Gift Genie application currently has a simple two-tier role system (ADMIN and USER) with several limitations:

1. **Binary Permission Model**: Users are either administrators with all privileges or regular users with a fixed set of permissions
2. **Scattered Authorization Logic**: Permission checks are embedded throughout use cases without a centralized system
3. **Inflexible**: Cannot grant specific permissions (e.g., allowing specific users to send draw notifications) without making them full admins
4. **No Audit Trail**: No systematic way to track who has which permissions or when they were granted
5. **Poor Scalability**: Adding new permission types requires code changes across multiple layers

### Objectives

Implement a flexible Attribute-Based Access Control (ABAC) permission system that:

1. **Granular Control**: Allow fine-grained permission assignment at the individual permission level
2. **Centralized Management**: Provide a single source of truth for permission checking logic
3. **Admin Interface**: Enable administrators to manage user permissions through a dedicated UI
4. **Extensibility**: Make it easy to add new permission types as features evolve
5. **Audit Support**: Track permission grants/revocations with timestamps and responsible users
6. **Backward Compatibility**: Maintain existing ADMIN role functionality while adding granular permissions
7. **Performance**: Ensure permission checks are efficient and don't degrade application performance

## 2. Technical Approach

### Permission Model

The system will be built around two core entities:

1. **Permission Entity**: Represents a specific permission (e.g., "draws:notify")
2. **User-Permission Association**: Links users to their granted permissions with audit metadata

### Permission Naming Convention

Permissions follow a structured naming pattern:

```
resource:action[:modifier]
```

**Examples:**
- `draws:notify` - Permission to send draw notification emails
- `groups:create` - Permission to create new groups
- `groups:delete` - Permission to delete groups
- `admin:view_dashboard` - Permission to view admin dashboard
- `draws:finalize` - Permission to finalize/lock a draw

**Benefits:**
- Self-documenting permission names
- Easy to understand permission scope
- Consistent pattern for adding new permissions
- Enables hierarchical permission queries if needed later

### Architecture Alignment

The implementation follows Clean Architecture principles:

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation                          │
│  API Endpoints (FastAPI) + Frontend Components (React)       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      Application                             │
│  Use Cases: GrantPermission, RevokePermission,              │
│             CheckPermission, ListUserPermissions             │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                        Domain                                │
│  Entities: Permission, UserPermission                        │
│  Interfaces: PermissionRepositoryInterface                   │
│  Services: AuthorizationService                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Infrastructure                            │
│  Repositories: PostgreSQLPermissionRepository                │
│  Middleware: Permission checking decorators/dependencies     │
└─────────────────────────────────────────────────────────────┘
```

### Trade-offs Analysis

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **RBAC (Role-Based)** | Simple to understand, easy to implement, roles map to organizational structure | Inflexible, role explosion for complex scenarios, hard to handle exceptions | ❌ Too rigid for our needs |
| **ABAC (Attribute-Based)** | Very flexible, granular control, easy to add new permissions, no role explosion | More complex to implement, requires UI for management, potential performance concerns | ✅ **Selected** - Best balance of flexibility and complexity |
| **Policy-Based (e.g., Casbin)** | Extremely powerful, supports complex rules, industry-standard | Steep learning curve, overkill for current needs, external dependency | ❌ Too complex for current scale |

**Decision**: Implement ABAC with the option to layer roles on top later if needed.

## 3. Implementation Phases

### Phase 1: Domain & Core Infrastructure ✅ COMPLETE

**Status: ✅ COMPLETE**  
**Completed: December 2025**

**Summary:**
- `Permission` and `UserPermission` entities created
- `PermissionRepositoryInterface` implemented
- Database schema migration completed
- PostgreSQL repository fully functional
- Tests: 15/15 passing (100%)

**Objective**: Establish the foundational data model and repository interfaces.

**Deliverables:**
1. `Permission` entity (domain/entities/permission.py)
2. `UserPermission` entity (domain/entities/user_permission.py)
3. `PermissionRepositoryInterface` (domain/interfaces/permission_repository_interface.py)
4. Database schema migration
5. PostgreSQL repository implementation

**Key Files:**
- `backend/src/gift_genie/domain/entities/permission.py`
- `backend/src/gift_genie/domain/entities/user_permission.py`
- `backend/src/gift_genie/domain/interfaces/permission_repository_interface.py`
- `backend/src/gift_genie/infrastructure/database/repositories/permission_repository.py`
- `backend/alembic/versions/XXX_add_permissions_system.py`

### Phase 2: Authorization Service & Default Permissions ✅ COMPLETE

**Status: ✅ COMPLETE**  
**Completed: December 2025**

**Summary:**
- `AuthorizationService` with centralized permission checking
- Permission registry with 23 permissions defined
- Permission seeding completed
- User migration for existing users
- Tests: 40/40 passing (100%)
- 8 files created and tested

**Objective**: Create the permission checking logic and default permission registry.

**Deliverables:**
1. `AuthorizationService` (domain/services/authorization_service.py)
2. Permission registry with default sets
3. Permission seeding logic
4. User migration logic (assign default permissions to existing users)

**Key Files:**
- `backend/src/gift_genie/domain/services/authorization_service.py`
- `backend/src/gift_genie/infrastructure/permissions/permission_registry.py`
- `backend/src/gift_genie/infrastructure/database/seeds/permissions_seed.py`

### Phase 3: Use Cases for Permission Management ✅ COMPLETE

**Status: ✅ COMPLETE**  
**Completed: December 2025**

**Summary:**
- 4 DTOs created for permission operations
- 4 Use cases fully implemented
- Tests: 21/21 passing (100%)
- Complete business logic for grant, revoke, and list operations

**Objective**: Implement business logic for managing permissions.

**Deliverables:**
1. `GrantPermissionUseCase`
2. `RevokePermissionUseCase`
3. `ListUserPermissionsUseCase`
4. `ListAvailablePermissionsUseCase`
5. Unit tests for all use cases

**Key Files:**
- `backend/src/gift_genie/application/use_cases/grant_permission_use_case.py`
- `backend/src/gift_genie/application/use_cases/revoke_permission_use_case.py`
- `backend/src/gift_genie/application/use_cases/list_user_permissions_use_case.py`
- `backend/src/gift_genie/application/use_cases/list_available_permissions_use_case.py`
- `backend/tests/test_*_permission_use_case.py`

### Phase 4: Admin API Endpoints ✅ COMPLETE

**Status: ✅ COMPLETE**  
**Completed: December 2025**

**Summary:**
- 4 REST API endpoints implemented
- Tests: 14/14 passing (100%)
- Full OpenAPI/Swagger documentation
- Pydantic request/response models
- Complete admin permission management interface

**Objective**: Expose permission management through REST API.

**Deliverables:**
1. Admin permission management endpoints
2. API documentation (OpenAPI/Swagger)
3. Request/response Pydantic models
4. Integration tests for endpoints

**Key Endpoints:**
- `POST /api/admin/users/{user_id}/permissions` - Grant permission
- `DELETE /api/admin/users/{user_id}/permissions/{permission_id}` - Revoke permission
- `GET /api/admin/users/{user_id}/permissions` - List user permissions
- `GET /api/admin/permissions` - List all available permissions
- `GET /api/admin/users` - List users (for permission management UI)

**Key Files:**
- `backend/src/gift_genie/presentation/api/admin.py`
- `backend/tests/test_admin_permissions_api.py`

### Phase 5: Integrate Permission Checks ⏳ NOT STARTED

**Status: ⏳ NOT STARTED**

**Objective**: Add permission checks to existing use cases.

**Deliverables:**
1. Update use cases to check permissions before execution
2. Add permission checks to ownership-sensitive operations
3. Update existing tests to account for permission checks
4. Integration tests

**Key Use Cases to Update:**
- `FinalizeDrawUseCase` - require `draws:finalize`
- `NotifyDrawParticipantsUseCase` - require `draws:notify`
- `DeleteGroupUseCase` - require `groups:delete` + ownership
- All other resource operations as defined in permission categories

### Phase 6: Frontend Admin UI ⏳ NOT STARTED

**Status: ⏳ NOT STARTED**

**Objective**: Create user interface for permission management.

**Deliverables:**
1. Admin dashboard page
2. User list component with permission management
3. Permission assignment modal/dialog
4. React Query hooks for admin API
5. E2E tests for permission management workflow

**Key Components:**
- `AdminDashboard.tsx` - Main admin page
- `UserList.tsx` - List of users with permission management
- `PermissionManager.tsx` - Permission assignment interface
- `PermissionBadge.tsx` - Visual indicator for permissions

**Key Hooks:**
- `useUsers()` - Fetch user list
- `useUserPermissions(userId)` - Fetch user permissions
- `useGrantPermission()` - Grant permission mutation
- `useRevokePermission()` - Revoke permission mutation
- `useAvailablePermissions()` - Fetch all permissions

**Key Files:**
- `frontend/src/pages/AdminDashboard.tsx`
- `frontend/src/components/admin/UserList.tsx`
- `frontend/src/components/admin/PermissionManager.tsx`
- `frontend/src/hooks/admin/useUsers.ts`
- `frontend/src/hooks/admin/useUserPermissions.ts`
- `frontend/src/hooks/admin/useGrantPermission.ts`
- `frontend/src/hooks/admin/useRevokePermission.ts`
- `frontend/e2e/admin/permission-management.spec.ts`

### Phase 7: Testing & Documentation ⏳ NOT STARTED

**Status: ⏳ NOT STARTED**

**Objective**: Comprehensive testing and documentation.

**Deliverables:**
1. Complete unit test coverage (>90%)
2. Integration tests for all permission flows
3. E2E tests for admin UI
4. Migration testing (existing users get correct permissions)
5. Performance testing (permission check latency)
6. API documentation updates
7. Developer documentation (how to add new permissions)
8. User documentation (how to use admin interface)

## 4. Detailed Design Decisions

### Permission Checking Strategy

The system uses a layered approach to permission checking:

```python
def check_permission(user: User, permission_code: str, resource_id: int | None = None) -> bool:
    """
    Check if user has permission.
    
    Layered approach:
    1. Admin bypass: ADMIN role has all permissions
    2. Permission check: Check user_permissions table
    3. Ownership check: If resource_id provided, verify ownership
    """
    # Layer 1: Admin bypass
    if user.role == UserRole.ADMIN:
        return True
    
    # Layer 2: Permission check
    has_permission = permission_repository.user_has_permission(
        user_id=user.id,
        permission_code=permission_code
    )
    
    if not has_permission:
        return False
    
    # Layer 3: Ownership check (if applicable)
    if resource_id is not None:
        return check_ownership(user.id, resource_id)
    
    return True
```

**Benefits:**
- Admin users maintain unrestricted access (backward compatible)
- Regular users subject to granular permission checks
- Optional ownership validation for resource-specific permissions
- Single function handles all permission logic

### Database Schema

```sql
-- Permissions table: stores all available permissions
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "draws:notify"
    name VARCHAR(255) NOT NULL,          -- e.g., "Send Draw Notifications"
    description TEXT,                    -- Human-readable description
    category VARCHAR(50) NOT NULL,       -- e.g., "draws", "groups", "admin"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User permissions table: tracks which users have which permissions
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,  -- Optional notes about why permission was granted
    UNIQUE(user_id, permission_id)  -- Prevent duplicate grants
);

-- Indexes for performance
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category);
```

**Design Decisions:**
1. **Separate permissions table**: Allows permission metadata (name, description, category)
2. **Many-to-many relationship**: Users can have multiple permissions, permissions can belong to multiple users
3. **Audit fields**: Track who granted permissions and when
4. **Cascade deletes**: Cleanup when users or permissions are deleted
5. **Unique constraint**: Prevent duplicate permission grants
6. **Strategic indexes**: Optimize common queries (user permission checks, permission listings)

### Ownership-Based Permissions

Some permissions require both permission check AND ownership verification:

```python
async def delete_group_use_case(
    group_id: int,
    requesting_user: User,
    authorization_service: AuthorizationService,
    group_repository: GroupRepositoryInterface
) -> None:
    """Delete a group (requires permission + ownership)."""
    
    # Check permission
    if not await authorization_service.check_permission(
        user=requesting_user,
        permission_code="groups:delete"
    ):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: groups:delete required"
        )
    
    # Load group
    group = await group_repository.get_by_id(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check ownership (unless admin)
    if requesting_user.role != UserRole.ADMIN:
        if group.owner_id != requesting_user.id:
            raise HTTPException(
                status_code=403,
                detail="Permission denied: you don't own this group"
            )
    
    # Perform deletion
    await group_repository.delete(group_id)
```

**Permissions requiring ownership:**
- `groups:update` - Update group details
- `groups:delete` - Delete group
- `members:create` - Add members to group (must own group)
- `members:update` - Update member details
- `members:delete` - Remove members
- `draws:create` - Create draw for group
- `draws:finalize` - Finalize draw
- `draws:notify` - Send notifications
- `exclusions:create` - Create exclusions
- `exclusions:delete` - Delete exclusions

**Permissions NOT requiring ownership:**
- `groups:create` - Create new groups (user becomes owner)
- `groups:read` - View own groups (filtered by ownership)
- `admin:*` - Admin permissions (global scope)

### Admin Bypass Logic

The `UserRole.ADMIN` role provides automatic access to all permissions:

```python
class AuthorizationService:
    async def check_permission(
        self,
        user: User,
        permission_code: str
    ) -> bool:
        """Check if user has permission."""
        # Admin bypass: admins have all permissions
        if user.role == UserRole.ADMIN:
            return True
        
        # Regular permission check
        return await self.permission_repository.user_has_permission(
            user_id=user.id,
            permission_code=permission_code
        )
    
    async def list_user_permissions(self, user: User) -> list[Permission]:
        """List all permissions for user."""
        # Admin bypass: return all permissions
        if user.role == UserRole.ADMIN:
            return await self.permission_repository.get_all_permissions()
        
        # Regular user: return granted permissions
        return await self.permission_repository.get_user_permissions(user.id)
```

**Benefits:**
- Backward compatible with existing admin functionality
- No need to grant individual permissions to admins
- Simplified permission management (admins don't clutter user_permissions table)
- Clear separation between admin role and granular permissions

## 5. Permission Categories & Examples

### Groups

- `groups:create` - Create new groups (user becomes owner)
- `groups:read` - View groups (implicitly owned groups)
- `groups:update` - Modify group details (name, description)
- `groups:delete` - Delete groups permanently

### Members

- `members:create` - Add members to groups
- `members:read` - View group members
- `members:update` - Modify member information
- `members:delete` - Remove members from groups

### Draws

- `draws:create` - Create new draws for groups
- `draws:read` - View draw information
- `draws:finalize` - Lock/finalize draws (prevent further changes)
- `draws:notify` - Send email notifications to participants
- `draws:view_assignments` - View draw assignments (implicitly own assignments)

### Exclusions

- `exclusions:create` - Create gift exclusion rules
- `exclusions:read` - View exclusion rules
- `exclusions:delete` - Remove exclusion rules

### Admin

- `admin:view_dashboard` - Access admin dashboard
- `admin:manage_users` - View and manage user accounts
- `admin:manage_permissions` - Grant/revoke user permissions
- `admin:view_analytics` - View system analytics (future)

## 6. Default Permission Sets

### ADMIN_PERMISSIONS

All permissions (granted via role, not explicit grants):

```python
ADMIN_PERMISSIONS = [
    # All permissions automatically granted via UserRole.ADMIN
    # No need to explicitly store these in user_permissions table
]
```

### USER_BASIC_PERMISSIONS

Default permissions for regular users (current functionality):

```python
USER_BASIC_PERMISSIONS = [
    # Groups
    "groups:create",
    "groups:read",
    "groups:update",
    "groups:delete",
    
    # Members
    "members:create",
    "members:read",
    "members:update",
    "members:delete",
    
    # Draws
    "draws:create",
    "draws:read",
    "draws:finalize",
    "draws:view_assignments",
    # NOTE: "draws:notify" is NOT included by default
    # Must be explicitly granted by admin
    
    # Exclusions
    "exclusions:create",
    "exclusions:read",
    "exclusions:delete",
]
```

**Rationale:**
- Default permissions match current functionality for non-admin users
- `draws:notify` is excluded to prevent spam/abuse (must be explicitly granted)
- Admins don't need explicit grants (bypass via role check)

## 7. Risk Assessment & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Breaking existing functionality** | High | Medium | Comprehensive test coverage, backward compatibility for ADMIN role, phased rollout, feature flags |
| **Performance degradation** | Medium | Low | Strategic database indexes, caching user permissions in memory/Redis, benchmark permission checks |
| **Complexity for developers** | Medium | Medium | Clear documentation, helper functions/decorators, code examples, training session |
| **Migration issues** | High | Low | Thorough migration testing, rollback plan, backup before migration, dry-run in staging |
| **Configuration errors** | Medium | Medium | Seed script validation, admin UI validation, permission audit logging |
| **Security vulnerabilities** | High | Low | Security review of permission checking logic, penetration testing, principle of least privilege |
| **User confusion** | Low | Medium | Clear UI labels, help text, admin training documentation |
| **Permission creep** | Low | High | Regular permission audits, expiration dates (future), least privilege principle |

## 8. Testing Strategy

### Unit Tests

**Domain Layer:**
- `Permission` entity validation
- `UserPermission` entity validation
- `AuthorizationService` logic (admin bypass, permission checks)

**Infrastructure Layer:**
- `PermissionRepository` CRUD operations
- Database queries and indexes
- Permission seeding logic

**Application Layer:**
- `GrantPermissionUseCase` - success, duplicate, invalid permission
- `RevokePermissionUseCase` - success, not granted, invalid permission
- `ListUserPermissionsUseCase` - admin vs regular user
- `ListAvailablePermissionsUseCase` - filtering, sorting

**Target Coverage:** >90% for permission-related code

### Integration Tests

**Permission Checking:**
- Admin bypass works correctly
- Regular users require explicit permissions
- Ownership validation works correctly
- Permission denied raises appropriate errors

**Use Case Integration:**
- `FinalizeDrawUseCase` requires `draws:finalize`
- `NotifyDrawParticipantsUseCase` requires `draws:notify`
- `DeleteGroupUseCase` requires `groups:delete` + ownership
- All CRUD operations respect permissions

**Database Integration:**
- Permission grants persist correctly
- Cascade deletes work (user/permission deletion)
- Unique constraints prevent duplicates
- Indexes improve query performance

### E2E Tests (Playwright)

**Admin UI Workflows:**
1. Admin logs in → navigates to admin dashboard → sees user list
2. Admin selects user → views current permissions → grants new permission
3. Admin selects user → revokes permission → confirms removal
4. Admin attempts to grant duplicate permission → sees error message
5. Regular user attempts to access admin dashboard → denied

**Permission Enforcement:**
1. User without `draws:notify` tries to send notifications → denied
2. User with `draws:notify` sends notifications → succeeds
3. Admin user performs any action → always succeeds
4. User tries to delete another user's group → denied (ownership check)

### Migration Testing

**Existing User Scenarios:**
1. Existing ADMIN users maintain all permissions (via role bypass)
2. Existing USER users receive default permissions (via migration script)
3. No users lose existing functionality after migration
4. Permission table populated with all defined permissions
5. User permissions table populated correctly for existing users

### Performance Testing

**Benchmarks:**
- Single permission check: <10ms (database query)
- Permission check with caching: <1ms (memory lookup)
- Load 100 user permissions: <50ms
- Admin permission grant: <20ms (insert + audit log)
- Page load with permission checks: <100ms overhead

**Load Testing:**
- 1000 concurrent permission checks
- Admin UI managing 10,000 users
- Permission query performance with large datasets

## 9. Rollout Approach

### Deployment Steps

1. **Phase 1: Database Migration**
   ```bash
   # Run migration to create permissions tables
   cd backend
   make migrate-up
   
   # Verify schema
   make db-shell
   \d permissions
   \d user_permissions
   ```

2. **Phase 2: Seed Permissions**
   ```bash
   # Populate permissions table with all defined permissions
   python -m src.gift_genie.infrastructure.database.seeds.permissions_seed
   
   # Verify permissions created
   make db-shell
   SELECT * FROM permissions ORDER BY category, code;
   ```

3. **Phase 3: User Migration**
   ```bash
   # Grant default permissions to existing non-admin users
   python -m src.gift_genie.infrastructure.database.seeds.user_permissions_migration
   
   # Verify user permissions
   SELECT u.email, u.role, p.code
   FROM users u
   LEFT JOIN user_permissions up ON u.id = up.user_id
   LEFT JOIN permissions p ON up.permission_id = p.id
   WHERE u.role = 'USER'
   ORDER BY u.email, p.code;
   ```

4. **Phase 4: Deploy Backend**
   ```bash
   # Deploy with permission checking enabled
   make docker-build
   make docker-push
   # Update production deployment
   ```

5. **Phase 5: Deploy Frontend**
   ```bash
   # Deploy admin UI
   cd frontend
   make docker-build
   make docker-push
   # Update production deployment
   ```

6. **Phase 6: Verification**
   - Test admin login → access admin dashboard
   - Test regular user → verify default permissions work
   - Test permission grant/revoke in admin UI
   - Test `draws:notify` permission enforcement
   - Monitor error logs for permission denials

### Rollback Plan

**If critical issues arise:**

1. **Immediate: Disable Permission Checks**
   ```python
   # Feature flag to disable permission checks
   PERMISSIONS_ENABLED = False  # Set via environment variable
   
   # In AuthorizationService
   if not PERMISSIONS_ENABLED:
       return True  # Bypass all checks
   ```

2. **Database Rollback**
   ```bash
   # Rollback migration
   cd backend
   make migrate-down
   
   # Verify tables removed
   make db-shell
   \dt permissions*
   ```

3. **Code Rollback**
   ```bash
   # Revert to previous deployment
   git revert <permission-feature-commit>
   make docker-build
   make docker-push
   ```

4. **Restore Backup** (last resort)
   ```bash
   # Restore database from backup taken before migration
   # Redeploy previous version
   ```

**Rollback Criteria:**
- Critical functionality broken for >50% of users
- Database performance degradation >500ms per query
- Security vulnerability discovered in permission logic
- Data corruption in permissions tables

## 10. Success Criteria

### Functional Requirements

- ✅ Admins can grant/revoke permissions via UI
- ✅ Users with `draws:notify` can send notifications
- ✅ Users without `draws:notify` cannot send notifications
- ✅ Admin users bypass all permission checks (backward compatible)
- ✅ Regular users maintain existing functionality with default permissions
- ✅ Permission checks enforce ownership for resource-specific operations
- ✅ All permission operations logged with audit trail
- ✅ API returns clear error messages for permission denials

### Non-Functional Requirements

- ✅ Permission check latency: <10ms (database), <1ms (cached)
- ✅ Test coverage: >90% for permission-related code
- ✅ Zero downtime deployment
- ✅ No data loss during migration
- ✅ Admin UI loads in <2 seconds
- ✅ Mobile-responsive admin interface
- ✅ Documentation complete (API, developer, user guides)

### User Experience

- ✅ Admins can find and use permission management UI intuitively
- ✅ Permission denied errors are clear and actionable
- ✅ Permission grants/revocations take effect immediately
- ✅ UI indicates current permissions clearly (badges, icons)
- ✅ No workflow disruption for existing users

## 11. Estimated Complexity & Timeline

### Phase-by-Phase Breakdown

| Phase | Description | Estimated Hours | Dependencies |
|-------|-------------|----------------|--------------|
| **Phase 1** | Domain & Core Infrastructure | 4-6h | None |
| **Phase 2** | Authorization Service & Defaults | 3-4h | Phase 1 |
| **Phase 3** | Use Cases for Permission Mgmt | 3-4h | Phase 2 |
| **Phase 4** | Integrate Permission Checks | 4-6h | Phase 3 |
| **Phase 5** | Admin API Endpoints | 2-3h | Phase 4 |
| **Phase 6** | Frontend Admin UI | 5-8h | Phase 5 |
| **Phase 7** | Testing & Documentation | 4-5h | All phases |
| **Total** | | **25-36 hours** | |

### Detailed Breakdown

**Phase 1: Domain & Core Infrastructure (4-6h)**
- Domain entities: 1h
- Repository interface: 0.5h
- Database migration: 1h
- PostgreSQL repository: 1.5-2h
- Basic unit tests: 1-1.5h

**Phase 2: Authorization Service & Defaults (3-4h)**
- AuthorizationService: 1.5h
- Permission registry: 0.5h
- Seed scripts: 1h
- Migration script: 0.5-1h
- Tests: 0.5h

**Phase 3: Use Cases for Permission Mgmt (3-4h)**
- GrantPermissionUseCase: 0.75h
- RevokePermissionUseCase: 0.75h
- ListUserPermissionsUseCase: 0.5h
- ListAvailablePermissionsUseCase: 0.5h
- Unit tests: 1-1.5h

**Phase 4: Integrate Permission Checks (4-6h)**
- Update 5-10 use cases: 2-3h
- Update tests: 1.5-2h
- Integration tests: 0.5-1h

**Phase 5: Admin API Endpoints (2-3h)**
- API endpoints: 1-1.5h
- Pydantic models: 0.5h
- Integration tests: 0.5-1h

**Phase 6: Frontend Admin UI (5-8h)**
- Admin dashboard page: 1.5-2h
- User list component: 1-1.5h
- Permission manager component: 1.5-2h
- React Query hooks: 0.5-1h
- E2E tests: 1-1.5h
- Styling/polish: 0.5-1h

**Phase 7: Testing & Documentation (4-5h)**
- Additional test coverage: 1.5-2h
- Performance testing: 0.5-1h
- API documentation: 0.5h
- Developer documentation: 1h
- User documentation: 0.5-1h

### Risk Buffer

- **Optimistic**: 25 hours (assumes smooth implementation, no major blockers)
- **Realistic**: 30 hours (includes minor refactoring, bug fixes)
- **Pessimistic**: 36 hours (includes unexpected issues, scope creep)

**Recommendation**: Plan for 30-32 hours (4-5 work days for single developer)

## 12. Future Enhancements

### Short-term (Next 3-6 months)

1. **Permission Caching**
   - Cache user permissions in Redis
   - Invalidate cache on permission changes
   - Target: <1ms permission check latency

2. **Permission Groups/Roles**
   - Layer RBAC on top of ABAC
   - Define role templates (e.g., "Group Manager", "Draw Coordinator")
   - Bulk grant permissions via role assignment

3. **Permission Expiration**
   - Add `expires_at` to user_permissions table
   - Automatic revocation via background job
   - UI for temporary permission grants

4. **Audit Dashboard**
   - Visualize permission grants/revocations over time
   - Track who granted which permissions
   - Alert on suspicious permission changes

### Long-term (6-12 months)

1. **Resource-Level Permissions**
   - Fine-grained permissions per group (e.g., "can edit group:123")
   - Permission templates per resource type
   - Inheritance from parent resources

2. **Permission Approval Workflow**
   - Users request permissions
   - Admins approve/deny via UI
   - Email notifications for requests

3. **Advanced Authorization Rules**
   - Context-based permissions (time, location, IP)
   - Conditional permissions (if-then rules)
   - Integration with external identity providers (OAuth)

4. **Self-Service Permission Management**
   - Group owners can grant permissions within their groups
   - Delegated administration
   - Permission request system

## 13. References & Resources

### Internal Documentation
- `.ai/rules/architecture.md` - Clean Architecture guidelines
- `.ai/rules/database.md` - Database schema patterns
- `.ai/rules/fastapi.md` - API endpoint conventions
- `.ai/rules/frontend-react.md` - React component patterns

### External Resources
- [NIST ABAC Guide](https://csrc.nist.gov/projects/attribute-based-access-control) - ABAC principles
- [OWASP Access Control](https://owasp.org/www-community/Access_Control) - Security best practices
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - Future enhancement option
- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/) - Dependency injection patterns

### Similar Implementations
- Django Guardian (object-level permissions)
- Flask-Principal (identity and permission management)
- Casbin (policy-based access control)

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-16  
**Author**: Gift Genie Development Team  
**Status**: Planning - Ready for Implementation
