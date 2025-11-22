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
