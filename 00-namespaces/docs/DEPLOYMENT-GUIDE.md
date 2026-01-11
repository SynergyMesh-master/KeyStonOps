# MCP Level 3 Semantic Control Plane - Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Production Deployment](#production-deployment)
4. [Configuration](#configuration)
5. [Monitoring & Observability](#monitoring--observability)
6. [Troubleshooting](#troubleshooting)
7. [Disaster Recovery](#disaster-recovery)
8. [Security Hardening](#security-hardening)

---

## Prerequisites

### System Requirements

**Minimum:**
- Kubernetes 1.24+
- 3 nodes with 4 CPU cores, 8GB RAM each
- 100GB persistent storage
- Network bandwidth: 1Gbps

**Recommended:**
- Kubernetes 1.27+
- 5 nodes with 8 CPU cores, 16GB RAM each
- 500GB persistent storage (SSD)
- Network bandwidth: 10Gbps

### Required Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
```

### Cloud Provider Setup

**AWS:**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure

# Create S3 bucket for artifacts
aws s3 mb s3://mcp-artifacts --region us-east-1
```

**GCP:**
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Configure credentials
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Create GCS bucket
gsutil mb -l us-east1 gs://mcp-artifacts
```

**Azure:**
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create storage account
az storage account create --name mcpartifacts --resource-group mcp-rg --location eastus
```

---

## Quick Start

### 5-Minute Setup (Development)

```bash
# 1. Clone repository
git clone https://github.com/MachineNativeOps/machine-native-ops.git
cd machine-native-ops/00-namespaces/namespaces-mcp

# 2. Create namespace
kubectl create namespace mcp-system

# 3. Apply configurations
kubectl apply -f k8s/deployment.yaml

# 4. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=mcp-semantic -n mcp-system --timeout=300s

# 5. Port forward to access locally
kubectl port-forward -n mcp-system svc/mcp-semantic-control-plane 8080:80

# 6. Test the deployment
curl http://localhost:8080/health/live
```

---

## Production Deployment

### Step 1: Prepare Environment

```bash
# Create namespace
kubectl create namespace mcp-system

# Create secrets for cloud storage
kubectl create secret generic mcp-storage-credentials \
  --from-literal=access-key-id=YOUR_ACCESS_KEY \
  --from-literal=secret-access-key=YOUR_SECRET_KEY \
  -n mcp-system

# Create TLS certificates (using cert-manager)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Step 2: Configure Storage Backend

**For S3:**
```bash
kubectl patch configmap mcp-semantic-config -n mcp-system --type merge -p '
{
  "data": {
    "storage.backend": "s3",
    "storage.bucket": "mcp-artifacts",
    "storage.region": "us-east-1"
  }
}'
```

**For GCS:**
```bash
kubectl patch configmap mcp-semantic-config -n mcp-system --type merge -p '
{
  "data": {
    "storage.backend": "gcs",
    "storage.bucket": "mcp-artifacts",
    "storage.region": "us-east1"
  }
}'
```

**For Azure:**
```bash
kubectl patch configmap mcp-semantic-config -n mcp-system --type merge -p '
{
  "data": {
    "storage.backend": "azure",
    "storage.bucket": "mcp-artifacts",
    "storage.region": "eastus"
  }
}'
```

### Step 3: Deploy Application

```bash
# Apply all manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/monitoring.yaml

# Verify deployment
kubectl get pods -n mcp-system
kubectl get svc -n mcp-system
kubectl get ingress -n mcp-system
```

### Step 4: Verify Deployment

```bash
# Check pod status
kubectl get pods -n mcp-system -l app=mcp-semantic

# Check logs
kubectl logs -n mcp-system -l app=mcp-semantic --tail=100

# Check health endpoints
kubectl exec -n mcp-system -it $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- curl http://localhost:8081/health/live
kubectl exec -n mcp-system -it $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- curl http://localhost:8081/health/ready

# Check metrics
kubectl exec -n mcp-system -it $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- curl http://localhost:9090/metrics
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production) | `production` | Yes |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` | No |
| `CACHE_SIZE` | Cache size for validation engine | `10000` | No |
| `CACHE_TTL` | Cache TTL in milliseconds | `300000` | No |
| `STORAGE_BACKEND` | Storage backend (s3/gcs/azure/local) | `s3` | Yes |
| `STORAGE_BUCKET` | Storage bucket name | - | Yes |
| `STORAGE_REGION` | Storage region | - | Yes |

### ConfigMap Settings

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-semantic-config
  namespace: mcp-system
data:
  # Storage Configuration
  storage.backend: "s3"
  storage.bucket: "mcp-artifacts"
  storage.region: "us-east-1"
  
  # Validation Engine
  validation.cache.enabled: "true"
  validation.cache.size: "10000"
  validation.cache.ttl: "300000"
  
  # Promotion Engine
  promotion.auto.rollback: "true"
  promotion.rollback.timeout: "30000"
  
  # Artifact Registry
  artifact.deduplication.enabled: "true"
  artifact.compression.enabled: "true"
  artifact.retention.days: "90"
  artifact.max.versions: "10"
```

### Resource Limits

**Development:**
```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 2Gi
```

**Production:**
```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 4Gi
```

**High-Load Production:**
```yaml
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 4000m
    memory: 8Gi
```

---

## Monitoring & Observability

### Prometheus Setup

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace mcp-system \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### Grafana Dashboards

```bash
# Access Grafana
kubectl port-forward -n mcp-system svc/prometheus-grafana 3000:80

# Default credentials
# Username: admin
# Password: prom-operator

# Import dashboards from k8s/monitoring.yaml
```

### Key Metrics to Monitor

**Validation Engine:**
- `validation_total` - Total validations
- `validation_errors_total` - Total validation errors
- `validation_duration_seconds` - Validation duration
- `validation_cache_hit_rate` - Cache hit rate

**Promotion Engine:**
- `promotion_total` - Total promotions
- `promotion_success_total` - Successful promotions
- `promotion_failures_total` - Failed promotions
- `promotion_rollbacks_total` - Total rollbacks
- `promotion_duration_seconds` - Promotion duration

**Artifact Registry:**
- `artifact_uploads_total` - Total uploads
- `artifact_downloads_total` - Total downloads
- `artifact_storage_used_bytes` - Storage used
- `artifact_lookup_duration_seconds` - Lookup duration

### Alerting

Alerts are configured in `k8s/monitoring.yaml`. Key alerts include:

- **Critical:** High failure rates, pod crashes, storage full
- **Warning:** Slow response times, high resource usage
- **Info:** Low cache hit rates, low throughput

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod -n mcp-system -l app=mcp-semantic

# Check events
kubectl get events -n mcp-system --sort-by='.lastTimestamp'

# Check logs
kubectl logs -n mcp-system -l app=mcp-semantic --previous
```

**Common causes:**
- Insufficient resources
- Image pull errors
- Configuration errors
- Storage access issues

#### 2. High Memory Usage

```bash
# Check memory usage
kubectl top pods -n mcp-system

# Increase memory limits
kubectl patch deployment mcp-semantic-control-plane -n mcp-system -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "semantic-control-plane",
          "resources": {
            "limits": {
              "memory": "8Gi"
            }
          }
        }]
      }
    }
  }
}'
```

#### 3. Slow Performance

```bash
# Check metrics
kubectl exec -n mcp-system -it $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- curl http://localhost:9090/metrics | grep duration

# Increase cache size
kubectl patch configmap mcp-semantic-config -n mcp-system --type merge -p '
{
  "data": {
    "validation.cache.size": "50000"
  }
}'

# Restart pods to apply changes
kubectl rollout restart deployment mcp-semantic-control-plane -n mcp-system
```

#### 4. Storage Issues

```bash
# Check storage credentials
kubectl get secret mcp-storage-credentials -n mcp-system -o yaml

# Test storage access
kubectl exec -n mcp-system -it $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- aws s3 ls s3://mcp-artifacts/

# Check storage usage
kubectl exec -n mcp-system -it $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- df -h
```

### Debug Mode

```bash
# Enable debug logging
kubectl patch configmap mcp-semantic-config -n mcp-system --type merge -p '
{
  "data": {
    "LOG_LEVEL": "debug"
  }
}'

# Restart pods
kubectl rollout restart deployment mcp-semantic-control-plane -n mcp-system

# View debug logs
kubectl logs -n mcp-system -l app=mcp-semantic -f
```

---

## Disaster Recovery

### Backup Strategy

**Automated Backups:**
```bash
# Create backup CronJob
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mcp-backup
  namespace: mcp-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: amazon/aws-cli
            command:
            - /bin/sh
            - -c
            - |
              aws s3 sync s3://mcp-artifacts s3://mcp-artifacts-backup/$(date +%Y%m%d)/
          restartPolicy: OnFailure
EOF
```

### Recovery Procedures

**RTO (Recovery Time Objective):** < 15 minutes  
**RPO (Recovery Point Objective):** < 1 hour

**Recovery Steps:**
```bash
# 1. Restore from backup
aws s3 sync s3://mcp-artifacts-backup/YYYYMMDD/ s3://mcp-artifacts/

# 2. Redeploy application
kubectl apply -f k8s/deployment.yaml

# 3. Verify health
kubectl wait --for=condition=ready pod -l app=mcp-semantic -n mcp-system --timeout=300s

# 4. Run smoke tests
kubectl exec -n mcp-system -it $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- curl http://localhost:8081/health/ready
```

### Failover Testing

```bash
# Simulate pod failure
kubectl delete pod -n mcp-system -l app=mcp-semantic --force

# Verify automatic recovery
kubectl get pods -n mcp-system -l app=mcp-semantic -w

# Simulate node failure
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data

# Verify pod rescheduling
kubectl get pods -n mcp-system -l app=mcp-semantic -o wide
```

---

## Security Hardening

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-semantic-netpol
  namespace: mcp-system
spec:
  podSelector:
    matchLabels:
      app: mcp-semantic
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: mcp-system
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443  # HTTPS
    - protocol: TCP
      port: 53   # DNS
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-system
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: mcp-semantic-role
  namespace: mcp-system
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: mcp-semantic-rolebinding
  namespace: mcp-system
subjects:
- kind: ServiceAccount
  name: mcp-semantic
  namespace: mcp-system
roleRef:
  kind: Role
  name: mcp-semantic-role
  apiGroup: rbac.authorization.k8s.io
```

### Security Scanning

```bash
# Scan container images
trivy image mcp/semantic-control-plane:v3.0.0

# Scan Kubernetes manifests
kubesec scan k8s/deployment.yaml

# Run security audit
kubectl-score score k8s/deployment.yaml
```

---

## Performance Tuning

### Optimization Checklist

- [ ] Enable caching (validation engine)
- [ ] Configure appropriate resource limits
- [ ] Enable horizontal pod autoscaling
- [ ] Use SSD storage for artifacts
- [ ] Enable compression and deduplication
- [ ] Configure connection pooling
- [ ] Optimize network bandwidth
- [ ] Enable CDN for artifact downloads

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu

# Run load test
k6 run --vus 100 --duration 5m load-test.js
```

---

## Support & Documentation

- **GitHub:** https://github.com/MachineNativeOps/machine-native-ops
- **Issues:** https://github.com/MachineNativeOps/machine-native-ops/issues
- **Discussions:** https://github.com/MachineNativeOps/machine-native-ops/discussions
- **Documentation:** https://docs.ninjatech.ai/mcp-level3

---

**Last Updated:** 2024-01-10  
**Version:** 3.0.0  
**Maintainer:** NinjaTech AI Team