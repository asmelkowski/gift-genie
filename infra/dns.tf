# Configure CNAME record for custom domain to point to Scaleway frontend
resource "ovh_domain_zone_record" "frontend_cname" {
  count = var.custom_domain != null ? 1 : 0

  zone      = var.ovh_zone_name
  subdomain = "www"
  fieldtype = "CNAME"
  ttl       = 300 # 5 minutes TTL for faster updates during testing
  target    = scaleway_container.frontend.domain_name
}

resource "ovh_domain_zone_record" "backend_cname" {
  count = var.custom_domain != null ? 1 : 0

  zone      = var.ovh_zone_name
  subdomain = "api"
  fieldtype = "CNAME"
  ttl       = 300
  target    = scaleway_container.backend.domain_name
}

resource "ovh_domain_zone_redirection" "root_to_www" {
  count = var.custom_domain != null ? 1 : 0

  zone      = var.ovh_zone_name
  subdomain = ""
  type      = "visiblePermanent"
  target    = "https://www.${var.custom_domain}"
}

# Optional: Add TXT record for domain verification if needed
resource "ovh_domain_zone_record" "frontend_txt_verification" {
  count = var.custom_domain != null ? 1 : 0

  zone      = var.ovh_zone_name
  subdomain = "_scaleway-verification"
  fieldtype = "TXT"
  ttl       = 300
  target    = "scaleway-verification=${scaleway_container.frontend.id}"
}
