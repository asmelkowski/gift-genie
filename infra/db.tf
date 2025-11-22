resource "scaleway_rdb_instance" "main" {
  name           = "gift-genie-db-${var.env}"
  node_type      = "DB-DEV-S" # Smallest for dev/testing, can be upgraded
  engine         = "PostgreSQL-15"
  is_ha_cluster  = false
  disable_backup = false
  user_name      = "gift_genie"
  password       = var.db_password
  region         = var.region
  tags           = ["gift-genie", var.env]

  load_balancer {}
}

resource "scaleway_rdb_database" "main" {
  instance_id = scaleway_rdb_instance.main.id
  name        = "gift_genie"
}

output "db_endpoint" {
  value = "${scaleway_rdb_instance.main.load_balancer[0].ip}:${scaleway_rdb_instance.main.load_balancer[0].port}"
}

resource "scaleway_redis_cluster" "main" {
  name         = "gift-genie-redis-${var.env}"
  version      = "7.2.4"
  node_type    = "RED1-MICRO"
  cluster_size = 1
  user_name    = "gift_genie"
  password     = var.redis_password
  zone         = var.zone
  tags         = ["gift-genie", var.env]
}

output "redis_endpoint" {
  value     = "${scaleway_redis_cluster.main.public_network[0].ips[0]}:${scaleway_redis_cluster.main.public_network[0].port}"
  sensitive = false
}
