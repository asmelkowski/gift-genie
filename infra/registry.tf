resource "scaleway_registry_namespace" "main" {
  name        = "gift-genie-${var.env}"
  description = "Registry for Gift Genie ${var.env} images"
  region      = var.region
  is_public   = false
}

output "registry_endpoint" {
  value = scaleway_registry_namespace.main.endpoint
}
