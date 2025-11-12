# Exception Logging Implementation Guide

## Overview

A comprehensive exception logging system has been implemented to improve debugging of e2e test failures and production issues. The system captures full exception context (stacktrace, request info) and logs structured data for easy filtering and analysis.

## What Was Implemented

### 1. Structured Logging Module
**Location:** `backend/src/gift_genie/infrastructure/logging/`

- **request_context.py**: Manages request context using Python's `contextvars`
  - `generate_request_id()`: Creates unique UUID for each request
  - `set_request_context()`: Stores request info in context variables (request_id, user_id, path, method)
  - `get_request_context()`: Retrieves current request context as dictionary

### 2. Exception Logging Middleware
**Location:** `backend/src/gift_genie/presentation/middleware/exception_logging.py`

- Wraps all requests to capture unexpected exceptions
- Logs full exception details with:
  - Exception type and message
  - Full Python stacktrace
  - Request info (path, method, query params, user agent, client IP)
  - Unique request_id for tracing
- Attaches `X-Request-ID` header to all responses for client-side tracing
- Re-raises exceptions to let FastAPI handlers process them normally

### 3. Enhanced Exception Handlers
**Location:** `backend/src/gift_genie/presentation/api/exception_handlers.py`

- All 22 exception handlers now log before returning response
- Logs at WARNING level for 4xx errors (expected failures)
- Includes structured data: exception type, status code, error message
- No changes to handler logic or response format

### 4. Loguru Configuration
**Location:** `backend/src/gift_genie/main.py`

- `setup_logging()`: Configures loguru with:
  - **Development**: Human-readable format with colors
  - **Production**: JSON format for structured logging aggregation
  - Log level controlled by `LOG_LEVEL` environment variable (default: INFO)
  - Automatic request context patching on all log messages

**Location:** `backend/src/gift_genie/infrastructure/config/settings.py`

- Added `LOG_LEVEL` setting (environment variable: `LOG_LEVEL`, default: "INFO")

## How It Works

### Request Flow

```
1. Request arrives → Middleware captures it
   ↓
2. Middleware generates request_id and stores in context
   ↓
3. Request processed by FastAPI handlers
   ↓
4a. If exception occurs during processing:
    - Middleware logs ERROR with full stacktrace + context
    - Re-raises exception

4b. Exception handler catches specific exception:
    - Logs WARNING with exception details
    - Returns JSON response with error info
    ↓
5. Response sent with X-Request-ID header
```

### Log Output Examples

**Unexpected Exception (Error Level):**
```
2024-11-10 10:30:15 | ERROR    | gift_genie.presentation.middleware.exception_logging:dispatch:32 | Unexpected exception occurred
| exception_type=ValueError | exception_message=Invalid configuration | stacktrace=Traceback... | request_id=abc-123 | path=/api/v1/groups | method=POST | query_params= | user_agent=Mozilla/5.0... | client_ip=127.0.0.1
```

**Expected Business Error (Warning Level):**
```
2024-11-10 10:30:15 | WARNING  | gift_genie.presentation.api.exception_handlers:handle_email_conflict_error:41 | EmailConflictError caught
| exception_type=EmailConflictError | status_code=409 | error=Email already in use | request_id=abc-123 | path=/api/v1/auth/register | method=POST
```

## Using Request Context in New Code

To access request context anywhere in your code:

```python
from gift_genie.infrastructure.logging import get_request_context

# In any function/handler
context = get_request_context()
print(context["request_id"])  # abc-123
print(context["path"])        # /api/v1/groups
print(context["method"])      # POST
print(context["user_id"])     # user_456
```

## Adding Logging to New Exception Handlers

When adding a new exception handler, follow this pattern:

```python
@app.exception_handler(NewError)
async def handle_new_error(request: Request, exc: NewError) -> JSONResponse:
    # Log the exception
    logger.warning(
        "NewError caught",
        extra={
            "exception_type": "NewError",
            "status_code": 400,
            "error": str(exc),
        },
    )

    # Return response as normal
    return JSONResponse(
        status_code=400,
        content={"detail": {"code": "new_error", "message": str(exc)}},
    )
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | INFO | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `ENV` | dev | Environment (dev for colors, other for JSON) |

## Benefits

✅ **Full Exception Context**: Every error includes stacktrace and request info
✅ **Request Tracing**: Unique request_id correlates all logs for a single request
✅ **Structured Logging**: Consistent format for easy parsing and filtering
✅ **Environment-Aware**: Different output formats for dev vs production
✅ **Zero Performance Overhead**: Async logging, minimal filtering
✅ **Backward Compatible**: No changes to existing error handling behavior

## Testing the Logging System

### Local Development

1. Start the backend:
   ```bash
   cd backend && make run
   ```

2. Make a request that triggers an error:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "weak"}'
   ```

3. Check the console logs - you should see:
   - Request logging from middleware
   - Warning from exception handler
   - Full request context in logs
   - X-Request-ID in response headers

### E2E Debugging

When an e2e test fails:

1. Check backend logs for ERROR or WARNING messages
2. Use request_id from logs to correlate with test output
3. Look for full stacktrace in ERROR-level logs
4. Exception handlers show business logic failures at WARNING level

Example log grep:
```bash
# Find all errors for a specific request
docker logs <backend-container> | grep "request_id=abc-123"

# Find all exceptions of a specific type
docker logs <backend-container> | grep "EmailConflictError"

# Find all failed requests
docker logs <backend-container> | grep "ERROR"
```

## Future Enhancements

- Add log filtering for sensitive data (passwords, tokens)
- Integrate with external logging services (ELK, Datadog, etc.)
- Add performance timing to requests
- Add custom context setters for user-specific logging
- Implement log level override per endpoint

## References

- [loguru documentation](https://loguru.readthedocs.io/)
- [Python contextvars](https://docs.python.org/3/library/contextvars.html)
- [FastAPI middleware](https://fastapi.tiangolo.com/tutorial/middleware/)
