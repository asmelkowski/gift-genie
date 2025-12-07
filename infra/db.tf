# Serverless SQL Database auto-scales automatically
# No manual CPU configuration is needed
# NOTE: Scaleway SDB does not support private networks (unlike Redis)
# Database connection uses public endpoint with IAM-based authentication
# NOTE: IAM authentication credentials are created manually and passed as variables
# See README.md for IAM setup instructions
resource "scaleway_sdb_sql_database" "main" {
  name   = "gift-genie-db-${var.env}"
  region = var.region
}

# Outputs
output "db_endpoint" {
  value       = scaleway_sdb_sql_database.main.endpoint
  description = "Database endpoint (use with IAM credentials)"
}
