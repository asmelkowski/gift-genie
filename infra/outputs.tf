output "backend_url" {
  value = "https://${scaleway_container.backend.domain_name}"
}

output "frontend_url" {
  value = "https://${scaleway_container.frontend.domain_name}"
}

output "db_host" {
  value = scaleway_sdb_sql_database.main.endpoint
}

output "frontend_cname_target" {
  description = "Target domain for the CNAME record"
  value       = "${scaleway_container.frontend.domain_name}."
}

output "private_network_details" {
  description = "Private network infrastructure details"
  value = {
    vpc_id     = scaleway_vpc.main.id
    network_id = scaleway_vpc_private_network.main.id
    subnet     = scaleway_vpc_private_network.main.ipv4_subnet[0].subnet
  }
}



output "dns_cname_record" {
  description = "DNS CNAME record configuration (automated via OVH provider)"
  value = var.custom_domain != null ? {
    zone      = var.ovh_zone_name
    subdomain = ""
    type      = "CNAME"
    target    = "${scaleway_container.frontend.domain_name}."
    status    = "Managed by Terraform"
  } : null
}

output "deployed_backend_image_tag" {
  description = "Currently deployed backend image tag"
  value       = var.backend_image_tag
}

output "deployed_frontend_image_tag" {
  description = "Currently deployed frontend image tag"
  value       = var.frontend_image_tag
}
