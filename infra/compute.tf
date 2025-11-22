resource "scaleway_container_namespace" "main" {
  name        = "gift-genie-ns-${var.env}"
  description = "Namespace for Gift Genie ${var.env}"
  region      = var.region
}

resource "scaleway_container" "backend" {
  name            = "gift-genie-backend"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "${scaleway_registry_namespace.main.endpoint}/gift-genie-backend:latest"
  port            = 8000
  cpu_limit       = 560
  memory_limit    = 560
  min_scale       = 1
  max_scale       = 5
  timeout         = 600
  deploy          = true

  environment_variables = {
    "ENV"           = var.env
    "DEBUG"         = "false"
    "CORS_ORIGINS"  = "*"
    "COOKIE_SECURE" = "true"
  }

  secret_environment_variables = {
    "DATABASE_URL" = "postgresql+asyncpg://${scaleway_sdb_sql_database.main.endpoint}"
    "SECRET_KEY"   = var.db_password # Reusing for now
    "REDIS_URL"    = "${var.default_username}:${var.redis_password}@${scaleway_redis_cluster.main.public_network[0].ips[0]}:${scaleway_redis_cluster.main.public_network[0].port}"
  }
}

resource "scaleway_container" "frontend" {
  name            = "gift-genie-frontend"
  namespace_id    = scaleway_container_namespace.main.id
  registry_image  = "${scaleway_registry_namespace.main.endpoint}/gift-genie-frontend:latest"
  port            = 80
  cpu_limit       = 560
  memory_limit    = 560
  min_scale       = 1
  max_scale       = 5
  deploy          = true

  environment_variables = {
    "VITE_API_URL" = "https://${scaleway_container.backend.domain_name}"
  }
}

resource "scaleway_container_domain" "frontend" {
  count        = var.custom_domain != null ? 1 : 0
  container_id = scaleway_container.frontend.id
  hostname     = var.custom_domain
}
