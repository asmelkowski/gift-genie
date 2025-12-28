# Extract database ID (UUID) from Scaleway SDB endpoint for SNI requirement
# Endpoint format: postgres://UUID.pg.sdb.fr-par.scw.cloud:5432/rdb
# Scaleway SDB requires "options=databaseid={uuid}" parameter for TLS SNI
locals {
  # Extract host:port/db part from endpoint (remove postgres:// prefix)
  db_connection_string_raw = replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")

  # Split to remove any existing query parameters (e.g., ?sslmode=require)
  # This prevents duplication when we manually add parameters below
  db_connection_string_parts = split("?", local.db_connection_string_raw)
  db_connection_string_clean = local.db_connection_string_parts[0]

  # Extract database ID (UUID before first dot in hostname)
  database_id = regex("^([^.]+)\\.", local.db_connection_string_clean)[0]
}

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
    "COOKIE_SECURE"         = "true"
    "DATABASE_SSL_REQUIRED" = "true"
    "SMTP_HOST"             = "smtp.tem.scaleway.com"
    "SMTP_PORT"             = "587"
    "SMTP_FROM"             = var.smtp_from
  }

  secret_environment_variables = {
    # Scaleway SDB with IAM-based authentication using two separate database URLs:
    # 1. DATABASE_URL: For async FastAPI runtime (asyncpg driver)
    #    - Uses postgresql+asyncpg:// scheme
    #    - No query parameters (SSL handled via Python ssl module based on DATABASE_SSL_REQUIRED)
    #    - Credentials: Scaleway Access Key (username) + Secret Key (password)
    # 2. DATABASE_URL_SYNC: For Alembic migrations (psycopg2 driver)
    #    - Uses postgresql:// scheme
    #    - Includes ?sslmode=require&options=databaseid=... (libpq handles SSL/SNI)
    #    - Database ID from Scaleway SDB endpoint UUID for TLS SNI
    # Password is URL-encoded to handle special characters in API key

    # Async runtime database URL (FastAPI with asyncpg)
    # Note: We use the clean connection string to avoid auto-included params like sslmode
    "DATABASE_URL" = "postgresql+asyncpg://${var.db_iam_principal_id}:${urlencode(var.scw_secret_key)}@${local.db_connection_string_clean}"

    # Sync database URL (Alembic migrations with psycopg2)
    # Note: We append parameters with ? since we stripped any existing ones
    "DATABASE_URL_SYNC" = "postgresql://${var.db_iam_principal_id}:${urlencode(var.scw_secret_key)}@${local.db_connection_string_clean}?sslmode=require&options=databaseid%3D${local.database_id}"

    # SECRET_KEY for JWT signing
    "SECRET_KEY" = var.secret_key

    # SMTP credentials
    "SMTP_USER"     = var.smtp_user
    "SMTP_PASSWORD" = var.smtp_password
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
  hostname     = "www.${var.custom_domain}"
}

resource "scaleway_container_domain" "backend" {
  count        = var.custom_domain != null ? 1 : 0
  container_id = scaleway_container.backend.id
  hostname     = "api.${var.custom_domain}"
}
