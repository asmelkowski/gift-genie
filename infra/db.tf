resource "scaleway_sdb_sql_database" "main" {
  name       = "gift-genie-db-${var.env}"
  min_cpu    = 0  # Auto-scales to zero when idle
  max_cpu    = 2  # Max 2 vCPU for burst capacity
  region     = var.region
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
}

output "redis_endpoint" {
  value     = "${scaleway_redis_cluster.main.public_network[0].ips[0]}:${scaleway_redis_cluster.main.public_network[0].port}"
  sensitive = false
}
