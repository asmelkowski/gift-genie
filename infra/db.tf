# Serverless SQL Database auto-scales automatically
# No manual CPU configuration is needed
resource "scaleway_sdb_sql_database" "main" {
  name   = "gift-genie-db-${var.env}"
  region = var.region
}

output "db_endpoint" {
  value = scaleway_sdb_sql_database.main.endpoint
}
