#!/bin/bash

# Terraform S3 Backend Initialization Script
# This script maps Scaleway credentials to AWS environment variables
# required by Terraform's S3 backend for Scaleway Object Storage.

set -e

echo "🔧 Initializing Terraform with Scaleway Object Storage backend..."

# Check if Scaleway credentials are set
if [ -z "$SCALEWAY_ACCESS_KEY" ]; then
    echo "❌ Error: SCALEWAY_ACCESS_KEY is not set"
    echo "Please export your Scaleway credentials:"
    echo "  export SCALEWAY_ACCESS_KEY=your_access_key"
    echo "  export SCALEWAY_SECRET_KEY=your_secret_key"
    exit 1
fi

if [ -z "$SCALEWAY_SECRET_KEY" ]; then
    echo "❌ Error: SCALEWAY_SECRET_KEY is not set"
    echo "Please export your Scaleway credentials:"
    echo "  export SCALEWAY_ACCESS_KEY=your_access_key"
    echo "  export SCALEWAY_SECRET_KEY=your_secret_key"
    exit 1
fi

# Map SCALEWAY_* to SCW_* variables that the Scaleway provider expects
export SCW_ACCESS_KEY="$SCALEWAY_ACCESS_KEY"
export SCW_SECRET_KEY="$SCALEWAY_SECRET_KEY"
export SCW_DEFAULT_PROJECT_ID="$SCALEWAY_DEFAULT_PROJECT_ID"

# Map Scaleway credentials to AWS environment variables for Terraform S3 backend
export AWS_ACCESS_KEY_ID="$SCALEWAY_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SCALEWAY_SECRET_KEY"
export AWS_REGION="pl-waw"

echo "✅ Credentials mapped successfully"
echo "📦 Running terraform init..."

# Run terraform init
tofu init -reconfigure

echo "✅ Terraform has been successfully initialized!"
