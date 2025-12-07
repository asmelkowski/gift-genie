# Serverless SQL Database auto-scales automatically
# No manual CPU configuration is needed
# NOTE: Scaleway SDB does not support private networks (unlike Redis)
# Database connection uses IAM-based authentication with the same Scaleway credentials
# that Terraform uses (requires ServerlessSQLDatabaseFullAccess permission)
resource "scaleway_sdb_sql_database" "main" {
  name   = "gift-genie-db-${var.env}"
  region = var.region
}

# Outputs
output "db_endpoint" {
  value       = scaleway_sdb_sql_database.main.endpoint
  description = "Database endpoint (use with IAM credentials)"
}

# Output for debugging database connection configuration
output "db_database_id" {
  value       = regex("^([^.]+)\\.", replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", ""))[0]
  description = "Database ID (UUID) extracted from endpoint for TLS SNI configuration"
  sensitive   = false
}
