# Successful registration
POST http://localhost:8000/api/v1/auth/register
{
	"email": "success{{newUuid}}@example.com",
  	"password": "Str0ngP@ssw0rd123",
  	"name": "Test User"
}
HTTP 201
[Asserts]
jsonpath "$.id" != null
jsonpath "$.email" matches "success[a-f0-9-]+@example.com"
jsonpath "$.name" == "Test User"
jsonpath "$.created_at" != null

# Email conflict - duplicate email
POST http://localhost:8000/api/v1/auth/register
{
	"email": "conflict{{newUuid}}@example.com",
  	"password": "Str0ngP@ssw0rd123",
  	"name": "User One"
}
HTTP 201
[Captures]
userEmail: jsonpath "$['email']"

POST http://localhost:8000/api/v1/auth/register
{
	"email": "{{userEmail}}",
  	"password": "Diff3r3ntP@ssw0rd456",
  	"name": "User Two"
}
HTTP 409
[Asserts]
jsonpath "$.detail.code" == "email_conflict"

# Weak password - too short
POST http://localhost:8000/api/v1/auth/register
{
	"email": "short{{newUuid}}@example.com",
  	"password": "short",
  	"name": "Short Pass"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].type" == "string_too_short"
jsonpath "$.detail[0].msg" == "String should have at least 8 characters"

# Weak password - only lowercase letters
POST http://localhost:8000/api/v1/auth/register
{
	"email": "weak1@example.com",
  	"password": "onlylowercaseletters",
  	"name": "Weak One"
}
HTTP 400
[Asserts]
jsonpath "$.detail.code" == "invalid_payload"
jsonpath "$.detail.field" == "password"
jsonpath "$.detail.message" == "Weak password"

# Weak password - contains email local part
POST http://localhost:8000/api/v1/auth/register
{
	"email": "weak2@example.com",
  	"password": "weak2password123",
  	"name": "Weak Two"
}
HTTP 400
[Asserts]
jsonpath "$.detail.code" == "invalid_payload"
jsonpath "$.detail.field" == "password"
jsonpath "$.detail.message" == "Weak password"

# Weak password - contains name
POST http://localhost:8000/api/v1/auth/register
{
	"email": "weak3@example.com",
  	"password": "weakthree123",
  	"name": "Weak Three"
}
HTTP 400
[Asserts]
jsonpath "$.detail.code" == "invalid_payload"
jsonpath "$.detail.field" == "password"
jsonpath "$.detail.message" == "Weak password"

# Invalid email format
POST http://localhost:8000/api/v1/auth/register
{
	"email": "invalid-email",
  	"password": "Str0ngP@ssw0rd123",
  	"name": "Invalid Email"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "email"

# Email too long (over 254 characters)
POST http://localhost:8000/api/v1/auth/register
{
	"email": "verylongemailaddress{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}@example.com",
  	"password": "Str0ngP@ssw0rd123",
  	"name": "Long Email"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "email"

# Name too short (empty after strip)
POST http://localhost:8000/api/v1/auth/register
{
	"email": "emptyname@example.com",
  	"password": "Str0ngP@ssw0rd123",
  	"name": "   "
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "name"

# Name too long (over 100 characters)
POST http://localhost:8000/api/v1/auth/register
{
	"email": "longname@example.com",
  	"password": "Str0ngP@ssw0rd123",
  	"name": "{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}{{newUuid}}"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "name"

# Missing email field
POST http://localhost:8000/api/v1/auth/register
{
  	"password": "Str0ngP@ssw0rd123",
  	"name": "Missing Email"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "email"

# Missing password field
POST http://localhost:8000/api/v1/auth/register
{
	"email": "missingpass@example.com",
  	"name": "Missing Password"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "password"

# Missing name field
POST http://localhost:8000/api/v1/auth/register
{
	"email": "missingname@example.com",
  	"password": "Str0ngP@ssw0rd123"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "name"

# Extra field (should be forbidden)
POST http://localhost:8000/api/v1/auth/register
{
	"email": "extra@example.com",
  	"password": "Str0ngP@ssw0rd123",
  	"name": "Extra Field",
  	"extra_field": "not allowed"
}
HTTP 422
[Asserts]
jsonpath "$.detail[0].loc[1]" == "extra_field"

# Strong password with all character classes
POST http://localhost:8000/api/v1/auth/register
{
	"email": "strong{{newUuid}}@example.com",
  	"password": "Str0ngP@ssw0rd!123",
  	"name": "Strong Password"
}
HTTP 201
[Asserts]
jsonpath "$.id" != null
jsonpath "$.email" matches "strong[a-f0-9-]+@example.com"
jsonpath "$.name" == "Strong Password"
jsonpath "$.created_at" != null

# Password with exactly 3 character classes (should pass)
POST http://localhost:8000/api/v1/auth/register
{
	"email": "threeclasses{{newUuid}}@example.com",
  	"password": "Password123",
  	"name": "Three Classes"
}
HTTP 201
[Asserts]
jsonpath "$.id" != null
jsonpath "$.email" matches "threeclasses[a-f0-9-]+@example.com"
jsonpath "$.name" == "Three Classes"
jsonpath "$.created_at" != null
