# Debugging E2E Tests with Exception Logging

Now that comprehensive exception logging is implemented, here's how to debug your e2e test failures effectively.

## Quick Start

### 1. Run Your E2E Tests with Logging Visible

```bash
# In one terminal, start the backend with logging:
cd backend && make run

# In another terminal, run e2e tests:
cd frontend && npm run test:e2e
```

The backend logs will appear in real-time showing all exceptions with full context.

### 2. Understanding Log Levels

**ERROR (🔴 Red)**
- Unexpected exceptions that weren't caught by handlers
- Includes full Python stacktrace
- Most useful for debugging unexpected failures
- Example: A database connection error, a crashed endpoint

**WARNING (🟡 Yellow)**
- Expected business logic errors (4xx HTTP responses)
- Indicates what went wrong at the business rule level
- Examples: EmailConflictError, GroupNotFoundError, InvalidCredentialsError

**INFO (🟢 Green)**
- Normal request logging
- Shows request path, method, parameters

## Debugging Scenarios

### Scenario 1: E2E Test Fails with Status 500

**What it means:** Unexpected error on the backend

**How to debug:**

1. Look for ERROR-level logs from the failed request:
   ```
   2024-11-10 10:30:15 | ERROR | middleware.exception_logging:32 | Unexpected exception occurred
   ```

2. Check the full stacktrace in the log:
   ```
   stacktrace=Traceback (most recent call last):
     File "...", line 123, in process_request
       ...
     ValueError: Invalid configuration
   ```

3. Use the request_id to find all logs for this request:
   ```bash
   docker logs gift-genie-backend | grep "request_id=abc-123"
   ```

### Scenario 2: E2E Test Fails with Status 409 (Conflict)

**What it means:** Business logic validation failed (expected error, but test didn't expect it)

**How to debug:**

1. Look for WARNING-level logs:
   ```
   2024-11-10 10:30:15 | WARNING | exception_handlers:41 | EmailConflictError caught
   | exception_type=EmailConflictError | status_code=409 | error=Email already in use
   ```

2. The log tells you exactly what failed and why
3. Likely cause: Test data setup issue, or endpoint called twice

### Scenario 3: E2E Test Fails with Status 401 (Unauthorized)

**What it means:** Authentication issue

**How to debug:**

1. Check if the test is sending auth headers:
   ```bash
   docker logs gift-genie-backend | grep "InvalidCredentialsError"
   ```

2. Look at the request context in logs:
   ```
   | path=/api/v1/auth/login | method=POST | user_id=
   ```

   If `user_id=` is empty, authentication wasn't found

### Scenario 4: E2E Test Fails with Status 404 (Not Found)

**What it means:** Resource doesn't exist

**How to debug:**

1. Check the logs:
   ```
   2024-11-10 10:30:15 | WARNING | exception_handlers:89 | GroupNotFoundError caught
   | exception_type=GroupNotFoundError | status_code=404 | error=Group not found
   | request_id=abc-123 | path=/api/v1/groups/123
   ```

2. Common causes:
   - Group ID in test doesn't match database
   - Previous test didn't create the resource
   - Cleanup from previous test deleted it

## Filtering Logs

### By Request ID (Most Useful!)

```bash
# Get all logs for one request
docker logs gift-genie-backend | grep "request_id=abc-123"

# Count errors in a request
docker logs gift-genie-backend | grep "request_id=abc-123" | grep ERROR | wc -l
```

### By Exception Type

```bash
# Find all EmailConflictError instances
docker logs gift-genie-backend | grep "EmailConflictError"

# Count specific errors
docker logs gift-genie-backend | grep "ValidationError" | wc -l
```

### By HTTP Status Code

```bash
# Find all 400 errors
docker logs gift-genie-backend | grep "status_code=400"

# Find all 5xx errors
docker logs gift-genie-backend | grep "ERROR"
```

### By Endpoint

```bash
# All requests to /api/v1/groups
docker logs gift-genie-backend | grep "path=/api/v1/groups"

# All POST requests
docker logs gift-genie-backend | grep "method=POST"
```

## Log Message Format

### Development Format (Human-Readable)

```
2024-11-10 10:30:15 | ERROR    | middleware.exception_logging:dispatch:32 | Unexpected exception occurred
| exception_type=ValueError | exception_message=Invalid value | stacktrace=... | request_id=abc-123 | path=/api/v1/groups | method=POST | query_params= | user_agent=Mozilla/5.0... | client_ip=127.0.0.1
```

**Breaking it down:**
- `2024-11-10 10:30:15`: Timestamp
- `ERROR`: Log level
- `middleware.exception_logging:dispatch:32`: Module:function:line
- `Unexpected exception occurred`: Log message
- Everything after `|`: Structured data fields

### Important Fields

| Field | Meaning |
|-------|---------|
| `request_id` | Unique ID for this request (correlate logs) |
| `path` | API endpoint that was called |
| `method` | HTTP method (GET, POST, etc.) |
| `status_code` | HTTP response status |
| `exception_type` | What went wrong (ErrorType name) |
| `error` or `exception_message` | Human-readable error description |
| `stacktrace` | Full Python traceback (on ERROR level) |
| `user_id` | Which user made the request |
| `query_params` | Query string parameters |
| `user_agent` | Browser/client info |
| `client_ip` | Which IP made the request |

## Best Practices for E2E Debugging

### 1. Check Logs in Real-Time

Keep the backend logs visible while running tests:

```bash
# Terminal 1 - Watch backend logs
docker logs -f gift-genie-backend

# Terminal 2 - Run e2e tests
npm run test:e2e
```

### 2. Use Request IDs to Trace a Specific Failure

When a test fails:

1. Note the request_id from the response header
2. Grep for that ID in logs
3. Read the full request sequence

### 3. Capture Full Log Output for Failed Tests

```bash
# Save logs to file when test fails
docker logs gift-genie-backend > backend-logs.txt
# Share with team for analysis
```

### 4. Look for Patterns

If multiple e2e tests fail with the same error:

```bash
# Find the most common errors
docker logs gift-genie-backend | grep ERROR | cut -d'|' -f7 | sort | uniq -c | sort -rn
```

### 5. Check Test Data Setup

Most e2e failures are due to test data issues:

```bash
# Check what data exists before tests
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM groups;
```

## Common E2E Issues and Solutions

### Issue: All E2E tests fail with 500 errors

**Check:**
```bash
docker logs gift-genie-backend | grep ERROR
```

**Common causes:**
- Database not running: `docker ps | grep postgres`
- Redis not running: `docker ps | grep redis`
- Migrations not applied: Check DB logs
- Connection string wrong: Check `.env`

### Issue: Tests pass locally but fail in CI

**Check:**
```bash
# Are logs available?
docker logs <backend-container-id>

# Is backend healthy?
curl http://localhost:8000/health
```

**Common causes:**
- Network issues between containers
- Database initialization timing
- Timing-dependent tests

### Issue: Specific test fails, others pass

**Debug the one test:**
1. Run just that test
2. Watch backend logs
3. Look for the ERROR or WARNING message
4. Check request_id to see full request sequence

```bash
npm run test:e2e -- --grep "specific test name"
```

## Advanced Debugging

### Extract Stacktrace from ERROR Logs

```bash
# Get full stacktrace for an error
docker logs gift-genie-backend | grep "ERROR.*request_id=abc-123" | grep -o "stacktrace=[^|]*" | head -1
```

### Count Errors by Type

```bash
docker logs gift-genie-backend | grep ERROR | cut -d'=' -f3 | sort | uniq -c
```

### Find Slow Requests

*(Coming soon: request timing in logs)*

```bash
# For now, check logs for patterns of delays
docker logs gift-genie-backend | tail -100
```

## Getting Help

When reporting a bug found by e2e tests:

1. **Include the request_id** from the failed request
2. **Share full logs** for that request_id:
   ```bash
   docker logs gift-genie-backend | grep "request_id=xyz" > logs.txt
   ```
3. **Include test name** that failed
4. **Note the status code** returned to e2e test

## Summary

The logging system gives you:
- ✅ Full exception stacktraces
- ✅ Request tracing via request_id
- ✅ Structured data for easy filtering
- ✅ Request context (path, method, user, etc.)
- ✅ Clear distinction between expected and unexpected errors

**Pro tip:** Save the request_id header from failures and grep the backend logs with it. This shows exactly what happened to that request.

Happy debugging! 🔍
