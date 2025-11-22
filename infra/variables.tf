variable "project_id" {
  description = "Scaleway Project ID"
  type        = string
}

variable "region" {
  description = "Scaleway Region"
  type        = string
  default     = "pl-waw"
}

variable "zone" {
  description = "Scaleway Zone"
  type        = string
  default     = "pl-waw-1"
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
  description = "Password for the managed Redis cluster"
  type        = string
  sensitive   = true
}
