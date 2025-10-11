# Exclusions Operations Test
# Tests all exclusion endpoints: GET, POST, POST/bulk, DELETE

# Register a user
POST http://localhost:8000/api/v1/auth/register
{
  "email": "exclusionsadmin{{newUuid}}@example.com",
  "password": "ExclusionPass123",
  "name": "Exclusions Admin"
}
HTTP 201
[Captures]
userEmail: jsonpath "$['email']"

# Login to get access token
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{userEmail}}",
  "password": "ExclusionPass123"
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
  "name": "Exclusions Test Group",
  "historical_exclusions_enabled": true,
  "historical_exclusions_lookback": 2
}
HTTP 201
[Captures]
groupId: jsonpath "$['id']"

# Create first member
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
memberId1: jsonpath "$['id']"

# Create second member
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
memberId2: jsonpath "$['id']"

# Create third member
POST http://localhost:8000/api/v1/groups/{{groupId}}/members
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "name": "Charlie Brown",
  "email": "charlie{{newUuid}}@example.com"
}
HTTP 201
[Captures]
memberId3: jsonpath "$['id']"

# GET exclusions - empty list
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" isEmpty
jsonpath "$.meta.total" == 0
jsonpath "$.meta.page" == 1
jsonpath "$.meta.page_size" == 10
jsonpath "$.meta.total_pages" == 0

# POST create single exclusion - success
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "giver_member_id": "{{memberId1}}",
  "receiver_member_id": "{{memberId2}}",
  "is_mutual": false
}
HTTP 201
[Captures]
exclusionId1: jsonpath "$.created[0]['id']"
[Asserts]
jsonpath "$.created[0]['group_id']" == "{{groupId}}"
jsonpath "$.created[0]['giver_member_id']" == "{{memberId1}}"
jsonpath "$.created[0]['receiver_member_id']" == "{{memberId2}}"
jsonpath "$.created[0]['exclusion_type']" == "manual"
jsonpath "$.created[0]['is_mutual']" == false
jsonpath "$.created[0]['created_by_user_id']" != null
jsonpath "$.mutual" == false

# GET exclusions - should have 1 exclusion
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 1
jsonpath "$.meta.total" == 1
jsonpath "$.data[0]['id']" == "{{exclusionId1}}"

# POST create mutual exclusion - success
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "giver_member_id": "{{memberId1}}",
  "receiver_member_id": "{{memberId3}}",
  "is_mutual": true
}
HTTP 201
[Captures]
exclusionId2: jsonpath "$.created[0]['id']"
exclusionId3: jsonpath "$.created[1]['id']"
[Asserts]
jsonpath "$.created" count == 2
jsonpath "$.created[0]['giver_member_id']" == "{{memberId1}}"
jsonpath "$.created[0]['receiver_member_id']" == "{{memberId3}}"
jsonpath "$.created[0]['is_mutual']" == true
jsonpath "$.created[1]['giver_member_id']" == "{{memberId3}}"
jsonpath "$.created[1]['receiver_member_id']" == "{{memberId1}}"
jsonpath "$.created[1]['is_mutual']" == true
jsonpath "$.mutual" == true

# GET exclusions - should have 3 exclusions now
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 3
jsonpath "$.meta.total" == 3

# GET exclusions - filter by giver
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions?giver_member_id={{memberId1}}
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 2
jsonpath "$.meta.total" == 2

# GET exclusions - filter by type manual
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions?type=manual
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 3
jsonpath "$.meta.total" == 3

# POST bulk create exclusions - success
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions/bulk
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "items": [
    {
      "giver_member_id": "{{memberId2}}",
      "receiver_member_id": "{{memberId3}}",
      "is_mutual": false
    }
  ]
}
HTTP 201
[Captures]
exclusionId4: jsonpath "$.created[0]['id']"
[Asserts]
jsonpath "$.created" count == 1
jsonpath "$.created[0]['giver_member_id']" == "{{memberId2}}"
jsonpath "$.created[0]['receiver_member_id']" == "{{memberId3}}"

# GET exclusions - should have 4 exclusions now
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 4
jsonpath "$.meta.total" == 4

# DELETE exclusion - success
DELETE http://localhost:8000/api/v1/groups/{{groupId}}/exclusions/{{exclusionId1}}
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
HTTP 204

# GET exclusions - should have 3 exclusions now
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 3
jsonpath "$.meta.total" == 3

# POST create exclusion - duplicate (should fail)
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "giver_member_id": "{{memberId1}}",
  "receiver_member_id": "{{memberId3}}",
  "is_mutual": false
}
HTTP 409
[Asserts]
jsonpath "$.detail.code" == "duplicate_exclusion"

# POST create exclusion - self exclusion (should fail)
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "giver_member_id": "{{memberId1}}",
  "receiver_member_id": "{{memberId1}}",
  "is_mutual": false
}
HTTP 409
[Asserts]
jsonpath "$.detail.code" == "self_exclusion_not_allowed"

# POST bulk create - with conflicts (should fail)
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions/bulk
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "items": [
    {
      "giver_member_id": "{{memberId1}}",
      "receiver_member_id": "{{memberId3}}",
      "is_mutual": false
    },
    {
      "giver_member_id": "{{memberId2}}",
      "receiver_member_id": "{{memberId1}}",
      "is_mutual": false
    }
  ]
}
HTTP 409
[Asserts]
jsonpath "$.detail.code" == "conflicts_present"
jsonpath "$.detail.details" count >= 1

# Register another user (non-admin)
POST http://localhost:8000/api/v1/auth/register
{
  "email": "nonadmin{{newUuid}}@example.com",
  "password": "NonAdminPass123",
  "name": "Non Admin User"
}
HTTP 201
[Captures]
nonAdminEmail: jsonpath "$['email']"

# Login as non-admin
POST http://localhost:8000/api/v1/auth/login
{
  "email": "{{nonAdminEmail}}",
  "password": "NonAdminPass123"
}
HTTP 200
[Captures]
non_admin_token: cookie "access_token"
non_admin_csrf: header "X-CSRF-Token"

# GET exclusions as non-admin - should fail
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{non_admin_token}}
HTTP 403
[Asserts]
jsonpath "$.detail.code" == "forbidden"

# POST exclusion as non-admin - should fail
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{non_admin_token}}
X-CSRF-Token: {{non_admin_csrf}}
{
  "giver_member_id": "{{memberId2}}",
  "receiver_member_id": "{{memberId1}}",
  "is_mutual": false
}
HTTP 403
[Asserts]
jsonpath "$.detail.code" == "forbidden"

# DELETE exclusion as non-admin - should fail
DELETE http://localhost:8000/api/v1/groups/{{groupId}}/exclusions/{{exclusionId2}}
[Cookies]
access_token: {{non_admin_token}}
X-CSRF-Token: {{non_admin_csrf}}
HTTP 403
[Asserts]
jsonpath "$.detail.code" == "forbidden"

# GET exclusions with invalid group ID - should fail
GET http://localhost:8000/api/v1/groups/{{newUuid}}/exclusions
[Cookies]
access_token: {{access_token}}
HTTP 404
[Asserts]
jsonpath "$.detail.code" == "group_not_found"

# POST exclusion with invalid member ID - should fail
POST http://localhost:8000/api/v1/groups/{{groupId}}/exclusions
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
{
  "giver_member_id": "{{newUuid}}",
  "receiver_member_id": "{{memberId2}}",
  "is_mutual": false
}
HTTP 404
[Asserts]
jsonpath "$.detail.code" == "group_or_member_not_found"

# DELETE non-existent exclusion - should fail
DELETE http://localhost:8000/api/v1/groups/{{groupId}}/exclusions/invalid-uuid
[Cookies]
access_token: {{access_token}}
X-CSRF-Token: {{csrf_token}}
HTTP 422
[Asserts]
jsonpath "$.detail[0].type" == "uuid_parsing"
jsonpath "$.detail[0].msg" == "Input should be a valid UUID, invalid character: expected an optional prefix of `urn:uuid:` followed by [0-9a-fA-F-], found `i` at 1"

# GET exclusions with pagination
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions?page=1&page_size=2
[Cookies]
access_token: {{access_token}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 2
jsonpath "$.meta.page" == 1
jsonpath "$.meta.page_size" == 2
jsonpath "$.meta.total" == 3
jsonpath "$.meta.total_pages" == 2

# GET exclusions with invalid pagination - should fail
GET http://localhost:8000/api/v1/groups/{{groupId}}/exclusions?page=0
[Cookies]
access_token: {{access_token}}
HTTP 422
[Asserts]
jsonpath "$.detail[0].type" == "greater_than_equal"
jsonpath "$.detail[0].msg" == "Input should be greater than or equal to 1"
