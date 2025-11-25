variable "project_id" {
  description = "Scaleway Project ID"
  type        = string
}

variable "region" {
  description = "Scaleway Region"
  type        = string
  default     = "fr-par"
}

variable "zone" {
  description = "Scaleway Zone"
  type        = string
  default     = "fr-par-1"
}

variable "env" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
  default     = "prod"
}

variable "db_password" {
  description = "Password for the managed database"
  type        = string
  sensitive   = true
}

variable "custom_domain" {
  description = "Custom domain for the frontend (e.g. gift-genie.eu)"
  type        = string
  default     = null
}

variable "redis_password" {
  description = "DEPRECATED: No longer used. Kept for backward compatibility during migration."
  type        = string
  sensitive   = true
  default     = ""
}

variable "default_username" {
  description = "Default username for managed services (Redis, databases, etc.)"
  type        = string
  default     = "gift_genie"
}

variable "ovh_application_key" {
  description = "OVH API application key"
  type        = string
  sensitive   = true
}

variable "ovh_application_secret" {
  description = "OVH API application secret"
  type        = string
  sensitive   = true
}

variable "ovh_consumer_key" {
  description = "OVH API consumer key"
  type        = string
  sensitive   = true
}

variable "ovh_zone_name" {
  description = "OVH DNS zone name (e.g., gift-genie.eu)"
  type        = string
  default     = "gift-genie.eu"
}
