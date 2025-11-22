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
