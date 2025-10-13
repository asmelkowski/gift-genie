# Test: List assignments without names
GET {{base_url}}/draws/{{draw_id}}/assignments
Authorization: Bearer {{auth_token}}
HTTP 200
[Asserts]
jsonpath "$.data" isCollection
jsonpath "$.data[0].id" exists
jsonpath "$.data[0].giver_member_id" exists
jsonpath "$.data[0].receiver_member_id" exists
jsonpath "$.data[0].giver_name" not exists
jsonpath "$.meta.total" exists

# Test: List assignments with names
GET {{base_url}}/draws/{{draw_id}}/assignments?include=names
Authorization: Bearer {{auth_token}}
HTTP 200
[Asserts]
jsonpath "$.data[0].giver_name" exists
jsonpath "$.data[0].receiver_name" exists

# Test: Unauthorized access
GET {{base_url}}/draws/{{draw_id}}/assignments
HTTP 401

# Test: Invalid draw ID
GET {{base_url}}/draws/invalid-uuid/assignments
Authorization: Bearer {{auth_token}}
HTTP 422