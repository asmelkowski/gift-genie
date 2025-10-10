# Group Detail Operations Test
# Tests GET, PATCH, and DELETE /api/v1/groups/{groupId} endpoints

# Register a user
POST http://localhost:8000/api/v1/auth/register
{
  "email": "groupadmin{{newUuid}}@example.com",
  "password": "GroupPass123",
  "name": "Group Admin"
}
HTTP 201
[Captures]
userEmail: jsonpath "$['email']"

# Login to get access token
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{userEmail}}",
  "password": "GroupPass123"
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
  "name": "Test Group Details",
  "historical_exclusions_enabled": true,
  "historical_exclusions_lookback": 2
}
HTTP 201
[Captures]
groupId: jsonpath "$['id']"
[Asserts]
jsonpath "$.name" == "Test Group Details"
jsonpath "$.historical_exclusions_enabled" == true
jsonpath "$.historical_exclusions_lookback" == 2

# GET group details - success
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{groupId}}"
jsonpath "$.name" == "Test Group Details"
jsonpath "$.admin_user_id" != null
jsonpath "$.historical_exclusions_enabled" == true
jsonpath "$.historical_exclusions_lookback" == 2
jsonpath "$.created_at" != null
jsonpath "$.updated_at" != null
jsonpath "$.stats.member_count" == 0
jsonpath "$.stats.active_member_count" == 0

# PATCH group - update name only
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}

{
  "name": "Updated Group Name"
}

HTTP 200
[Asserts]
jsonpath "$.id" == "{{groupId}}"
jsonpath "$.name" == "Updated Group Name"
jsonpath "$.historical_exclusions_enabled" == true
jsonpath "$.historical_exclusions_lookback" == 2
jsonpath "$.updated_at" != null

# PATCH group - update settings
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "historical_exclusions_enabled": false,
  "historical_exclusions_lookback": 3
}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{groupId}}"
jsonpath "$.name" == "Updated Group Name"
jsonpath "$.historical_exclusions_enabled" == false
jsonpath "$.historical_exclusions_lookback" == 3

# PATCH group - invalid payload (no fields)
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{}
HTTP 422

# PATCH group - invalid name (empty)
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "name": ""
}
HTTP 422

# PATCH group - invalid lookback (negative)
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "historical_exclusions_lookback": 0
}
HTTP 422

# GET group details after updates
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.name" == "Updated Group Name"
jsonpath "$.historical_exclusions_enabled" == false
jsonpath "$.historical_exclusions_lookback" == 3

# DELETE group - success
DELETE http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
HTTP 204

# GET group details after deletion - should fail
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
HTTP 404
[Asserts]
jsonpath "$.detail.code" == "group_not_found"

# DELETE same group again - should fail
DELETE http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
HTTP 404
[Asserts]
jsonpath "$.detail.code" == "group_not_found"
