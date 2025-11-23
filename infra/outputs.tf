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

output "redis_connection_info" {
  description = "Redis connection information for application configuration"
  value = {
    private_endpoint = "${one(scaleway_redis_cluster.main.private_network).endpoint_ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
    note             = "Accessible only from containers in the private network"
  }
}
