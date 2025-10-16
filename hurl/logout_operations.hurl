# Test 1: Logout after successful login
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json
{
  "email": "test@example.com",
  "password": "TestPass123!"
}

HTTP 200
[Asserts]
jsonpath "$.user.id" exists
jsonpath "$.token_type" == "Bearer"
[Captures]
access_token: cookie "access_token"


# Test 2: Logout with valid token
POST http://localhost:8000/api/v1/auth/logout
Cookie: access_token={{access_token}}

HTTP 204
[Asserts]
header "Set-Cookie" contains "access_token="
header "Set-Cookie" contains "max-age=0" or header "Set-Cookie" contains "Max-Age=0"


# Test 3: Verify logout - accessing protected endpoint should fail
GET http://localhost:8000/api/v1/auth/me

HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"


# Test 4: Logout without token (idempotent)
POST http://localhost:8000/api/v1/auth/logout

HTTP 204


# Test 5: Multiple logouts (idempotency test)
POST http://localhost:8000/api/v1/auth/logout
HTTP 204

POST http://localhost:8000/api/v1/auth/logout
HTTP 204

POST http://localhost:8000/api/v1/auth/logout
HTTP 204
