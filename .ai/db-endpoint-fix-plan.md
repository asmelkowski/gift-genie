# Database Endpoint Parsing Fix Plan

## Problem
Backend is crashing in production with:
```
ValueError: invalid literal for int() with base 10: ''
```

This occurs in SQLAlchemy's URL parsing when the database port is an empty string.

## Root Cause
1. Scaleway Serverless SQL Database endpoint (`DB_ENDPOINT`) may have format `host:` (colon but no port)
2. The parsing logic in `settings.py` splits on `:` and tries to parse empty string as int
3. SQLAlchemy's `URL.create()` with `port=None` later fails when trying to convert to int

## Solution

### Phase 1: Fix Settings Parser (Immediate)
Update `/backend/src/gift_genie/infrastructure/config/settings.py`:

1. **Improve endpoint parsing** to handle all formats:
   - `host:port` → use both
   - `host:` → use host only, port=None
   - `host` → use host only, port=None

2. **Add default PostgreSQL port** (5432) when not specified

3. **Add validation** to ensure port is valid integer or None

4. **Add logging** for debugging configuration

### Phase 2: Terraform Investigation (Follow-up)
- Check actual Scaleway endpoint format in production logs
- Consider whether we need DB_PORT as separate variable
- Document expected endpoint formats

## Implementation Details

### Updated `assemble_db_url` method:
```python
@model_validator(mode="after")
def assemble_db_url(self) -> "Settings":
    """Construct DATABASE_URL from components if provided."""
    # If DB_ENDPOINT is provided (e.g. from Terraform), parse it
    if self.DB_ENDPOINT:
        if ":" in self.DB_ENDPOINT:
            host, port_str = self.DB_ENDPOINT.rsplit(":", 1)
            self.DB_HOST = host
            # Only parse port if we have a non-empty string
            if port_str.strip():
                try:
                    self.DB_PORT = int(port_str)
                except ValueError:
                    # Invalid port format, leave as None
                    print(f"Warning: Invalid port in DB_ENDPOINT: {port_str}")
            # If port_str is empty, leave DB_PORT as None
        else:
            self.DB_HOST = self.DB_ENDPOINT

    # Use default PostgreSQL port if not specified
    db_port = self.DB_PORT if self.DB_PORT is not None else 5432

    # If we have the necessary components, construct the URL
    if self.DB_USER and self.DB_PASSWORD and self.DB_HOST and self.DB_NAME:
        url = URL.create(
            drivername="postgresql+asyncpg",
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=db_port,  # Always provide a valid port
            database=self.DB_NAME,
            query={"sslmode": "require"},
        )
        self.DATABASE_URL = url.render_as_string(hide_password=False)

    return self
```

### Testing Strategy
1. Test with various endpoint formats:
   - `localhost:5432` ✓
   - `localhost:` ✓
   - `localhost` ✓
   - `db.scaleway.com:5432` ✓
   - `db.scaleway.com` ✓

2. Verify default port fallback works

3. Test in production environment

## Risks
- Low: This is a defensive fix that adds proper default handling
- Existing working configurations should not be affected
- Only affects URL construction from component environment variables

## Rollback
If issues occur, can:
1. Revert to commented-out `DATABASE_URL` in Terraform
2. Construct full URL in Terraform and pass as single variable
