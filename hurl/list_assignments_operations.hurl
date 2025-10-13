# List Assignments Operations Test
# Tests GET /api/v1/draws/{drawId}/assignments endpoint
# This test creates a complete scenario: user, group, members, draw, assignments

# Register a user
POST http://localhost:8000/api/v1/auth/register
{
  "email": "listassignments{{newUuid}}@example.com",
  "password": "ListPass123",
  "name": "List Assignments Admin"
}
HTTP 201
[Captures]
userEmail: jsonpath "$['email']"

# Login to get access token
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{userEmail}}",
  "password": "ListPass123"
}
HTTP 200
[Captures]
access_token: cookie "access_token"
csrf_token: header "X-CSRF-Token"

# Create a group
POST http://localhost:8000/api/v1/groups
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "name": "List Assignments Test Group",
  "historical_exclusions_enabled": true,
  "historical_exclusions_lookback": 2
}
HTTP 201
[Captures]
groupId: jsonpath "$['id']"

# Add first member
POST http://localhost:8000/api/v1/groups/{{groupId}}/members
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "name": "Alice Johnson",
  "email": "alice{{newUuid}}@example.com"
}
HTTP 201
[Captures]
member1Id: jsonpath "$['id']"

# Add second member
POST http://localhost:8000/api/v1/groups/{{groupId}}/members
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "name": "Bob Smith",
  "email": "bob{{newUuid}}@example.com"
}
HTTP 201
[Captures]
member2Id: jsonpath "$['id']"

# Add third member
POST http://localhost:8000/api/v1/groups/{{groupId}}/members
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "name": "Carol Williams",
  "email": "carol{{newUuid}}@example.com"
}
HTTP 201
[Captures]
member3Id: jsonpath "$['id']"

# Create a draw
POST http://localhost:8000/api/v1/groups/{{groupId}}/draws
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "seed": 42
}
HTTP 201
[Captures]
drawId: jsonpath "$['id']"

# Execute the draw to create assignments
POST http://localhost:8000/api/v1/draws/{{drawId}}/execute
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "seed": 123
}
HTTP 200

# Finalize the draw
POST http://localhost:8000/api/v1/draws/{{drawId}}/finalize
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{}
HTTP 200

# Test: List assignments without names
GET http://localhost:8000/api/v1/draws/{{drawId}}/assignments
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" isCollection
jsonpath "$.data[0].id" exists
jsonpath "$.data[0].giver_member_id" exists
jsonpath "$.data[0].receiver_member_id" exists
jsonpath "$.data[0].giver_name" not exists
jsonpath "$.data[0].receiver_name" not exists
jsonpath "$.meta.total" == 3

# Test: List assignments with names
GET http://localhost:8000/api/v1/draws/{{drawId}}/assignments?include=names
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data[0].giver_name" exists
jsonpath "$.data[0].receiver_name" exists
jsonpath "$.data[1].giver_name" exists
jsonpath "$.data[1].receiver_name" exists
jsonpath "$.data[2].giver_name" exists
jsonpath "$.data[2].receiver_name" exists
jsonpath "$.meta.total" == 3

# Test: Unauthorized access (no auth token)
GET http://localhost:8000/api/v1/draws/{{drawId}}/assignments
HTTP 401

# Test: Invalid draw ID
GET http://localhost:8000/api/v1/draws/invalid-uuid/assignments
[Cookies]
access_token: {{access_token}}
HTTP 422

# Test: Non-existent draw ID
GET http://localhost:8000/api/v1/draws/550e8400-e29b-41d4-a716-446655440000/assignments
[Cookies]
access_token: {{access_token}}
HTTP 404
