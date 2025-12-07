# Serverless SQL Database auto-scales automatically
# No manual CPU configuration is needed
# NOTE: Scaleway SDB does not support private networks (unlike Redis)
# Database connection uses public endpoint with IAM-based authentication
resource "scaleway_sdb_sql_database" "main" {
  name   = "gift-genie-db-${var.env}"
  region = var.region
}

# IAM Application - acts as the database "user"
# This application identity is used to authenticate to the database
resource "scaleway_iam_application" "db_app" {
  name            = "gift-genie-db-app-${var.env}"
  organization_id = var.organization_id
  description     = "IAM application for Gift Genie database access"
}

# IAM API Key - acts as the database "password"
# The secret_key from this resource is used as the database password
resource "scaleway_iam_api_key" "db_key" {
  application_id = scaleway_iam_application.db_app.id
  description    = "Database access credentials for gift-genie backend ${var.env}"
}

# IAM Policy - grants database read/write permissions
# This policy allows the IAM application to access the SDB database
resource "scaleway_iam_policy" "db_access" {
  name           = "gift-genie-db-policy-${var.env}"
  description    = "Grant ServerlessSQLDatabase access to gift-genie backend"
  application_id = scaleway_iam_application.db_app.id

  rule {
    project_ids          = [var.project_id]
    permission_set_names = ["ServerlessSQLDatabaseReadWrite"]
  }
}

# Outputs
output "db_endpoint" {
  value       = scaleway_sdb_sql_database.main.endpoint
  description = "Database endpoint (use with IAM credentials)"
}

output "db_iam_application_id" {
  value       = scaleway_iam_application.db_app.id
  description = "IAM application ID (used as database username)"
  sensitive   = true
}
