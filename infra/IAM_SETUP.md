# Scaleway IAM Setup Guide for Database Access

This guide walks you through the one-time setup of IAM credentials for Scaleway Serverless SQL Database authentication.

## Why Manual IAM Setup?

Scaleway uses different token types:
- **Project tokens**: Manage resources (databases, containers, networks)
- **Organization tokens**: Manage IAM resources (applications, policies)

To avoid managing two separate tokens in Terraform, we create IAM resources manually once and pass the credentials as variables.

## Prerequisites

- Scaleway CLI installed (`scw`)
- Scaleway account with organization access
- Your project ID (get with: `scw account project list`)

## Step-by-Step Setup

### 1. Get Your Organization ID

```bash
scw account organization list
```

Save the organization ID - you'll need it for the next steps.

### 2. Create IAM Application

The IAM application acts as the "service account" for database access.

```bash
scw iam application create \
  name=gift-genie-db-app-prod \
  description="IAM application for Gift Genie database access"
```

**Output**: Save the `id` field as `IAM_APPLICATION_ID`

Example output:
```
ID                                     gift-genie-db-app-prod
OrganizationID                         xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Name                                   gift-genie-db-app-prod
Description                            IAM application for Gift Genie database access
CreatedAt                              now
UpdatedAt                              now
```

### 3. Create IAM API Key

The API key provides the credentials (username/password) for database authentication.

```bash
scw iam api-key create \
  application-id=<IAM_APPLICATION_ID> \
  description="Database access credentials for gift-genie backend prod"
```

**Output**: Save both values:
- `access_key` → Use as `DB_IAM_APPLICATION_ID` (this is the database username)
- `secret_key` → Use as `DB_IAM_SECRET_KEY` (this is the database password)

⚠️ **Important**: The `secret_key` is only shown once! Save it immediately.

Example output:
```
AccessKey                              SCWxxxxxxxxxxxxxxxxx
SecretKey                              xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  ← SAVE THIS!
ApplicationID                          xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Description                            Database access credentials for gift-genie backend prod
CreatedAt                              now
UpdatedAt                              now
```

### 4. Create IAM Policy

The policy grants the IAM application permission to access your database.

```bash
# First, get your project ID
scw account project list

# Then create the policy
scw iam policy create \
  name=gift-genie-db-policy-prod \
  description="Grant ServerlessSQLDatabase access to gift-genie backend" \
  application-id=<IAM_APPLICATION_ID> \
  rules.0.project-ids.0=<YOUR_PROJECT_ID> \
  rules.0.permission-set-names.0=ServerlessSQLDatabaseReadWrite
```

**Output**: Confirms the policy was created successfully.

## Configure Terraform

### For Local Development

Add to your `infra/terraform.tfvars` file:

```hcl
db_iam_application_id = "SCWxxxxxxxxxxxxxxxxx"  # From step 3 (access_key)
db_iam_secret_key     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # From step 3 (secret_key)
```

Or export as environment variables:

```bash
export TF_VAR_db_iam_application_id="SCWxxxxxxxxxxxxxxxxx"
export TF_VAR_db_iam_secret_key="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### For GitHub Actions

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Value |
|-------------|-------|
| `DB_IAM_APPLICATION_ID` | The `access_key` from step 3 |
| `DB_IAM_SECRET_KEY` | The `secret_key` from step 3 |

## Verification

Test that the credentials work:

```bash
# After Terraform creates the database, test connection
psql "postgresql://$DB_IAM_APPLICATION_ID:$DB_IAM_SECRET_KEY@<db-endpoint>/postgres?sslmode=require"
```

## Troubleshooting

### Error: "permission denied"
- Verify the IAM policy was created correctly
- Check that the policy references the correct project ID
- Ensure the permission set is `ServerlessSQLDatabaseReadWrite`

### Error: "authentication failed"
- Verify you're using the correct `access_key` and `secret_key` from step 3
- Ensure the secret_key wasn't truncated when copying

### Need to rotate credentials?
1. Create a new API key (step 3)
2. Update GitHub secrets and/or terraform.tfvars
3. Deploy/run Terraform
4. Delete the old API key: `scw iam api-key delete <old-key-id>`

## Summary

After completing this setup:
- ✅ IAM Application created (service account)
- ✅ IAM API Key created (credentials)
- ✅ IAM Policy created (permissions)
- ✅ Credentials configured in Terraform/GitHub

These resources are **permanent** and don't need to be recreated unless you need to rotate credentials.
