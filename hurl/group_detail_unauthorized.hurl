# Group Detail Unauthorized Access Test
# Tests that unauthenticated requests are rejected

# Register and login to create a group
POST http://localhost:8000/api/v1/auth/register
{
  "email": "unauth{{newUuid}}@example.com",
  "password": "UnauthPass123",
  "name": "Unauth User"
}
HTTP 201
[Captures]
userEmail: jsonpath "$['email']"

POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{userEmail}}",
  "password": "UnauthPass123"
}
HTTP 200
[Captures]
access_token: cookie "access_token"
csrf_token: header "X-CSRF-Token"

POST http://localhost:8000/api/v1/groups
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "name": "Test Group",
  "historical_exclusions_enabled": true,
  "historical_exclusions_lookback": 1
}
HTTP 201
[Captures]
groupId: jsonpath "$['id']"

# GET without authentication - should fail
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: 'unauth'

HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"

# PATCH without authentication - should fail
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: 'unauth'
{
  "name": "New Name"
}
HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"

# DELETE without authentication - should fail
DELETE http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: 'unauth'
HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"

# GET with invalid token - should fail
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: invalid_token
HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"

# PATCH with invalid token - should fail
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: invalid_token
{
  "name": "New Name"
}
HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"

# DELETE with invalid token - should fail
DELETE http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: invalid_token
HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"
