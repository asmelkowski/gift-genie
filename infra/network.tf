resource "scaleway_vpc" "main" {
  name   = "gift-genie-vpc-${var.env}"
  region = var.region
  tags   = ["gift-genie", var.env]
}

resource "scaleway_vpc_private_network" "main" {
  name   = "gift-genie-pn-${var.env}"
  vpc_id = scaleway_vpc.main.id
  region = var.region
  ipv4_subnet {
    subnet = "172.16.0.0/22"
  }
  tags = ["gift-genie", var.env]
}

output "private_network_id" {
  description = "Private network ID for container communication"
  value       = scaleway_vpc_private_network.main.id
}
