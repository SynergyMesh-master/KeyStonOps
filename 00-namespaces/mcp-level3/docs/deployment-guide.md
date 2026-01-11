# MCP Level 3 - Deployment Guide

> **⚠️ SECURITY NOTICE:**  
> This guide contains placeholder values like `<YOUR_SECURE_PASSWORD>` and `<YOUR_JWT_SECRET>`.  
> **NEVER use these placeholders or simple passwords like "changeme" in production.**  
> Always replace them with strong, randomly generated passwords and secrets.  
> Use a password manager or secret management tool (like HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets) to generate and store production credentials securely.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Cloud Provider Deployments](#cloud-provider-deployments)
5. [Configuration](#configuration)
6. [Scaling](#scaling)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup and Recovery](#backup-and-recovery)
9. [Security Hardening](#security-hardening)
10. [Production Checklist](#production-checklist)

---

## Prerequisites

### System Requirements

**Minimum Requirements:**
- Kubernetes 1.24+
- 16 CPU cores
- 64 GB RAM
- 500 GB storage
- PostgreSQL 14+
- Redis 7+

**Recommended for Production:**
- Kubernetes 1.27+
- 32+ CPU cores
- 128+ GB RAM
- 2+ TB storage (SSD)
- PostgreSQL 15+ (with replication)
- Redis 7+ (cluster mode)
- Vector Database (Pinecone/Weaviate)
- Graph Database (Neo4j)

### Required Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace mcp-system
kubectl label namespace mcp-system istio-injection=enabled
```

### 2. Install Dependencies

#### PostgreSQL (Metadata Database)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgresql bitnami/postgresql \
  --namespace mcp-system \
  --set auth.postgresPassword=<YOUR_SECURE_PASSWORD> \
  --set primary.persistence.size=100Gi \
  --set readReplicas.replicaCount=2
```

#### Redis (Cache)

```bash
helm install redis bitnami/redis \
  --namespace mcp-system \
  --set auth.password=<YOUR_SECURE_PASSWORD> \
  --set cluster.enabled=true \
  --set cluster.nodes=6 \
  --set persistence.size=50Gi
```

#### Neo4j (Graph Database)

```bash
helm repo add neo4j https://helm.neo4j.com/neo4j
helm install neo4j neo4j/neo4j \
  --namespace mcp-system \
  --set neo4j.password=<YOUR_SECURE_PASSWORD> \
  --set volumes.data.mode=defaultStorageClass \
  --set volumes.data.defaultStorageClass.requests.storage=200Gi
```

#### MinIO (Object Storage)

```bash
helm repo add minio https://charts.min.io/
helm install minio minio/minio \
  --namespace mcp-system \
  --set rootUser=admin \
  --set rootPassword=<YOUR_SECURE_PASSWORD> \
  --set persistence.size=1Ti \
  --set replicas=4
```

### 3. Configure Secrets

```bash
# Create secrets
kubectl create secret generic mcp-secrets \
  --namespace mcp-system \
  --from-literal=postgres-password=<YOUR_SECURE_PASSWORD> \
  --from-literal=redis-password=<YOUR_SECURE_PASSWORD> \
  --from-literal=neo4j-password=<YOUR_SECURE_PASSWORD> \
  --from-literal=minio-access-key=admin \
  --from-literal=minio-secret-key=<YOUR_SECURE_PASSWORD> \
  --from-literal=jwt-secret=<YOUR_JWT_SECRET>
```

### 4. Create ConfigMap

```yaml
# mcp-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-config
  namespace: mcp-system
data:
  # Database connections
  POSTGRES_HOST: "postgresql.mcp-system.svc.cluster.local"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "mcp"
  
  REDIS_HOST: "redis-master.mcp-system.svc.cluster.local"
  REDIS_PORT: "6379"
  
  NEO4J_HOST: "neo4j.mcp-system.svc.cluster.local"
  NEO4J_PORT: "7687"
  
  MINIO_ENDPOINT: "minio.mcp-system.svc.cluster.local:9000"
  MINIO_BUCKET: "mcp-artifacts"
  
  # Engine configuration
  RAG_ENGINE_REPLICAS: "3"
  DAG_ENGINE_REPLICAS: "3"
  GOVERNANCE_ENGINE_REPLICAS: "2"
  TAXONOMY_ENGINE_REPLICAS: "2"
  EXECUTION_ENGINE_REPLICAS: "3"
  VALIDATION_ENGINE_REPLICAS: "2"
  PROMOTION_ENGINE_REPLICAS: "2"
  REGISTRY_REPLICAS: "3"
  
  # Performance tuning
  MAX_CONNECTIONS: "100"
  CONNECTION_TIMEOUT: "30"
  REQUEST_TIMEOUT: "60"
  
  # Logging
  LOG_LEVEL: "INFO"
  LOG_FORMAT: "json"
```

```bash
kubectl apply -f mcp-config.yaml
```

### 5. Deploy MCP Level 3

```bash
# Add MCP Helm repository
helm repo add mcp https://charts.mcp.io
helm repo update

# Create values file
cat > values.yaml <<EOF
global:
  storageClass: "fast-ssd"
  
engines:
  rag:
    replicas: 3
    resources:
      requests:
        cpu: "2"
        memory: "8Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
    autoscaling:
      enabled: true
      minReplicas: 3
      maxReplicas: 10
      targetCPUUtilizationPercentage: 70
  
  dag:
    replicas: 3
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
  
  governance:
    replicas: 2
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
  
  taxonomy:
    replicas: 2
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
  
  execution:
    replicas: 3
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
  
  validation:
    replicas: 2
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
  
  promotion:
    replicas: 2
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
  
  registry:
    replicas: 3
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: mcp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: mcp-tls
      hosts:
        - mcp.example.com

monitoring:
  prometheus:
    enabled: true
  grafana:
    enabled: true
  jaeger:
    enabled: true

persistence:
  enabled: true
  storageClass: "fast-ssd"
  size: 100Gi
EOF

# Install MCP Level 3
helm install mcp-level3 mcp/mcp-level3 \
  --namespace mcp-system \
  --values values.yaml \
  --wait \
  --timeout 10m
```

### 6. Verify Deployment

```bash
# Check pod status
kubectl get pods -n mcp-system

# Check services
kubectl get svc -n mcp-system

# Check ingress
kubectl get ingress -n mcp-system

# Test health endpoints
kubectl run curl --image=curlimages/curl -i --rm --restart=Never -- \
  curl http://rag-engine.mcp-system.svc.cluster.local:8080/health
```

---

## Docker Compose Deployment

For development and testing environments:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Databases
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mcp
      POSTGRES_USER: mcp
      POSTGRES_PASSWORD: <YOUR_SECURE_PASSWORD>
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass <YOUR_SECURE_PASSWORD>
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
  
  neo4j:
    image: neo4j:5
    environment:
      NEO4J_AUTH: neo4j/<YOUR_SECURE_PASSWORD>
    volumes:
      - neo4j-data:/data
    ports:
      - "7474:7474"
      - "7687:7687"
  
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: <YOUR_SECURE_PASSWORD>
    volumes:
      - minio-data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
  
  # MCP Engines
  rag-engine:
    image: mcp/rag-engine:latest
    environment:
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
      NEO4J_HOST: neo4j
      MINIO_ENDPOINT: minio:9000
    depends_on:
      - postgres
      - redis
      - neo4j
      - minio
    ports:
      - "8081:8080"
  
  dag-engine:
    image: mcp/dag-engine:latest
    environment:
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    ports:
      - "8082:8080"
  
  governance-engine:
    image: mcp/governance-engine:latest
    environment:
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    ports:
      - "8083:8080"
  
  taxonomy-engine:
    image: mcp/taxonomy-engine:latest
    environment:
      NEO4J_HOST: neo4j
    depends_on:
      - neo4j
    ports:
      - "8084:8080"
  
  execution-engine:
    image: mcp/execution-engine:latest
    environment:
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    ports:
      - "8085:8080"
  
  validation-engine:
    image: mcp/validation-engine:latest
    environment:
      POSTGRES_HOST: postgres
    depends_on:
      - postgres
    ports:
      - "8086:8080"
  
  promotion-engine:
    image: mcp/promotion-engine:latest
    environment:
      POSTGRES_HOST: postgres
      MINIO_ENDPOINT: minio:9000
    depends_on:
      - postgres
      - minio
    ports:
      - "8087:8080"
  
  registry:
    image: mcp/artifact-registry:latest
    environment:
      POSTGRES_HOST: postgres
      MINIO_ENDPOINT: minio:9000
    depends_on:
      - postgres
      - minio
    ports:
      - "8088:8080"

volumes:
  postgres-data:
  redis-data:
  neo4j-data:
  minio-data:
```

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Cloud Provider Deployments

### AWS EKS

```bash
# Create EKS cluster
eksctl create cluster \
  --name mcp-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type m5.2xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=mcp-cluster

# Install EBS CSI Driver
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=master"

# Deploy MCP Level 3
helm install mcp-level3 mcp/mcp-level3 \
  --namespace mcp-system \
  --create-namespace \
  --set global.storageClass=gp3 \
  --set ingress.className=alb
```

### Google GKE

```bash
# Create GKE cluster
gcloud container clusters create mcp-cluster \
  --region us-central1 \
  --machine-type n1-standard-8 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials mcp-cluster --region us-central1

# Deploy MCP Level 3
helm install mcp-level3 mcp/mcp-level3 \
  --namespace mcp-system \
  --create-namespace \
  --set global.storageClass=standard-rwo \
  --set ingress.className=gce
```

### Azure AKS

```bash
# Create AKS cluster
az aks create \
  --resource-group mcp-rg \
  --name mcp-cluster \
  --node-count 3 \
  --node-vm-size Standard_D8s_v3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10

# Get credentials
az aks get-credentials --resource-group mcp-rg --name mcp-cluster

# Deploy MCP Level 3
helm install mcp-level3 mcp/mcp-level3 \
  --namespace mcp-system \
  --create-namespace \
  --set global.storageClass=managed-premium \
  --set ingress.className=azure
```

---

## Configuration

### Environment Variables

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mcp
POSTGRES_USER=mcp
POSTGRES_PASSWORD=<YOUR_SECURE_PASSWORD>
POSTGRES_MAX_CONNECTIONS=100

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<YOUR_SECURE_PASSWORD>
REDIS_DB=0
REDIS_MAX_CONNECTIONS=50

# Neo4j Configuration
NEO4J_HOST=localhost
NEO4J_PORT=7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<YOUR_SECURE_PASSWORD>

# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=<YOUR_SECURE_PASSWORD>
MINIO_BUCKET=mcp-artifacts
MINIO_USE_SSL=false

# Engine Configuration
RAG_ENGINE_PORT=8080
DAG_ENGINE_PORT=8080
GOVERNANCE_ENGINE_PORT=8080
TAXONOMY_ENGINE_PORT=8080
EXECUTION_ENGINE_PORT=8080
VALIDATION_ENGINE_PORT=8080
PROMOTION_ENGINE_PORT=8080
REGISTRY_PORT=8080

# Performance Tuning
MAX_WORKERS=4
WORKER_TIMEOUT=300
REQUEST_TIMEOUT=60
CONNECTION_TIMEOUT=30

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_OUTPUT=stdout

# Security
JWT_SECRET=<YOUR_JWT_SECRET>
JWT_EXPIRATION=3600
ENABLE_CORS=true
# Configure CORS with an explicit, comma-separated list of trusted origins (do not use "*" in production)
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
JAEGER_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

---

## Scaling

### Horizontal Pod Autoscaling

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rag-engine-hpa
  namespace: mcp-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rag-engine
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

### Vertical Pod Autoscaling

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: rag-engine-vpa
  namespace: mcp-system
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rag-engine
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: rag-engine
      minAllowed:
        cpu: 1
        memory: 2Gi
      maxAllowed:
        cpu: 8
        memory: 32Gi
```

---

## Monitoring Setup

### Prometheus

```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### Grafana Dashboards

```bash
# Import MCP dashboards
kubectl apply -f https://raw.githubusercontent.com/mcp/mcp-level3/main/monitoring/grafana-dashboards.yaml
```

### Jaeger Tracing

```bash
# Install Jaeger
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  --set provisionDataStore.cassandra=false \
  --set allInOne.enabled=true \
  --set storage.type=memory
```

---

## Backup and Recovery

### Database Backup

```bash
# PostgreSQL backup
kubectl exec -n mcp-system postgresql-0 -- \
  pg_dump -U mcp mcp > backup-$(date +%Y%m%d).sql

# Neo4j backup
kubectl exec -n mcp-system neo4j-0 -- \
  neo4j-admin dump --database=neo4j --to=/backups/neo4j-$(date +%Y%m%d).dump
```

### Artifact Backup

```bash
# MinIO backup using mc
mc mirror mcp-system/mcp-artifacts s3://backup-bucket/artifacts
```

### Disaster Recovery

```bash
# Restore PostgreSQL
kubectl exec -i -n mcp-system postgresql-0 -- \
  psql -U mcp mcp < backup-20240110.sql

# Restore Neo4j
kubectl exec -n mcp-system neo4j-0 -- \
  neo4j-admin load --from=/backups/neo4j-20240110.dump --database=neo4j --force
```

---

## Security Hardening

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-network-policy
  namespace: mcp-system
spec:
  podSelector:
    matchLabels:
      app: mcp
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
    - namespaceSelector:
        matchLabels:
          name: mcp-system
    ports:
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
    - protocol: TCP
      port: 7687
```

### Pod Security Policies

```yaml
# psp.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: mcp-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

---

## Production Checklist

### Pre-Deployment

- [ ] Review and customize configuration
- [ ] Set up SSL/TLS certificates
- [ ] Configure authentication and authorization
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review resource limits and requests
- [ ] Set up network policies
- [ ] Configure pod security policies
- [ ] Review and test disaster recovery procedures

### Post-Deployment

- [ ] Verify all pods are running
- [ ] Test health endpoints
- [ ] Verify database connections
- [ ] Test API endpoints
- [ ] Verify monitoring dashboards
- [ ] Test backup procedures
- [ ] Verify autoscaling configuration
- [ ] Load test the system
- [ ] Document deployment configuration
- [ ] Train operations team

---

**Last Updated:** 2024-01-10  
**Version:** 1.0.0