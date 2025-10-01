# Product Requirements Document: Gift Genie

## 1. Executive Summary

Gift Genie is a web application that facilitates organized gift exchanges within groups. It allows users to create groups, add members, set exclusion rules (who cannot give gifts to whom), and automatically generate fair gift assignments through a randomized draw system.

## 2. Product Overview

### 2.1 Vision
To simplify and automate the gift exchange process for families, friends, and organizations while respecting relationship constraints and preferences.

### 2.2 Target Audience

**Primary Users (App Admins):**
- Family organizers coordinating holiday gift exchanges
- Friend group coordinators planning Secret Santa events
- Office event planners coordinating gift swaps
- Anyone wanting to organize a fair gift exchange with custom rules

**Secondary Users (Group Members):**
- Participants in gift exchanges who receive assignment links
- Do not need to register or have app accounts

## 3. Core Features

### 3.0 User vs. Member Model

The application distinguishes between two separate entities:

- **App Users**: Registered users who can create and manage groups (admins)
- **Group Members**: Lightweight entities within a group who participate in draws
  - Members do not need to be app users
  - Members only need a unique name within their group
  - Optional email address for receiving notifications
  - If an admin wants to participate in a draw, they must add themselves as a member

This separation allows for:
- Simple group creation without requiring all participants to register
- Easy management of groups where some participants may not have app accounts
- Flexibility in managing members across multiple years

### 3.1 Group Management

#### 3.1.1 Create Group
- Users can create a new gift exchange group
- Required information:
  - Group name
- User who creates the group becomes the admin

#### 3.1.2 Group Settings
- Edit group details
- Configure notification preferences
- Configure historical exclusion rules:
  - Enable/disable historical exclusions (default: enabled)
  - Set lookback count for preventing repeat pairings (default: 1 draw)
- Set draw result visibility (normal or anonymous mode) **[POST-MVP]**
- View all draw results and history
- Delete pending draws (finalized draws cannot be deleted)
- Delete group (admin only)

### 3.2 Member Management

#### 3.2.1 Add Members
- Members are lightweight entities separate from app users
- Admin must explicitly add themselves as a member to participate in the draw
- Required information per member:
  - Name (must be unique within the group)
  - Email address (optional, for notifications)

#### 3.2.3 Member Status
- Active/Inactive status for excluding members from current year without deletion

### 3.3 Exclusion Rules

#### 3.3.1 Default Behavior
- By default, any member can be assigned to give a gift to any other member
- Members cannot be assigned to themselves

#### 3.3.2 Setting Exclusions
- Admin can define who cannot give gifts to whom
- Exclusion types:
  - **One-way exclusion**: Person A cannot give to Person B (but B can give to A)
  - **Two-way exclusion**: A and B cannot give to each other (mutual exclusion)
- Common use cases:
  - Spouses/partners cannot exchange with each other
  - Parent-child exclusions
  - Previous year pairings

#### 3.3.3 Exclusion Management
- Visual interface to set/remove exclusions
- Validation to ensure draw is mathematically possible

#### 3.3.4 Historical Exclusions
- System automatically tracks previous draw results for each group
- Historical exclusions are configurable per group (enabled by default)
- When enabled, admin can configure automatic exclusions based on history:
  - Prevent same giver-receiver pairing for N consecutive draws (default: 1 draw)
  - Lookback count is configurable
- Historical data persists across all finalized draws
- Admin can disable historical exclusions if needed for specific groups
- View history of who gave to whom in previous draws

### 3.4 Draw System

#### 3.4.1 Draw Lifecycle
- **States**: Pending → Finalized
- **Pending draws**: Can be edited or hard deleted without consequences
- **Finalized draws**: Completely immutable - cannot be altered or deleted
- If changes are needed after finalization, admin must create a new draw
- Creating a new draw will send fresh assignment notifications to all members
- All finalized draws are used for historical exclusion rules

#### 3.4.2 Draw Execution
- Algorithm validates that a valid assignment is possible given all exclusions
- Random assignment generation
- Multiple attempts if needed to find valid configuration
- Error handling if no valid draw is possible

#### 3.4.3 Draw Constraints
- Each person gives to exactly one person
- Each person receives from exactly one person
- No self-assignments
- All exclusion rules must be respected

#### 3.4.4 Draw Results
- Admin can view all assignments
- Admin can configure result visibility per draw **[POST-MVP]**:
  - **Normal mode**: Admin can view all assignments (MVP default)
  - **Anonymous mode**: Even admin cannot see full results (increased privacy)
- Finalized draws are immutable (cannot be altered or deleted)
- If changes are needed, admin creates a new draw instead
- No limit on number of draws an admin can create for a group
- Multiple finalized draws can coexist (e.g., for different years or scenarios)

### 3.5 Notifications

#### 3.5.1 Email Notifications
- Draw completion notification with assignment details (sent when draw is finalized)
- Each new finalized draw triggers a new set of notifications
- Email contains the actual assignment (who the member should give a gift to)
- Members with no email address cannot receive notifications

### 3.6 Result Viewing


#### 3.6.1 Admin View
- Full draw results viewable in the app
- Member participation tracking
- View all draws (pending and finalized) for a group
- Delete pending draws only (finalized draws cannot be deleted)
- Track draw history with creation and finalization timestamps
- Each draw is independent with no concept of "current" or "active" period
- Anonymous mode indicator for draws where results are hidden **[POST-MVP]**

### 3.7 Authentication & User Management

#### 3.7.1 User Registration
- Users can register with:
  - Email address (required, must be unique)
  - Password (required)
  - Name (required)
- No email verification required for MVP

#### 3.7.2 User Login
- Email and password authentication
- Session management with secure tokens
- "Remember me" option for persistent sessions **[POST-MVP]**

#### 3.7.3 Password Management
- Forgot password flow with email reset link **[POST-MVP]**
- Change password option in user settings

#### 3.7.4 User Profile
- View and edit basic profile information (name, email)
- Logout functionality
- Delete account option (with confirmation - deletes all associated groups) **[POST-MVP]**

#### 3.7.5 Access Control
- All group management features require authentication
- Only group admins can view assignments for their groups
- Group members receive assignments only via email notification

## 4. User Flows

### 4.1 Primary User Flow
1. User registers for an account and logs in
2. User creates a new group
3. User adds members to the group
4. User sets exclusion rules (optional)
5. User initiates the draw
6. System validates and generates assignments
7. Members are notified of their assignments via email (if email provided)
8. Admin can view all assignments in the app

### 4.2 Alternative Flows
- **Late member additions**: If a member needs to be added after draw is finalized:
  1. Admin adds the new member to the group
  2. Admin creates a new draw with all members
  3. New assignment notifications are sent to all members
  4. Previous finalized draw remains in history for reference
- **Pending draw deletion**: Admin can delete pending (not yet finalized) draws at any time
- **Multiple draws**: Admin can create multiple draws for the same group (useful for different years, testing scenarios, or when membership changes)

## 5. Technical Requirements

### 5.1 Algorithm Requirements
- Must handle circular assignment graphs
- Must validate exclusion rules don't make draw impossible
- Must incorporate historical assignment data as automatic exclusions
- Should use efficient backtracking or constraint satisfaction approach
- Should be deterministic with seed for testing
- Should gracefully handle cases where historical exclusions make draw impossible

### 5.2 Security Requirements
- Secure authentication for all app access
- Password hashing (bcrypt or similar)
- Encrypted storage of assignments
- Session token security (httpOnly cookies, CSRF protection)
- Rate limiting on draw generation and authentication endpoints
- Anonymous mode: Ensures assignments are never stored in a way that allows admin to view full results **[POST-MVP]**
- Tamper-proof finalized draws (immutability enforcement)
- Password reset token expiration and single-use enforcement **[POST-MVP]**

### 5.3 Data Persistence
- Store groups, members, exclusions, and assignments
- Support multiple draws per group (pending and finalized)
- Finalized draws are permanent and cannot be deleted (append-only history)
- Pending draws can be hard deleted
- Audit log of draw creation, finalization, and pending draw deletions
- Historical data for multi-year tracking:
  - Complete draw results from all finalized draws
  - Timestamped records of each draw creation and finalization
  - Member participation history across all finalized draws
  - Enable automatic exclusions based on finalized draw history
- Data retention policy for long-term group history

### 5.4 Performance Requirements
- Draw generation should complete in < 5 seconds for groups up to 100 members
- Support concurrent draws for multiple groups
- Responsive UI for mobile and desktop

## 6. UI/UX Requirements

### 6.1 Design Principles
- Clean, intuitive interface
- Mobile-first responsive design
- Festive, friendly aesthetic
- Accessibility compliant (WCAG 2.1 AA)

### 6.2 Key Screens
1. **Login/Register**: Authentication screens
2. **Dashboard**: View all groups (for logged-in users)
3. **Group Details**: Member list, settings, create draw button
4. **Group Settings**: Configure historical exclusions, anonymous mode **[POST-MVP]**, and other preferences
5. **Exclusion Manager**: Visual grid or graph interface for manual exclusions
6. **Member Form**: Add/edit member (name and optional email)
7. **Draw History**: View all draws for a group (pending and finalized) with timestamps and actions (delete pending only, view results)
8. **Draw Results**: View assignments for a specific finalized draw
9. **User Profile**: View/edit profile, change password, logout
10. **Password Reset**: Forgot password and reset password flows **[POST-MVP]**

### 6.3 Interactive Elements
- Drag-and-drop for exclusion rules
- Visual feedback for impossible configurations
- Confetti/celebration animation on draw finalization
- Clear visual distinction between pending and finalized draws
- Confirmation dialog before finalizing a draw (warns about immutability)
- Delete button only available for pending draws
- Toggle switches for enabling/disabling historical exclusions
- Anonymous mode toggle with clear privacy explanation **[POST-MVP]**
- Numeric input for historical exclusion lookback count


## 7. Assumptions and Constraints

### 7.1 Assumptions
- App users (admins) have internet access
- Email addresses for members are optional but recommended for notifications
- Groups will typically have 4-50 members
- Most exclusions will be reciprocal (mutual)
- Members do not need app accounts to participate
- Historical exclusions will be enabled by default for most groups
- Anonymous mode provides increased privacy but reduces admin oversight

### 7.2 Constraints
- Graph theory constraints may limit possible draws
- Need minimum 3 members for valid draw
- Excessive exclusions may make draw impossible
- Finalized draws cannot be modified or deleted (immutable history)
- Multiple finalized draws can accumulate over time (no automatic cleanup)

## 10. MVP vs Post-MVP Features

### MVP Scope
- User registration and login (basic email/password)
- Create and manage groups
- Add/edit/delete members with optional emails
- Set manual exclusion rules (one-way and two-way)
- Execute draw with validation
- View draw results (admin only)
- Email notifications to members
- Historical exclusion tracking
- Multiple draws per group
- Pending/finalized draw states
- Change password in settings

### Post-MVP Features
- Anonymous mode (hidden assignments from admin)
- Password reset flow (forgot password)
- "Remember me" persistent sessions
- Account deletion
- Advanced UI enhancements
- Performance optimizations

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Impossible draw configuration | High | Pre-validation with clear error messages |
| Member views wrong assignment | High | Secure token-based access, thorough testing |
| Algorithm performance issues | Medium | Optimize algorithm, set size limits |
| Low user adoption | Medium | Focus on UX, provide templates |
| Data breach of assignments | High | Encryption, security audits |
| Confusion from multiple draws | Medium | Clear timestamps and labels for each draw in history view |
| Members receive notifications for multiple draws | Medium | Clearly label each notification with draw identifier and creation date |
| Anonymous mode debugging difficulty | Low | Provide aggregate statistics without revealing individual assignments **[POST-MVP]** |

## 9. Open Questions

No open questions at this time.

## 12. Dependencies

- Email service provider (SendGrid, AWS SES, etc.)
- Database (PostgreSQL recommended for relational data)
- Authentication library (passport.js, JWT, or similar)
- Password hashing library (bcrypt)
- Session management (express-session, redis, or similar)
- Frontend framework (React, Vue, etc.)
- Backend framework (Node.js, Python, etc.)
