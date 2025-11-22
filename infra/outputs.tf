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
