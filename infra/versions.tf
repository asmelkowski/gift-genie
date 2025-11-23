terraform {
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = ">= 2.28.0"
    }
    ovh = {
      source  = "ovh/ovh"
      version = "~> 0.36"
    }
  }
  required_version = ">= 0.13"

  backend "s3" {
    bucket = "gift-genie-tofu-state"
    key    = "prod/tofu.tfstate"
    region = "fr-par"
    endpoints = {
      s3 = "https://s3.fr-par.scw.cloud"
    }
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    use_path_style              = true
  }
}

provider "scaleway" {
  zone   = var.zone
  region = var.region
  # Credentials will be picked up from env vars SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_DEFAULT_PROJECT_ID
}

provider "ovh" {
  endpoint           = "ovh-eu"
  application_key    = var.ovh_application_key
  application_secret = var.ovh_application_secret
  consumer_key       = var.ovh_consumer_key
}
