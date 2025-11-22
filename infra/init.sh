#!/bin/bash

# Terraform S3 Backend Initialization Script
# This script maps Scaleway credentials to AWS environment variables
# required by Terraform's S3 backend for Scaleway Object Storage.

set -e

echo "🔧 Initializing Terraform with Scaleway Object Storage backend..."

# Check if Scaleway credentials are set
if [ -z "$SCW_ACCESS_KEY" ]; then
    echo "❌ Error: SCW_ACCESS_KEY is not set"
    echo "Please export your Scaleway credentials:"
    echo "  export SCW_ACCESS_KEY=your_access_key"
    echo "  export SCW_SECRET_KEY=your_secret_key"
    exit 1
fi

if [ -z "$SCW_SECRET_KEY" ]; then
    echo "❌ Error: SCW_SECRET_KEY is not set"
    echo "Please export your Scaleway credentials:"
    echo "  export SCW_ACCESS_KEY=your_access_key"
    echo "  export SCW_SECRET_KEY=your_secret_key"
    exit 1
fi

# Map Scaleway credentials to AWS environment variables for Terraform S3 backend
export AWS_ACCESS_KEY_ID="$SCW_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SCW_SECRET_KEY"

echo "✅ Credentials mapped successfully"
echo "📦 Running terraform init..."

# Run terraform init
terraform init

echo "✅ Terraform has been successfully initialized!"
