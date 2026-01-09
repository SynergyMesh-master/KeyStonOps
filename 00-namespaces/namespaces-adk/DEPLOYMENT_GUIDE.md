# ADK Governance Agents Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the enhanced ADK Governance Agents system to production. The system includes four autonomous agents that work together to maintain, repair, and evolve your machine-native platform.

## Prerequisites

### System Requirements

- **Python**: 3.9 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 50GB available disk space
- **Network**: Internet connectivity for MCP servers and GitHub API

### Required Services

- **Redis**: For memory management
- **ChromaDB**: For vector storage
- **Prometheus**: For metrics collection
- **Grafana**: For visualization
- **Kubernetes**: For deployment (optional, for production)

### Dependencies

```bash
# Python dependencies
pip install -r requirements.txt

# MCP servers (running on localhost)
# - GitHub MCP: http://localhost:8001
# - Kubernetes MCP: http://localhost:8002
# - Docker MCP: http://localhost:8003
# - Cloudflare MCP: http://localhost:8004
# - Schema MCP: http://localhost:8005
# - Template MCP: http://localhost:8006
# - Filesystem MCP: http://localhost:8007
```

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/MachineNativeOps/machine-native-ops.git
cd machine-native-ops/00-namespaces/namespaces-adk
```

### 2. Install Python Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Install Taxonomy Core

```bash
# Install taxonomy-core package
pip install @machine-native-ops/taxonomy-core

# Or install from local source
cd ../taxonomy-core
pip install -e .
cd ../namespaces-adk
```

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

Required environment variables:

```bash
# Agent Configuration
AGENT_NAME=platform-governance-orchestrator-agent-v1
AUTONOMY_THRESHOLD=0.8

# MCP Servers
GITHUB_MCP_URL=http://localhost:8001
KUBERNETES_MCP_URL=http://localhost:8002
DOCKER_MCP_URL=http://localhost:8003
CLOUDFLARE_MCP_URL=http://localhost:8004
SCHEMA_MCP_URL=http://localhost:8005
TEMPLATE_MCP_URL=http://localhost:8006
FILESYSTEM_MCP_URL=http://localhost:8007

# GitHub
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=MachineNativeOps/machine-native-ops

# Storage
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Observability
PROMETHEUS_PORT=9090
GRAFANA_URL=http://localhost:3000
OTLP_ENDPOINT=localhost:4317

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### 5. Start MCP Servers

```bash
# Start GitHub MCP Server
python -m mcp.servers.github --port 8001 &

# Start Kubernetes MCP Server
python -m mcp.servers.kubernetes --port 8002 &

# Start Docker MCP Server
python -m mcp.servers.docker --port 8003 &

# Start Cloudflare MCP Server
python -m mcp.servers.cloudflare --port 8004 &

# Start Schema MCP Server
python -m mcp.servers.schema --port 8005 &

# Start Template MCP Server
python -m mcp.servers.template --port 8006 &

# Start Filesystem MCP Server
python -m mcp.servers.filesystem --port 8007 &
```

Or use Docker Compose for all MCP servers:

```bash
docker-compose up -d mcp-servers
```

### 6. Start Storage Services

```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start ChromaDB
docker run -d --name chroma -p 8000:8000 chromadb/chroma:latest
```

### 7. Start Observability Stack

```bash
# Start Prometheus
docker run -d --name prometheus \
  -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana
docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

## Configuration

### Agent Configuration

Edit `config/settings.yaml`:

```yaml
agent:
  name: "platform-governance-orchestrator-agent-v1"
  environment: "production"
  max_concurrent_workflows: 10
  max_workflow_duration_seconds: 300
  sandbox_enabled: true
  sandbox_pool_size: 5
```

### Taxonomy Configuration

Edit `config/taxonomy.yaml`:

```yaml
taxonomy:
  enabled: true
  version: "1.0.0"
  validation_rules:
    - "kebab-case"
    - "domain-prefix"
    - "no-consecutive-hyphens"
    - "max-length"
    - "version-format"
```

### Governance Configuration

Edit `config/governance.yaml`:

```yaml
governance:
  mi9_runtime:
    enabled: true
    intervention_level: "monitor"
    autonomy_threshold: 0.8
  
  ari_index:
    autonomy_weight: 0.4
    adaptability_weight: 0.3
    continuity_weight: 0.3
  
  containment:
    default_level: "none"
    auto_escalate: true
```

## Deployment

### Local Deployment

```bash
# Activate virtual environment
source venv/bin/activate

# Run all agents
python -m enhanced_adk.governance_agents.dag_maintenance_agent &
python -m enhanced_adk.governance_agents.cicd_repair_agent &
python -m enhanced_adk.governance_agents.artifact_generation_agent &
python -m enhanced_adk.governance_agents.gitops_workflow_agent &

# Or use the orchestration script
./scripts/start_agents.sh
```

### Docker Deployment

```bash
# Build Docker image
docker build -t machine-native-ops/adk-governance-agents:v1 .

# Run container
docker run -d \
  --name adk-agents \
  --env-file .env \
  -p 8080:8080 \
  -p 9090:9090 \
  machine-native-ops/adk-governance-agents:v1
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n governance
kubectl logs -f deployment/adk-governance-agents -n governance
```

### Helm Deployment

```bash
# Add Helm repository
helm repo add machine-native-ops https://charts.machine-native-ops.com

# Install chart
helm install adk-agents machine-native-ops/adk-governance-agents \
  --namespace governance \
  --create-namespace \
  --values values.yaml
```

## Verification

### Health Checks

```bash
# Check agent status
curl http://localhost:8080/health

# Check metrics
curl http://localhost:9090/metrics

# Check logs
tail -f logs/adk-agents.log
```

### Smoke Tests

```bash
# Run smoke tests
python tests/smoke_tests.py

# Run integration tests
pytest tests/integration/ -v

# Run full test suite
pytest tests/ -v --cov=enhanced_adk
```

### Manual Verification

1. **DAG Maintenance Agent**:
   - Check if agent scans workspace
   - Verify taxonomy validation works
   - Confirm PR creation for violations

2. **CI/CD Repair Agent**:
   - Trigger a failed pipeline
   - Verify agent detects failure
   - Check if fix is applied

3. **Artifact Generation Agent**:
   - Generate a test schema
   - Validate generated artifact
   - Verify documentation generation

4. **GitOps Workflow Agent**:
   - Create a test PR
   - Verify automated review
   - Check policy enforcement

## Monitoring

### Prometheus Metrics

Access Prometheus at: http://localhost:9090

Key metrics to monitor:

```promql
# Agent operations
rate(agent_operations_total[5m])

# Taxonomy violations
rate(taxonomy_violations_total[5m])

# CI/CD failures
rate(cicd_failures_detected_total[5m])

# Repairs applied
rate(repairs_applied_total[5m])

# Agent duration
histogram_quantile(0.95, agent_duration_seconds_bucket)
```

### Grafana Dashboards

Access Grafana at: http://localhost:3000

Import dashboard from `grafana/dashboard.json`:
1. Navigate to Dashboards → Import
2. Upload `dashboard.json`
3. Select Prometheus datasource
4. View dashboard

### Logging

Logs are stored in `logs/adk-agents.log` with JSON format:

```json
{
  "timestamp": "2024-01-09T10:00:00Z",
  "level": "INFO",
  "agent": "platform-dag-maintainer-agent-v1",
  "message": "Starting maintenance cycle",
  "context": {
    "workspace": "/workspace",
    "agent_name": "platform-dag-maintainer-agent-v1"
  }
}
```

## Troubleshooting

### Common Issues

**Issue: Agent fails to start**
```bash
# Check if MCP servers are running
curl http://localhost:8001/health

# Check environment variables
env | grep MCP

# Check logs
tail -f logs/adk-agents.log
```

**Issue: MCP connection errors**
```bash
# Verify MCP server is accessible
curl http://localhost:8001/tools

# Check firewall settings
sudo ufw allow 8001:8007/tcp

# Restart MCP servers
docker-compose restart mcp-servers
```

**Issue: Taxonomy validation fails**
```bash
# Verify taxonomy-core is installed
pip list | grep taxonomy

# Check taxonomy configuration
cat config/taxonomy.yaml

# Test taxonomy integration
python -c "from adk.taxonomy_integration import ADKTaxonomyManager; print(ADKTaxonomyManager.get_instance())"
```

**Issue: Memory errors**
```bash
# Check Redis connection
redis-cli ping

# Increase memory limits
docker update --memory 8g adk-agents

# Check memory usage
docker stats adk-agents
```

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
python -m enhanced_adk.governance_agents.dag_maintenance_agent
```

### Rollback

To rollback to previous version:

```bash
# Docker rollback
docker stop adk-agents
docker run -d \
  --name adk-agents \
  --env-file .env \
  machine-native-ops/adk-governance-agents:v0.9.0

# Kubernetes rollback
kubectl rollout undo deployment/adk-governance-agents -n governance

# Helm rollback
helm rollback adk-agents -n governance
```

## Maintenance

### Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
pip install --upgrade -r requirements.txt

# Restart agents
./scripts/restart_agents.sh
```

### Backups

```bash
# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz config/

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Backup Redis data
docker exec redis redis-cli BGSAVE
```

### Cleanup

```bash
# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete

# Clean Docker images
docker image prune -a

# Clean old metrics
curl -X POST http://localhost:9090/api/v1/admin/tsdb/delete_series
```

## Scaling

### Horizontal Scaling

```bash
# Increase replica count in Kubernetes
kubectl scale deployment/adk-governance-agents --replicas=5 -n governance

# Or update in values.yaml
replicaCount: 5
helm upgrade adk-agents machine-native-ops/adk-governance-agents -f values.yaml
```

### Vertical Scaling

```bash
# Increase resource limits
resources:
  requests:
    cpu: 1000m
    memory: 1Gi
  limits:
    cpu: 4000m
    memory: 4Gi
```

## Security

### TLS/SSL

```bash
# Generate certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt

# Configure TLS in Kubernetes
kubectl create secret tls adk-tls --cert=tls.crt --key=tls.key -n governance
```

### Authentication

```bash
# Enable authentication in config
security:
  auth:
    enabled: true
    method: "token"
    token_expiry_hours: 24
```

### RBAC

```yaml
# Kubernetes RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: governance
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
```

## Support

For issues and questions:

- **Documentation**: See `/docs` directory
- **Issues**: https://github.com/MachineNativeOps/machine-native-ops/issues
- **Discussions**: https://github.com/MachineNativeOps/machine-native-ops/discussions
- **Email**: support@machine-native-ops.com

## License

MIT License - see LICENSE file for details.