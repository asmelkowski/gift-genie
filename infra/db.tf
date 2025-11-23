# Serverless SQL Database auto-scales automatically
# No manual CPU configuration is needed
resource "scaleway_sdb_sql_database" "main" {
  name   = "gift-genie-db-${var.env}"
  region = var.region
}

output "db_endpoint" {
  value = scaleway_sdb_sql_database.main.endpoint
}

resource "scaleway_redis_cluster" "main" {
  name         = "gift-genie-redis-${var.env}"
  version      = "7.2.11"
  node_type    = "RED1-MICRO"
  cluster_size = 1
  user_name    = var.default_username
  password     = var.redis_password
  zone         = var.zone
  tags         = ["gift-genie", var.env]

  private_network {
    id          = scaleway_vpc_private_network.main.id
    service_ips = ["172.16.0.10/22"]
  }
}

output "redis_endpoint" {
  value     = "${one(scaleway_redis_cluster.main.private_network).endpoint_ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
  sensitive = false
}

output "redis_private_endpoint" {
  value       = "${one(scaleway_redis_cluster.main.private_network).endpoint_ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
  description = "Redis private network endpoint for container connections"
  sensitive   = false
}
