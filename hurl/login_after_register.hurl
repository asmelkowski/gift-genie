# Register a user first
POST http://localhost:8000/api/v1/auth/register
{
  "email": "login{{newUuid}}@example.com",
  "password": "LoginPass123",
  "name": "Login User"
}
HTTP 201
[Captures]
userEmail: jsonpath "$['email']"

# Now login with the registered user
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{userEmail}}",
  "password": "LoginPass123"
}
HTTP 200
[Captures]
access_token: cookie "access_token"
csrf_token: header "X-CSRF-Token"
[Asserts]
jsonpath "$.user.email" == "{{userEmail}}"
jsonpath "$.user.name" == "Login User"
jsonpath "$.token_type" == "Bearer"

# Try login with wrong password
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{userEmail}}",
  "password": "WrongPassword"
}
HTTP 401
[Asserts]
jsonpath "$.detail.code" == "invalid_credentials"

# Try login with non-existent email
POST http://localhost:8000/api/v1/auth/login
{
  "email": "nonexistent@example.com",
  "password": "SomePassword"
}
HTTP 401
[Asserts]
jsonpath "$.detail.code" == "invalid_credentials"
