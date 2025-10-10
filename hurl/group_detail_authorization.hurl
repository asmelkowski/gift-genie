# Group Detail Authorization Test
# Tests that users can only access their own groups

# Register first user
POST http://localhost:8000/api/v1/auth/register
{
  "email": "user1{{newUuid}}@example.com",
  "password": "User1Pass123",
  "name": "User One"
}
HTTP 201
[Captures]
user1Email: jsonpath "$['email']"

# Register second user
POST http://localhost:8000/api/v1/auth/register
{
  "email": "user2{{newUuid}}@example.com",
  "password": "User2Pass123",
  "name": "User Two"
}
HTTP 201
[Captures]
user2Email: jsonpath "$['email']"

# User 1 login
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{user1Email}}",
  "password": "User1Pass123"
}
HTTP 200
[Captures]
user1_token: cookie "access_token"
user1_csrf: header "X-CSRF-Token"

# User 2 login
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{user2Email}}",
  "password": "User2Pass123"
}
HTTP 200
[Captures]
user2_token: cookie "access_token"
user2_csrf: header "X-CSRF-Token"

# User 1 creates a group
POST http://localhost:8000/api/v1/groups
[Cookies]
access_token: {{user1_token}}
X-CSRF-Token: {{user1_csrf}}
{
  "name": "User 1's Group",
  "historical_exclusions_enabled": true,
  "historical_exclusions_lookback": 1
}
HTTP 201
[Captures]
groupId: jsonpath "$['id']"

# User 1 can access their own group
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user1_token}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{groupId}}"
jsonpath "$.name" == "User 1's Group"

# User 2 cannot access User 1's group - GET forbidden
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user2_token}}
HTTP 403
[Asserts]
jsonpath "$.detail.code" == "forbidden"

# User 2 cannot update User 1's group - PATCH forbidden
PATCH http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user2_token}}
X-CSRF-Token: {{user2_csrf}}
{
  "name": "Hacked Name"
}
HTTP 403
[Asserts]
jsonpath "$.detail.code" == "forbidden"

# User 2 cannot delete User 1's group - DELETE forbidden
DELETE http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user2_token}}
X-CSRF-Token: {{user2_csrf}}
HTTP 403
[Asserts]
jsonpath "$.detail.code" == "forbidden"

# User 1 can still access their group
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user1_token}}
HTTP 200
[Asserts]
jsonpath "$.name" == "User 1's Group"

# User 1 deletes their own group
DELETE http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user1_token}}
X-CSRF-Token: {{user1_csrf}}
HTTP 204

# Now neither user can access the deleted group
GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user1_token}}
HTTP 404
[Asserts]
jsonpath "$.detail.code" == "group_not_found"

GET http://localhost:8000/api/v1/groups/{{groupId}}
[Cookies]
access_token: {{user2_token}}
HTTP 404
[Asserts]
jsonpath "$.detail.code" == "group_not_found"
