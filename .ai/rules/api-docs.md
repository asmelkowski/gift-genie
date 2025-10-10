### API Docs — OpenAPI/Swagger
- Define schemas for all request and response objects.
- Use semantic API versioning in paths for backward compatibility.
- Document endpoints/parameters and domain concepts with detailed descriptions.
- Configure security schemes for auth.
- Use tags to group endpoints.
- Provide examples for all endpoints.

#### Groups Endpoints

##### GET /api/v1/groups
Lists all groups owned by the authenticated user with optional search, pagination, and sorting.

**Query Parameters:**
- `search` (optional, string): Filter groups by name (case-insensitive partial match)
- `page` (optional, integer, default 1, min 1): Page number
- `page_size` (optional, integer, default 10, min 1, max 100): Items per page
- `sort` (optional, string, default "-created_at"): Sort field with direction prefix (allowed: `created_at`, `-created_at`, `name`, `-name`)

**Authentication:** Required (JWT from httpOnly cookie)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Family Secret Santa",
      "created_at": "2025-10-10T12:00:00Z",
      "historical_exclusions_enabled": true,
      "historical_exclusions_lookback": 1
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "page_size": 10,
    "total_pages": 5
  }
}
```

**Errors:**
- 400: Invalid query params
- 401: Unauthorized

##### POST /api/v1/groups
Creates a new group with the caller as admin.

**Request Body:**
```json
{
  "name": "string (required, 1-100 chars after trim)",
  "historical_exclusions_enabled": "boolean (optional, default: true)",
  "historical_exclusions_lookback": "integer (optional, default: 1, min: 1)"
}
```

**Authentication:** Required (JWT from httpOnly cookie)

**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "Family Secret Santa",
  "admin_user_id": "uuid",
  "historical_exclusions_enabled": true,
  "historical_exclusions_lookback": 1,
  "created_at": "2025-10-10T12:00:00Z",
  "updated_at": "2025-10-10T12:00:00Z"
}
```

**Errors:**
- 400: Invalid payload
- 401: Unauthorized
- 500: Server error