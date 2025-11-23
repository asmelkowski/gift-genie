# Private Network Setup & Deployment

## Overview

### What is the Private Network?

The Gift Genie platform uses a **private network** to enable secure, low-latency communication between containerized applications and Redis within Scaleway's infrastructure. The private network is a dedicated, isolated Layer 2 network that exists within a Virtual Private Cloud (VPC), allowing containers to communicate with Redis without exposing either service to the public internet.

### Why It Was Implemented

The private network was implemented to solve critical connectivity and reliability issues:

1. **Redis Connection Timeouts**: Direct connections from containers to Redis were experiencing timeout issues due to public network routing inconsistencies.

2. **IP Whitelisting Complexity**: Managing firewall rules for ephemeral container IPs on the public network was complex and error-prone.

3. **Security Concerns**: Exposing Redis to the public internet (even with authentication) introduces unnecessary attack surface and network latency.

### Security & Performance Benefits

✅ **Enhanced Security**
- Redis is not exposed to the public internet
- No need to manage public IP whitelisting
- All traffic stays within private infrastructure
- Encrypted communication within the VPC

✅ **Improved Performance**
- Faster, more direct routing between services
- Lower latency compared to public network paths
- Dedicated network resources
- More predictable, consistent performance

✅ **Operational Reliability**
- Eliminates timeout issues from public routing
- Stable private IP addressing for Redis
- Better observability of internal traffic
- Easier debugging and troubleshooting

---

## Architecture

### Private Network Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Scaleway VPC (gift-genie-vpc)          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Private Network (gift-genie-pn)                       │ │
│  │  Subnet: 172.16.0.0/22 (1024 IP addresses)             │ │
│  │                                                         │ │
│  │  ┌──────────────────┐    ┌──────────────────────────┐ │ │
│  │  │                  │    │                          │ │ │
│  │  │  Backend         │    │  Redis Cluster           │ │ │
│  │  │  Container       │◄──►│  (RED1-MICRO node)       │ │ │
│  │  │  172.16.0.x      │    │  172.16.0.y              │ │ │
│  │  │  Port: 8000      │    │  Port: 6379              │ │ │
│  │  │                  │    │                          │ │ │
│  │  └──────────────────┘    └──────────────────────────┘ │ │
│  │          ▲                                              │ │
│  │          │                                              │ │
│  │          └──── Internal only, no public IP             │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Public Internet Access                                │ │
│  │  - Frontend via CDN/Load Balancer                      │ │
│  │  - Backend via Load Balancer                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### IP Addressing Scheme

- **VPC CIDR Block**: `10.0.0.0/16` (Scaleway default)
- **Private Network Subnet**: `172.16.0.0/22`
  - **Total IPs**: 1024 (172.16.0.0 – 172.16.3.255)
  - **Usable IPs**: 1022 (first and last reserved)
  - **Current Usage**: Redis + Backend containers
  - **Future Expansion**: 1000+ IPs available for scaling

### Connected Resources

| Resource | Type | Network | IP Assignment | Notes |
|----------|------|---------|---|---|
| Redis Cluster | Serverless | Private | Dynamic (172.16.0.x) | AUTO, handled by Scaleway |
| Backend Containers | Containers | Private | Dynamic (172.16.0.x) | Namespace attached to private network |
| Frontend Containers | Public + Private | Both | Public IP for HTTP(S) | Uses public network for external access |
| PostgreSQL Database | Serverless SQL | Public | Public endpoint | Not attached to private network |

**Key Detail**: The private network is attached at the **container namespace level** in Scaleway, meaning all containers in the `gift-genie-ns-{env}` namespace automatically gain access to the private network.

---

## Deployment Instructions

### Prerequisites

Before deploying the private network changes, ensure you have:

- ✅ Terraform installed (v1.0+)
- ✅ Scaleway credentials configured (`scw` CLI or environment variables)
- ✅ Access to the `/infra` directory of the repository
- ✅ Ability to apply Terraform changes to production infrastructure
- ✅ Maintenance window scheduled (optional but recommended)

### Step-by-Step Deployment

#### Step 1: Review Terraform Changes

```bash
cd infra/
terraform init
terraform plan -out=private-network.tfplan
```

**Expected output** includes:
- New VPC resource: `scaleway_vpc.main`
- New Private Network: `scaleway_vpc_private_network.main`
- Updated Container Namespace: `scaleway_container_namespace.main`
- Modified Redis configuration: Added `private_network` block
- Updated backend environment variables: `REDIS_URL` changes to private IP

#### Step 2: Verify Plan Details

Review the plan carefully for:

```
# New resources to be created:
+ scaleway_vpc.main
+ scaleway_vpc_private_network.main

# Resources to be modified (in-place):
~ scaleway_container_namespace.main
  - region = "fr-par" -> (known after apply)
  + private_network_id = scaleway_vpc_private_network.main.id

~ scaleway_redis_cluster.main
  ~ private_network[0] (new)

~ scaleway_container.backend
  ~ secret_environment_variables (Redis URL updated)
```

#### Step 3: Apply Terraform

```bash
terraform apply private-network.tfplan
```

**Estimated deployment time**: 5-15 minutes

**What happens during deployment:**

1. **Phase 1** (2-3 min): VPC and private network resources created
2. **Phase 2** (1-2 min): Container namespace attached to private network
3. **Phase 3** (3-5 min): Redis cluster configured for private network access
4. **Phase 4** (5-10 min): Backend containers restart with new Redis URL
5. **Phase 5** (1-2 min): Backend containers reconnect to Redis

### Step 4: Monitor Deployment

Watch the deployment progress:

```bash
# Terminal 1: Watch Terraform
terraform apply

# Terminal 2: Monitor container status
scw container namespace list
scw container list --namespace-id {namespace-id}

# Terminal 3: Monitor logs
scw container logs {container-id} --follow
```

### Step 5: Post-Deployment Verification

See [Testing & Validation](#testing--validation) section below.

### Rollback Instructions

If issues occur, you can roll back the changes (see [Rollback Instructions](#rollback-instructions) section).

---

## Testing & Validation

### 1. Verify Infrastructure Connectivity

#### Check Private Network Created

```bash
scw vpc private-network list
# Should see: gift-genie-pn-{env}
# Status: Available
# Subnet: 172.16.0.0/22
```

#### Check Container Namespace Configuration

```bash
scw container namespace get gift-genie-ns-{env}
# Should show:
# private_network_id: <assigned>
```

#### Check Redis Private Network Configuration

```bash
scw redis cluster get gift-genie-redis-{env}
# Should show:
# private_network:
#   id: <uuid>
#   endpoint_ips: [172.16.0.x]
#   port: 6379
```

### 2. Verify Backend Container Health

#### Check Container Status

```bash
scw container list --namespace-id {namespace-id}
# Expected: gift-genie-backend status = "Ready"
# Expected: gift-genie-frontend status = "Ready"
```

#### Check Container Logs

```bash
scw container logs gift-genie-backend --follow
# Look for messages indicating Redis connection success
# Should NOT see: "Connection refused", "Timeout", "IP whitelist"
# Should see: "Connected to Redis", "Redis healthy"
```

### 3. Use Health Endpoint to Verify Connectivity

The backend exposes a `/health` endpoint that includes Redis connectivity status.

#### Access Health Endpoint

```bash
# Get backend domain
BACKEND_URL=$(scw container get gift-genie-backend --output json | jq -r '.domain_name')

# Check health
curl https://${BACKEND_URL}/health

# Expected response:
# {
#   "status": "healthy",
#   "redis_status": "connected"
# }
```

#### Health Endpoint Details

- **Endpoint**: `GET /health`
- **Response**: JSON with `status` and `redis_status`
- **Status Values**:
  - `healthy`: All services operational
  - `unhealthy`: At least one service unreachable
- **Redis Status Values**:
  - `connected`: Redis is accessible
  - `disconnected`: Redis is unreachable

#### Monitor Health in Production

```bash
# Check health periodically
while true; do
  curl -s https://${BACKEND_URL}/health | jq .
  echo "---"
  sleep 30
done
```

### 4. Test Functionality End-to-End

#### Run a Test Request Through Backend

```bash
# Example: Get user info (requires auth token)
BACKEND_URL=$(scw container get gift-genie-backend --output json | jq -r '.domain_name')
AUTH_TOKEN="your-token"

curl -H "Authorization: Bearer ${AUTH_TOKEN}" \
  https://${BACKEND_URL}/api/me

# Should return 200 with user data
# (or 401 if token is invalid)
```

#### Create a Draw (Tests Redis Caching)

```bash
# POST request to create a draw
curl -X POST https://${BACKEND_URL}/api/groups/{group-id}/draws \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Draw"}'

# Verify:
# - Draw is created (201 response)
# - No errors in logs about Redis
```

### 5. Validate Logs for Connection Issues

#### Check Backend Logs

```bash
scw container logs gift-genie-backend --tail 100

# Look for:
✅ "Redis connected"
✅ "Health check passed"
❌ "Connection refused"
❌ "Timeout"
❌ "ip whitelist" or "firewall"
```

#### Check Redis Status

```bash
scw redis cluster logs gift-genie-redis-{env}

# Should show:
✅ Accepting connections
✅ Client connected
❌ Connection refused
❌ Authentication failures (shouldn't happen with correct password)
```

### 6. Performance Validation

#### Measure Redis Response Times

```bash
# The health endpoint will now use private network
# Monitor response times
time curl -s https://${BACKEND_URL}/health > /dev/null

# Expected: < 100ms
# Previous: Often 1000ms+ on public network
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Backend Containers Can't Connect to Redis

**Symptoms**:
- Health endpoint returns: `"redis_status": "disconnected"`
- Logs show: `"Connection refused"` or `"Timeout"`
- Drawing operations fail with timeout errors

**Debugging Steps**:

```bash
# 1. Verify container is in the private network
scw container get gift-genie-backend --output json | \
  jq '.namespace_id'

# 2. Verify namespace has private network
scw container namespace get gift-genie-ns-{env} --output json | \
  jq '.private_network_id'

# 3. Verify Redis is accessible via private network
scw redis cluster get gift-genie-redis-{env} --output json | \
  jq '.private_network'

# 4. Check container logs for specific error
scw container logs gift-genie-backend --tail 50
```

**Solutions**:

- **If namespace lacks private_network_id**:
  ```bash
  cd infra/
  terraform apply
  # Re-apply Terraform to attach private network to namespace
  ```

- **If Redis shows no private_network**:
  ```bash
  cd infra/
  terraform apply
  # Re-apply to add private network to Redis
  ```

- **If REDIS_URL environment variable is wrong**:
  ```bash
  # Verify the Redis endpoint from Terraform output
  terraform output redis_private_endpoint

  # Check backend container env var
  scw container get gift-genie-backend --output json | \
    jq '.secret_environment_variables.REDIS_URL'
  ```

#### Issue 2: Container Restart Loops

**Symptoms**:
- Backend container keeps restarting
- Frontend can't connect to backend
- Container status is "Error"

**Debugging Steps**:

```bash
# Check container status and error
scw container get gift-genie-backend --output json | \
  jq '.status, .error_message'

# Get recent logs
scw container logs gift-genie-backend --tail 20
```

**Solutions**:

- **If error is about REDIS_URL format**:
  ```bash
  # Format should be: username:password@private-ip:port
  # Verify in Terraform:
  terraform output redis_private_endpoint

  # Check backend configuration
  scw container get gift-genie-backend \
    --output json | jq -r \
    '.secret_environment_variables.REDIS_URL'
  ```

- **If container is timing out during startup**:
  ```bash
  # Increase timeout in Terraform
  # compute.tf: timeout = 600 (10 minutes)

  # Apply change
  terraform apply
  ```

#### Issue 3: Frontend Can't Reach Backend

**Symptoms**:
- Frontend shows "Connection refused" or "Network error"
- API calls fail with 502/503

**Note**: This is NOT related to private network (frontend uses public internet)

**Debugging**:

```bash
# Check frontend can resolve backend DNS
scw container get gift-genie-backend --output json | \
  jq '.domain_name'

# From local machine, test DNS resolution
nslookup gift-genie-backend-{uuid}.containers.sbg.scwcontainers.cloud

# Test HTTP connection
curl -v https://gift-genie-backend-{uuid}.containers.sbg.scwcontainers.cloud/health
```

#### Issue 4: High Latency Despite Private Network

**Symptoms**:
- Health endpoint still shows 500ms+ response times
- Redis operations are slow

**Debugging**:

```bash
# Check container region and Redis region
terraform output -json | jq '.region'

# Verify they match
scw redis cluster get gift-genie-redis-{env} --output json | \
  jq '.zone'

# Check for network congestion
scw container logs gift-genie-backend --tail 50 | \
  grep -i "slow\|latency\|timeout"
```

**Solutions**:

- **If regions don't match**: Change Terraform to use same region
- **If still slow**: May indicate infrastructure issue; contact Scaleway support

### Accessing Logs

#### Container Logs

```bash
# Real-time logs
scw container logs gift-genie-backend --follow

# Last 100 lines
scw container logs gift-genie-backend --tail 100

# Specific time range
scw container logs gift-genie-backend \
  --since 2024-01-15T10:00:00Z \
  --until 2024-01-15T11:00:00Z
```

#### Redis Logs

```bash
# Get Redis cluster logs
scw redis cluster logs gift-genie-redis-{env}

# Watch for:
scw redis cluster logs gift-genie-redis-{env} | \
  grep -i "client\|auth\|connect"
```

#### Terraform Logs (if debugging)

```bash
# Enable detailed logging
export TF_LOG=DEBUG
terraform apply
```

---

## Developer Access (Future)

### Current Limitation

**Local development cannot directly access Redis on the private network.** Redis is no longer available on the public network and is only accessible to containers within the private network.

### Current Workarounds

#### Option 1: Use Docker Compose Locally

Continue using Docker Compose for local development (completely isolated from production):

```bash
cd /path/to/gift-genie
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

**Advantages**:
- Complete isolation from production
- Predictable, fast local environment
- No network dependencies

#### Option 2: Connect Through SSH Tunnel (Not Yet Implemented)

For accessing production Redis from local machine:

```bash
# Step 1: Identify a resource accessible via SSH (bastion/jump host)
# Step 2: Set up SSH tunnel through bastion
# Step 3: Connect to Redis through tunnel

# Example (once bastion is configured):
ssh -L 6379:172.16.0.x:6379 bastion-host
redis-cli -h localhost -p 6379 -a password ping
```

**Current Status**: Not yet configured. Requires:
- Bastion host setup
- SSH key management
- Security policy approval

### Future: VPN Access (Planned)

A future enhancement could provide VPN access to the private network for developers:

```
Developer Machine
    ↓ (VPN tunnel)
Scaleway VPN Gateway
    ↓
Private Network (172.16.0.0/22)
    ↓
Redis, Containers
```

**Benefits**:
- Direct access to private network resources
- Easier debugging and monitoring
- No SSH tunneling complexity

**Timeline**: To be determined based on team needs

### Recommended Approach for Now

**Use local Docker Compose for development**:

```bash
# Local development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Local testing with test data
docker compose exec backend pytest

# Integration testing
docker compose up -d
npm run e2e --workspace=frontend
```

This approach:
- ✅ Requires no changes to production infrastructure
- ✅ Provides instant feedback
- ✅ Works offline
- ✅ Avoids network dependencies
- ✅ Matches Scaleway production architecture (containers + Redis)

---

## Rollback Instructions

### When to Rollback

Consider rollback if:

- ❌ Backend containers continuously fail to connect to Redis
- ❌ Production traffic is significantly impacted
- ❌ Health checks show `redis_status: "disconnected"`
- ❌ Multiple retry/fix attempts have failed

### Rollback Steps

#### Step 1: Create Rollback Plan

```bash
cd infra/

# Review changes that will be reverted
git log --oneline -5
git diff HEAD~1 network.tf compute.tf db.tf

# Create backup of current state
terraform state pull > terraform.state.backup.$(date +%s).json
```

#### Step 2: Revert Terraform Changes

```bash
# Option A: Using Git (if changes are in version control)
git revert HEAD --no-edit
git push origin main
terraform plan

# Option B: Manual removal (if not in version control yet)
# Remove private_network configuration from:
# - network.tf
# - compute.tf (namespace private_network_id)
# - db.tf (Redis private_network block)

terraform plan
```

#### Step 3: Review Rollback Plan

```bash
terraform plan -out=rollback.tfplan

# Expected changes:
# - Remove: scaleway_vpc_private_network.main
# - Remove: scaleway_vpc.main
# - Modify: Container namespace (remove private_network_id)
# - Modify: Redis (remove private_network)
# - Modify: Backend (REDIS_URL reverts to public endpoint)
```

#### Step 4: Apply Rollback

```bash
terraform apply rollback.tfplan
```

**Estimated time**: 5-10 minutes

**What happens**:

1. **Phase 1** (1-2 min): Private network detached from container namespace
2. **Phase 2** (1-2 min): Redis reverts to public network endpoint
3. **Phase 3** (3-5 min): Backend containers restart with public Redis URL
4. **Phase 4** (1-2 min): Services reconnect using public network
5. **Phase 5** (1-2 min): VPC and private network resources cleaned up

#### Step 5: Verify Rollback

```bash
# Check backend is healthy on public network
BACKEND_URL=$(scw container get gift-genie-backend --output json | jq -r '.domain_name')
curl https://${BACKEND_URL}/health

# Verify logs show public Redis connection
scw container logs gift-genie-backend --tail 20

# Check Redis is accessible
terraform output redis_endpoint
# Should show public IP:port format
```

### Impact of Rollback

| Aspect | Impact |
|--------|--------|
| **Uptime** | Brief (~10 min) container restarts |
| **Data Loss** | None - persistent volumes unchanged |
| **User Sessions** | Cleared (Redis state lost) - users may need to re-login |
| **Databases** | Unchanged (PostgreSQL unaffected) |
| **DNS** | No change (existing domains still work) |
| **Performance** | Returns to previous public network latency |

### Post-Rollback Communication

If rollback occurs in production:

1. **Notify team** of rollback reason
2. **Document** what went wrong in incident report
3. **Plan** corrective actions before re-deploying
4. **Test** thoroughly in staging before retry

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **VPC** | gift-genie-vpc-{env} |
| **Private Network** | gift-genie-pn-{env} |
| **Subnet** | 172.16.0.0/22 (1024 IPs) |
| **Connected Resources** | Backend containers, Redis cluster |
| **Isolation** | Layer 2 within Scaleway infrastructure |
| **Deployment Time** | ~10-15 minutes |
| **Rollback Time** | ~5-10 minutes |
| **Key Benefit** | Eliminates Redis timeout issues |
| **Security** | Redis not exposed to public internet |

---

## Additional Resources

### Scaleway Documentation

- [VPC Documentation](https://www.scaleway.com/en/docs/network/vpc/)
- [Private Networks Guide](https://www.scaleway.com/en/docs/network/vpc/concepts/#private-networks)
- [Redis Cluster Documentation](https://www.scaleway.com/en/docs/managed-databases/redis/concepts/)
- [Containers Documentation](https://www.scaleway.com/en/docs/serverless/containers/)

### Gift Genie Project Documentation

- [DOCKER.md](./DOCKER.md) - Local Docker setup
- [README.docker.md](./README.docker.md) - Docker quick start
- [infra/network.tf](./infra/network.tf) - Private network Terraform code
- [infra/compute.tf](./infra/compute.tf) - Container configuration
- [infra/db.tf](./infra/db.tf) - Redis and database configuration

### Troubleshooting Resources

- [Scaleway Support](https://www.scaleway.com/en/docs/console/account/how-to/open-a-support-ticket/)
- Backend logs: `scw container logs gift-genie-backend --follow`
- Redis logs: `scw redis cluster logs gift-genie-redis-{env}`

---

**Last Updated**: November 2024
**Maintained By**: DevOps Team
**Status**: Active (Production Deployment)
