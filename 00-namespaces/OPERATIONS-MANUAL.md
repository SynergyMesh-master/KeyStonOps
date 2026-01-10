# MCP Level 3 - Operations Manual

## 📋 Table of Contents

1. [Overview](#overview)
2. [Daily Operations](#daily-operations)
3. [Monitoring & Alerting](#monitoring--alerting)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Performance Tuning](#performance-tuning)
7. [Security Operations](#security-operations)
8. [Runbooks](#runbooks)

---

## 📊 Overview

### Service Level Objectives (SLOs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Monthly uptime |
| Latency (p95) | <100ms | API response time |
| Error Rate | <0.1% | Failed requests / total |
| Data Durability | 99.999999999% | S3 standard |

### On-Call Rotation

- **Primary:** Available 24/7, responds within 15 minutes
- **Secondary:** Backup support, responds within 30 minutes
- **Escalation:** Manager notified after 1 hour

### Key Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | ops-oncall@ninjatech.ai | 24/7 |
| Team Lead | ops-lead@ninjatech.ai | Business hours |
| Engineering Manager | ops-manager@ninjatech.ai | Business hours |
| Security Team | security@ninjatech.ai | 24/7 |

---

## 📅 Daily Operations

### Morning Checklist (9:00 AM)

```bash
#!/bin/bash
# daily-morning-check.sh

echo "=== MCP Level 3 Morning Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Check pod status
echo "1. Checking pod status..."
kubectl get pods -n mcp-system -l app=mcp-semantic
echo ""

# 2. Check recent errors
echo "2. Checking recent errors (last hour)..."
kubectl logs -n mcp-system -l app=mcp-semantic --since=1h | grep -i error | tail -20
echo ""

# 3. Check metrics
echo "3. Checking key metrics..."
kubectl exec -n mcp-system $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- \
  curl -s http://localhost:9090/metrics | grep -E "(validation_total|promotion_total|artifact_uploads_total)"
echo ""

# 4. Check backup status
echo "4. Checking last backup..."
kubectl get jobs -n mcp-system -l app=mcp-backup --sort-by=.status.startTime | tail -1
echo ""

# 5. Check resource usage
echo "5. Checking resource usage..."
kubectl top pods -n mcp-system -l app=mcp-semantic
echo ""

# 6. Check alerts
echo "6. Checking active alerts..."
curl -s http://prometheus-mcp.mcp-system.svc.cluster.local:9090/api/v1/alerts | \
  jq '.data.alerts[] | select(.state=="firing") | {alert: .labels.alertname, severity: .labels.severity}'
echo ""

echo "=== Health Check Complete ==="
```

### Evening Checklist (6:00 PM)

```bash
#!/bin/bash
# daily-evening-check.sh

echo "=== MCP Level 3 Evening Review ==="
echo "Date: $(date)"
echo ""

# 1. Review daily metrics
echo "1. Daily metrics summary..."
kubectl exec -n mcp-system $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- \
  curl -s http://localhost:9090/metrics | \
  grep -E "(validation_total|promotion_total|artifact_uploads_total)" | \
  awk '{print $1, $2}'
echo ""

# 2. Check for incidents
echo "2. Incidents today..."
kubectl get events -n mcp-system --sort-by='.lastTimestamp' | grep -i warning | tail -10
echo ""

# 3. Verify backup completion
echo "3. Backup verification..."
aws s3 ls s3://mcp-artifacts-backup/latest.txt
LATEST=$(aws s3 cp s3://mcp-artifacts-backup/latest.txt -)
echo "Latest backup: $LATEST"
aws s3 ls s3://mcp-artifacts-backup/$LATEST/metadata.json
echo ""

# 4. Review capacity
echo "4. Capacity review..."
kubectl top nodes
echo ""

# 5. Check for updates
echo "5. Checking for updates..."
kubectl get pods -n mcp-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
echo ""

echo "=== Evening Review Complete ==="
```

---

## 📈 Monitoring & Alerting

### Grafana Dashboards

#### 1. Overview Dashboard

**URL:** `http://grafana-mcp.mcp-system.svc.cluster.local:3000/d/mcp-overview`

**Key Panels:**
- Request rate (requests/sec)
- Error rate (%)
- Latency (p50, p95, p99)
- Resource usage (CPU, Memory)
- Active alerts

**Review Frequency:** Every 15 minutes during business hours

#### 2. Validation Engine Dashboard

**URL:** `http://grafana-mcp.mcp-system.svc.cluster.local:3000/d/mcp-validation`

**Key Metrics:**
- `validation_total` - Total validations
- `validation_errors_total` - Validation errors
- `validation_duration_seconds` - Validation latency
- `validation_cache_hit_rate` - Cache efficiency

**Alert Thresholds:**
- Error rate > 5%: Warning
- Error rate > 10%: Critical
- Latency p95 > 100ms: Warning
- Cache hit rate < 70%: Info

#### 3. Promotion Engine Dashboard

**URL:** `http://grafana-mcp.mcp-system.svc.cluster.local:3000/d/mcp-promotion`

**Key Metrics:**
- `promotion_total` - Total promotions
- `promotion_success_total` - Successful promotions
- `promotion_failures_total` - Failed promotions
- `promotion_rollbacks_total` - Rollbacks
- `promotion_duration_seconds` - Promotion time

**Alert Thresholds:**
- Failure rate > 5%: Warning
- Failure rate > 10%: Critical
- Promotion time > 5min: Warning
- Rollback triggered: Warning

#### 4. Artifact Registry Dashboard

**URL:** `http://grafana-mcp.mcp-system.svc.cluster.local:3000/d/mcp-artifacts`

**Key Metrics:**
- `artifact_uploads_total` - Total uploads
- `artifact_downloads_total` - Total downloads
- `artifact_storage_used_bytes` - Storage usage
- `artifact_lookup_duration_seconds` - Lookup latency

**Alert Thresholds:**
- Storage > 90%: Critical
- Lookup latency > 200ms: Warning
- Upload failures > 1%: Warning

### Alert Response Times

| Severity | Response Time | Action Required |
|----------|---------------|-----------------|
| Critical | 15 minutes | Immediate investigation |
| Warning | 1 hour | Review and plan fix |
| Info | 4 hours | Monitor and document |

### Alert Escalation

```
Alert Fired
    ↓
Primary On-Call (15 min)
    ↓ (no response)
Secondary On-Call (30 min)
    ↓ (no response)
Team Lead (1 hour)
    ↓ (no resolution)
Engineering Manager (2 hours)
    ↓ (critical only)
VP Engineering (4 hours)
```

---

## 🚨 Incident Response

### Incident Severity Levels

#### P0 - Critical (Complete Outage)
**Definition:** Service completely unavailable, affecting all users

**Response:**
1. Page on-call engineer immediately
2. Create incident channel (#incident-YYYYMMDD-NNN)
3. Update status page every 15 minutes
4. Engage all hands if needed

**Example Scenarios:**
- All pods down
- Database unavailable
- Complete region failure

#### P1 - High (Partial Outage)
**Definition:** Major functionality impaired, affecting many users

**Response:**
1. Notify on-call engineer (Slack + email)
2. Create incident ticket
3. Update status page every 30 minutes
4. Engage relevant team members

**Example Scenarios:**
- Single pod repeatedly crashing
- High error rate (>10%)
- Slow response times (>1s)

#### P2 - Medium (Degraded Performance)
**Definition:** Minor functionality impaired, affecting some users

**Response:**
1. Create incident ticket
2. Notify team in Slack
3. Update status page every 2 hours
4. Schedule fix during business hours

**Example Scenarios:**
- Elevated error rate (5-10%)
- Slow response times (500ms-1s)
- Non-critical feature unavailable

#### P3 - Low (Minor Issue)
**Definition:** Minimal impact, no user-facing issues

**Response:**
1. Create bug ticket
2. Document in team channel
3. Fix during normal development cycle

**Example Scenarios:**
- Low cache hit rate
- Minor configuration issue
- Cosmetic dashboard problem

### Incident Response Playbook

#### Step 1: Assess (5 minutes)

```bash
# Quick assessment script
#!/bin/bash

echo "=== Incident Assessment ==="

# Check pod status
echo "Pod Status:"
kubectl get pods -n mcp-system -l app=mcp-semantic

# Check recent logs
echo -e "\nRecent Errors:"
kubectl logs -n mcp-system -l app=mcp-semantic --tail=50 | grep -i error

# Check metrics
echo -e "\nKey Metrics:"
kubectl exec -n mcp-system $(kubectl get pod -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].metadata.name}') -- \
  curl -s http://localhost:9090/metrics | grep -E "(up|validation_total|promotion_total)"

# Check active alerts
echo -e "\nActive Alerts:"
curl -s http://prometheus-mcp.mcp-system.svc.cluster.local:9090/api/v1/alerts | \
  jq '.data.alerts[] | select(.state=="firing")'
```

#### Step 2: Communicate (2 minutes)

```markdown
# Incident Communication Template

**Incident ID:** INC-YYYYMMDD-NNN
**Severity:** P0/P1/P2/P3
**Status:** Investigating/Identified/Monitoring/Resolved
**Started:** YYYY-MM-DD HH:MM UTC
**Impact:** Brief description of user impact

**Current Status:**
- What we know
- What we're doing
- ETA for next update

**Updates:**
- HH:MM - Update message
- HH:MM - Update message
```

#### Step 3: Mitigate (15 minutes)

```bash
# Common mitigation actions

# 1. Restart unhealthy pods
kubectl delete pod -n mcp-system POD_NAME

# 2. Scale up replicas
kubectl scale deployment mcp-semantic-control-plane -n mcp-system --replicas=5

# 3. Rollback deployment
kubectl rollout undo deployment mcp-semantic-control-plane -n mcp-system

# 4. Drain problematic node
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data

# 5. Emergency rollback to previous version
kubectl set image deployment/mcp-semantic-control-plane \
  semantic-control-plane=mcp/semantic-control-plane:v2.9.0 \
  -n mcp-system
```

#### Step 4: Resolve (Variable)

Follow appropriate runbook (see [Runbooks](#runbooks) section)

#### Step 5: Post-Incident Review (Within 48 hours)

```markdown
# Post-Incident Review Template

**Incident ID:** INC-YYYYMMDD-NNN
**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** P0/P1/P2/P3

## Timeline
- HH:MM - Incident detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Mitigation applied
- HH:MM - Service restored
- HH:MM - Incident closed

## Impact
- Users affected: X
- Requests failed: Y
- Revenue impact: $Z

## Root Cause
Detailed explanation of what caused the incident

## Resolution
What was done to resolve the incident

## Action Items
- [ ] Action 1 (Owner: Name, Due: Date)
- [ ] Action 2 (Owner: Name, Due: Date)
- [ ] Action 3 (Owner: Name, Due: Date)

## Lessons Learned
- What went well
- What could be improved
- What we learned
```

---

## 🔧 Maintenance Procedures

### Routine Maintenance Windows

**Schedule:** First Saturday of each month, 2:00 AM - 6:00 AM UTC

**Pre-Maintenance Checklist:**
- [ ] Notify users 7 days in advance
- [ ] Create maintenance ticket
- [ ] Backup all data
- [ ] Prepare rollback plan
- [ ] Test changes in staging
- [ ] Update runbooks if needed

**During Maintenance:**
```bash
# 1. Enable maintenance mode
kubectl patch ingress mcp-semantic-ingress -n mcp-system -p '
{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/custom-http-errors": "503"
    }
  }
}'

# 2. Perform maintenance tasks
# (e.g., upgrade, configuration changes, etc.)

# 3. Verify changes
kubectl rollout status deployment mcp-semantic-control-plane -n mcp-system
kubectl get pods -n mcp-system -l app=mcp-semantic

# 4. Run smoke tests
./scripts/smoke-test.sh

# 5. Disable maintenance mode
kubectl patch ingress mcp-semantic-ingress -n mcp-system --type=json -p='[
  {"op": "remove", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1custom-http-errors"}
]'
```

**Post-Maintenance Checklist:**
- [ ] Verify all services healthy
- [ ] Check metrics and logs
- [ ] Update documentation
- [ ] Notify users of completion
- [ ] Document any issues

### Rolling Updates

```bash
# Update deployment with zero downtime
kubectl set image deployment/mcp-semantic-control-plane \
  semantic-control-plane=mcp/semantic-control-plane:v3.1.0 \
  -n mcp-system

# Monitor rollout
kubectl rollout status deployment mcp-semantic-control-plane -n mcp-system

# Verify new version
kubectl get pods -n mcp-system -l app=mcp-semantic -o jsonpath='{.items[0].spec.containers[0].image}'

# Rollback if needed
kubectl rollout undo deployment mcp-semantic-control-plane -n mcp-system
```

### Configuration Updates

```bash
# Update ConfigMap
kubectl edit configmap mcp-semantic-config -n mcp-system

# Restart pods to apply changes
kubectl rollout restart deployment mcp-semantic-control-plane -n mcp-system

# Verify configuration
kubectl exec -n mcp-system POD_NAME -- env | grep -E "(CACHE|STORAGE)"
```

---

## ⚡ Performance Tuning

### CPU Optimization

```yaml
# Increase CPU limits for high load
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 4000m
    memory: 8Gi
```

### Memory Optimization

```bash
# Adjust cache size
kubectl patch configmap mcp-semantic-config -n mcp-system --type merge -p '
{
  "data": {
    "validation.cache.size": "50000",
    "validation.cache.ttl": "600000"
  }
}'
```

### Horizontal Scaling

```yaml
# Adjust HPA settings
spec:
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

### Database Connection Pooling

```typescript
// Optimize connection pool
const registry = new ArtifactRegistry({
  storage: {
    backend: 's3',
    bucket: 'artifacts',
    region: 'us-east-1',
    maxConnections: 100,
    connectionTimeout: 5000,
  },
});
```

---

## 🔒 Security Operations

### Security Monitoring

```bash
# Daily security check
#!/bin/bash

echo "=== Security Check ==="

# 1. Check for CVEs
trivy image mcp/semantic-control-plane:v3.0.0

# 2. Check pod security
kubectl get pods -n mcp-system -o json | \
  jq '.items[] | {name: .metadata.name, securityContext: .spec.securityContext}'

# 3. Check RBAC
kubectl auth can-i --list --namespace=mcp-system

# 4. Check network policies
kubectl get networkpolicies -n mcp-system

# 5. Check secrets
kubectl get secrets -n mcp-system
```

### Security Incident Response

**If security breach detected:**

1. **Immediate Actions (5 minutes)**
   ```bash
   # Isolate affected pods
   kubectl label pod POD_NAME quarantine=true -n mcp-system
   
   # Block network access
   kubectl apply -f - <<EOF
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: deny-all
     namespace: mcp-system
   spec:
     podSelector:
       matchLabels:
         quarantine: "true"
     policyTypes:
     - Ingress
     - Egress
   EOF
   ```

2. **Notify Security Team**
   ```bash
   # Send alert
   curl -X POST https://security.ninjatech.ai/api/incidents \
     -H "Content-Type: application/json" \
     -d '{
       "severity": "critical",
       "type": "security-breach",
       "description": "Potential security breach detected",
       "namespace": "mcp-system"
     }'
   ```

3. **Collect Evidence**
   ```bash
   # Capture logs
   kubectl logs POD_NAME -n mcp-system > incident-logs.txt
   
   # Capture pod state
   kubectl get pod POD_NAME -n mcp-system -o yaml > incident-pod.yaml
   
   # Capture events
   kubectl get events -n mcp-system --sort-by='.lastTimestamp' > incident-events.txt
   ```

4. **Follow Security Incident Playbook**
   - Contact security team
   - Preserve evidence
   - Investigate root cause
   - Implement fixes
   - Document incident

---

## 📖 Runbooks

### Runbook 1: High Error Rate

**Trigger:** Error rate > 5% for 5 minutes

**Steps:**

1. **Check Error Types**
   ```bash
   kubectl logs -n mcp-system -l app=mcp-semantic --tail=1000 | \
     grep -i error | \
     awk '{print $NF}' | \
     sort | uniq -c | sort -rn
   ```

2. **Check Recent Changes**
   ```bash
   kubectl rollout history deployment mcp-semantic-control-plane -n mcp-system
   ```

3. **Check Resource Usage**
   ```bash
   kubectl top pods -n mcp-system -l app=mcp-semantic
   ```

4. **Mitigation Options:**
   - If recent deployment: Rollback
   - If resource exhaustion: Scale up
   - If external dependency: Check dependency health
   - If data issue: Check validation schemas

5. **Rollback if Needed**
   ```bash
   kubectl rollout undo deployment mcp-semantic-control-plane -n mcp-system
   ```

### Runbook 2: High Latency

**Trigger:** p95 latency > 200ms for 5 minutes

**Steps:**

1. **Check Slow Endpoints**
   ```bash
   kubectl exec -n mcp-system POD_NAME -- \
     curl -s http://localhost:9090/metrics | \
     grep duration_seconds | \
     sort -t= -k2 -rn | \
     head -20
   ```

2. **Check Cache Hit Rate**
   ```bash
   kubectl exec -n mcp-system POD_NAME -- \
     curl -s http://localhost:9090/metrics | \
     grep cache_hit_rate
   ```

3. **Check Database Performance**
   ```bash
   # Check S3 latency
   aws cloudwatch get-metric-statistics \
     --namespace AWS/S3 \
     --metric-name FirstByteLatency \
     --dimensions Name=BucketName,Value=mcp-artifacts \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Average
   ```

4. **Mitigation Options:**
   - Increase cache size
   - Scale horizontally
   - Optimize queries
   - Add read replicas

### Runbook 3: Pod Crash Loop

**Trigger:** Pod restarting repeatedly

**Steps:**

1. **Check Pod Status**
   ```bash
   kubectl describe pod POD_NAME -n mcp-system
   ```

2. **Check Logs**
   ```bash
   kubectl logs POD_NAME -n mcp-system --previous
   ```

3. **Check Resource Limits**
   ```bash
   kubectl get pod POD_NAME -n mcp-system -o jsonpath='{.spec.containers[0].resources}'
   ```

4. **Common Causes:**
   - OOMKilled: Increase memory limits
   - Configuration error: Check ConfigMap
   - Dependency unavailable: Check external services
   - Code bug: Rollback to previous version

5. **Fix and Verify**
   ```bash
   # Apply fix
   kubectl apply -f fixed-deployment.yaml
   
   # Monitor
   kubectl get pods -n mcp-system -w
   ```

### Runbook 4: Storage Full

**Trigger:** Storage usage > 90%

**Steps:**

1. **Check Storage Usage**
   ```bash
   aws s3 ls s3://mcp-artifacts/ --recursive --summarize | tail -2
   ```

2. **Identify Large Files**
   ```bash
   aws s3 ls s3://mcp-artifacts/ --recursive | \
     sort -k3 -rn | \
     head -20
   ```

3. **Check Retention Policy**
   ```bash
   kubectl get configmap mcp-semantic-config -n mcp-system -o jsonpath='{.data.artifact\.retention\.days}'
   ```

4. **Cleanup Options:**
   - Run manual cleanup
   - Adjust retention policy
   - Archive old artifacts
   - Increase storage capacity

5. **Manual Cleanup**
   ```bash
   # Delete artifacts older than 90 days
   aws s3 ls s3://mcp-artifacts/ --recursive | \
     awk '{if ($1 < "'$(date -d '90 days ago' +%Y-%m-%d)'") print $4}' | \
     xargs -I {} aws s3 rm s3://mcp-artifacts/{}
   ```

---

## 📞 Emergency Contacts

### Internal

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Primary | Rotating | +1-XXX-XXX-XXXX | ops-oncall@ninjatech.ai |
| On-Call Secondary | Rotating | +1-XXX-XXX-XXXX | ops-secondary@ninjatech.ai |
| Team Lead | John Doe | +1-XXX-XXX-XXXX | john.doe@ninjatech.ai |
| Engineering Manager | Jane Smith | +1-XXX-XXX-XXXX | jane.smith@ninjatech.ai |

### External

| Service | Contact | Phone | Support Level |
|---------|---------|-------|---------------|
| AWS Support | - | +1-XXX-XXX-XXXX | Premium 24/7 |
| Kubernetes Support | - | +1-XXX-XXX-XXXX | Enterprise |
| Security Team | - | +1-XXX-XXX-XXXX | 24/7 |

---

**Last Updated:** 2024-01-10  
**Version:** 3.0.0  
**Maintainer:** NinjaTech AI Operations Team  
**Next Review:** 2024-04-10