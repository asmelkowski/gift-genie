resource "scaleway_container_namespace" "main" {
  name        = "gift-genie-ns-${var.env}"
  description = "Namespace for Gift Genie ${var.env}"
  region      = var.region
}

resource "scaleway_container" "backend" {
  name               = "gift-genie-backend"
  namespace_id       = scaleway_container_namespace.main.id
  registry_image     = "${scaleway_registry_namespace.main.endpoint}/gift-genie-backend:${var.backend_image_tag}"
  port               = 8000
  cpu_limit          = 280 # Reduced from 560 - sufficient for most workloads
  memory_limit       = 280 # Reduced from 560 - sufficient for most workloads
  min_scale          = 0   # Scale to zero when idle - MAJOR COST SAVINGS
  max_scale          = 3   # Reduced from 5 - sufficient for traffic spikes
  timeout            = 300 # Reduced from 600 - 5 minutes is plenty
  deploy             = true
  private_network_id = scaleway_vpc_private_network.main.id

  environment_variables = {
    "ENV"   = var.env
    "DEBUG" = "false"
    # Fixed CORS: Allow custom domain and www subdomain
    # Note: Scaleway container domains are added dynamically via wildcard or explicit allow
    "CORS_ORIGINS" = var.custom_domain != null ? join(",", [
      "https://${var.custom_domain}",
      "https://www.${var.custom_domain}"
    ]) : "*"
    "COOKIE_SECURE" = "true"
  }

    secret_environment_variables = {
      # Scaleway SDB with IAM-based authentication
      # Reuses the same Scaleway credentials that Terraform uses for infrastructure management
      # The gift-genie IAM application has ServerlessSQLDatabaseFullAccess permissions
      # Username: Scaleway Access Key (SCW_ACCESS_KEY)
      # Password: Scaleway Secret Key (SCW_SECRET_KEY)
      # Endpoint: Database endpoint with postgres:// prefix stripped
      # Backend adds postgresql+asyncpg:// scheme in settings.py
      # Password is URL-encoded to handle special characters in API key
      "DATABASE_URL" = "${var.scw_access_key}:${urlencode(var.scw_secret_key)}@${replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")}?sslmode=require"

      # SECRET_KEY for JWT signing
      "SECRET_KEY" = var.secret_key
    }
}

resource "scaleway_container" "frontend" {
  name           = "gift-genie-frontend"
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "${scaleway_registry_namespace.main.endpoint}/gift-genie-frontend:${var.frontend_image_tag}"
  port           = 80
  cpu_limit      = 280 # Reduced from 560 - serving static files needs less
  memory_limit   = 280 # Reduced from 560 - sufficient for nginx
  min_scale      = 0   # Scale to zero when idle - MAJOR COST SAVINGS
  max_scale      = 3   # Reduced from 5 - sufficient for traffic spikes
  deploy         = true

  environment_variables = {
    "VITE_API_URL" = var.custom_domain != null ? "https://api.${var.custom_domain}" : "https://${scaleway_container.backend.domain_name}"
    "BACKEND_URL"  = var.custom_domain != null ? "https://api.${var.custom_domain}" : "https://${scaleway_container.backend.domain_name}"
  }
}

resource "scaleway_container_domain" "frontend" {
  count        = var.custom_domain != null ? 1 : 0
  container_id = scaleway_container.frontend.id
  hostname     = var.custom_domain
}

resource "scaleway_container_domain" "backend" {
  count        = var.custom_domain != null ? 1 : 0
  container_id = scaleway_container.backend.id
  hostname     = "api.${var.custom_domain}"
}
