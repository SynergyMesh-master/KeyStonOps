# MCP Level 3 - Disaster Recovery Plan

## 📋 Executive Summary

**Document Version:** 1.0.0  
**Last Updated:** 2024-01-10  
**Owner:** NinjaTech AI Operations Team  
**Review Cycle:** Quarterly

### Recovery Objectives
- **RTO (Recovery Time Objective):** < 15 minutes
- **RPO (Recovery Point Objective):** < 1 hour
- **Availability Target:** 99.9% (8.76 hours downtime/year)

---

## 🎯 Disaster Scenarios

### Scenario 1: Pod Failure
**Probability:** High  
**Impact:** Low  
**RTO:** < 1 minute  
**RPO:** 0 (no data loss)

### Scenario 2: Node Failure
**Probability:** Medium  
**Impact:** Medium  
**RTO:** < 5 minutes  
**RPO:** 0 (no data loss)

### Scenario 3: Availability Zone Failure
**Probability:** Low  
**Impact:** High  
**RTO:** < 10 minutes  
**RPO:** < 5 minutes

### Scenario 4: Region Failure
**Probability:** Very Low  
**Impact:** Critical  
**RTO:** < 15 minutes  
**RPO:** < 1 hour

### Scenario 5: Data Corruption
**Probability:** Low  
**Impact:** High  
**RTO:** < 15 minutes  
**RPO:** < 1 hour

### Scenario 6: Security Breach
**Probability:** Low  
**Impact:** Critical  
**RTO:** < 30 minutes  
**RPO:** < 1 hour

---

## 🔄 Backup Strategy

### Automated Backups

#### Daily Full Backups
- **Schedule:** 2:00 AM UTC daily
- **Retention:** 30 days
- **Storage:** S3 Standard-IA
- **Verification:** Automated at 3:00 AM UTC

```bash
# Backup CronJob runs daily
kubectl get cronjob mcp-backup -n mcp-system

# Check backup status
kubectl get jobs -n mcp-system -l app=mcp-backup

# View backup logs
kubectl logs -n mcp-system -l app=mcp-backup --tail=100
```

#### Backup Components
1. **Artifact Storage**
   - All artifacts from primary S3 bucket
   - Metadata and checksums
   - Version history

2. **Configuration**
   - Kubernetes ConfigMaps
   - Kubernetes Secrets (encrypted)
   - Deployment manifests

3. **Metadata**
   - Backup timestamp
   - File count
   - Backup status
   - Verification results

### Backup Verification

#### Automated Verification (Daily)
```bash
# Verification runs 1 hour after backup
kubectl get cronjob mcp-backup-verification -n mcp-system

# Check verification status
kubectl get jobs -n mcp-system -l component=verification

# View verification logs
kubectl logs -n mcp-system -l component=verification --tail=50
```

#### Manual Verification (Weekly)
```bash
# List all backups
aws s3 ls s3://mcp-artifacts-backup/ --recursive

# Get latest backup
LATEST=$(aws s3 cp s3://mcp-artifacts-backup/latest.txt -)
echo "Latest backup: $LATEST"

# Verify backup metadata
aws s3 cp s3://mcp-artifacts-backup/$LATEST/metadata.json - | jq .

# Count files in backup
aws s3 ls s3://mcp-artifacts-backup/$LATEST/artifacts/ --recursive | wc -l
```

### Backup Monitoring

#### Prometheus Alerts
```yaml
# Alert if backup fails
- alert: BackupJobFailed
  expr: kube_job_status_failed{job_name=~"mcp-backup.*"} > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Backup job failed"
    description: "Backup job {{ $labels.job_name }} has failed"

# Alert if backup is missing
- alert: BackupMissing
  expr: time() - mcp_last_backup_timestamp > 86400
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Backup missing for 24 hours"
    description: "No successful backup in the last 24 hours"
```

---

## 🚨 Recovery Procedures

### Procedure 1: Pod Recovery (RTO: < 1 minute)

**Trigger:** Pod crash, OOMKilled, or health check failure

**Automatic Recovery:**
```yaml
# Kubernetes automatically restarts failed pods
# Liveness probe triggers restart
livenessProbe:
  httpGet:
    path: /health/live
    port: health
  failureThreshold: 3
  periodSeconds: 10
```

**Manual Intervention (if needed):**
```bash
# 1. Check pod status
kubectl get pods -n mcp-system -l app=mcp-semantic

# 2. View pod logs
kubectl logs -n mcp-system POD_NAME --previous

# 3. Describe pod for events
kubectl describe pod -n mcp-system POD_NAME

# 4. Force delete if stuck
kubectl delete pod -n mcp-system POD_NAME --force --grace-period=0

# 5. Verify new pod is running
kubectl wait --for=condition=ready pod -l app=mcp-semantic -n mcp-system --timeout=60s
```

**Verification:**
```bash
# Check pod health
kubectl exec -n mcp-system POD_NAME -- curl http://localhost:8081/health/ready

# Check metrics
kubectl exec -n mcp-system POD_NAME -- curl http://localhost:9090/metrics
```

---

### Procedure 2: Node Recovery (RTO: < 5 minutes)

**Trigger:** Node failure, network partition, or hardware issue

**Automatic Recovery:**
```yaml
# Kubernetes automatically reschedules pods
# Pod anti-affinity ensures distribution
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - mcp-semantic
        topologyKey: kubernetes.io/hostname
```

**Manual Intervention:**
```bash
# 1. Check node status
kubectl get nodes

# 2. Cordon node (prevent new pods)
kubectl cordon NODE_NAME

# 3. Drain node (evict pods)
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data

# 4. Verify pods rescheduled
kubectl get pods -n mcp-system -o wide

# 5. Check node health
kubectl describe node NODE_NAME

# 6. Uncordon when ready
kubectl uncordon NODE_NAME
```

**Verification:**
```bash
# Verify all pods running
kubectl get pods -n mcp-system -l app=mcp-semantic

# Check service endpoints
kubectl get endpoints -n mcp-system mcp-semantic-control-plane

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://mcp-semantic-control-plane.mcp-system.svc.cluster.local/health/ready
```

---

### Procedure 3: Data Recovery (RTO: < 15 minutes)

**Trigger:** Data corruption, accidental deletion, or storage failure

**Recovery Steps:**

#### Step 1: Assess Damage
```bash
# 1. Check current state
aws s3 ls s3://mcp-artifacts/ --recursive | wc -l

# 2. Compare with backup
LATEST=$(aws s3 cp s3://mcp-artifacts-backup/latest.txt -)
aws s3 ls s3://mcp-artifacts-backup/$LATEST/artifacts/ --recursive | wc -l

# 3. Identify missing/corrupted files
aws s3 sync s3://mcp-artifacts/ /tmp/current --dryrun
aws s3 sync s3://mcp-artifacts-backup/$LATEST/artifacts/ /tmp/backup --dryrun
diff -r /tmp/current /tmp/backup
```

#### Step 2: Create Restore Point
```bash
# Backup current state before restore
RESTORE_POINT="restore-point-$(date +%Y%m%d-%H%M%S)"
aws s3 sync s3://mcp-artifacts/ s3://mcp-artifacts-backup/$RESTORE_POINT/pre-restore/
```

#### Step 3: Execute Restore
```bash
# Option A: Full restore using Job
kubectl create -f k8s/backup-cronjob.yaml  # Contains restore job

# Option B: Manual restore
LATEST=$(aws s3 cp s3://mcp-artifacts-backup/latest.txt -)
aws s3 sync s3://mcp-artifacts-backup/$LATEST/artifacts/ s3://mcp-artifacts/ --delete

# Option C: Selective restore
aws s3 cp s3://mcp-artifacts-backup/$LATEST/artifacts/path/to/file s3://mcp-artifacts/path/to/file
```

#### Step 4: Verify Restore
```bash
# 1. Count restored files
aws s3 ls s3://mcp-artifacts/ --recursive | wc -l

# 2. Verify checksums (sample)
aws s3api head-object --bucket mcp-artifacts --key path/to/file | jq .ETag

# 3. Test artifact access
kubectl exec -n mcp-system POD_NAME -- curl http://localhost:8080/artifacts/test
```

#### Step 5: Restart Services
```bash
# Restart pods to clear caches
kubectl rollout restart deployment mcp-semantic-control-plane -n mcp-system

# Wait for rollout
kubectl rollout status deployment mcp-semantic-control-plane -n mcp-system

# Verify health
kubectl get pods -n mcp-system -l app=mcp-semantic
```

**Verification:**
```bash
# Run smoke tests
kubectl exec -n mcp-system POD_NAME -- /app/scripts/smoke-test.sh

# Check metrics
kubectl exec -n mcp-system POD_NAME -- curl http://localhost:9090/metrics | grep artifact

# Verify recent operations
kubectl logs -n mcp-system -l app=mcp-semantic --tail=100 | grep -i artifact
```

---

### Procedure 4: Region Failover (RTO: < 15 minutes)

**Trigger:** AWS region outage or disaster

**Prerequisites:**
- Multi-region S3 replication enabled
- DNS failover configured
- Standby cluster in secondary region

**Failover Steps:**

#### Step 1: Activate Secondary Region
```bash
# 1. Switch kubectl context
kubectl config use-context secondary-region

# 2. Verify cluster health
kubectl get nodes
kubectl get pods -n mcp-system

# 3. Update DNS (Route53)
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://failover-dns.json
```

#### Step 2: Verify Data Replication
```bash
# Check S3 replication status
aws s3api get-bucket-replication \
  --bucket mcp-artifacts \
  --region us-west-2

# Verify artifact count
aws s3 ls s3://mcp-artifacts-us-west-2/ --recursive | wc -l
```

#### Step 3: Update Configuration
```bash
# Update storage backend
kubectl patch configmap mcp-semantic-config -n mcp-system --type merge -p '
{
  "data": {
    "storage.bucket": "mcp-artifacts-us-west-2",
    "storage.region": "us-west-2"
  }
}'

# Restart pods
kubectl rollout restart deployment mcp-semantic-control-plane -n mcp-system
```

#### Step 4: Verify Failover
```bash
# Test service availability
curl https://mcp-semantic.example.com/health/ready

# Check artifact access
curl https://mcp-semantic.example.com/artifacts/test

# Monitor metrics
kubectl port-forward -n mcp-system svc/prometheus-mcp 9090:9090
# Open http://localhost:9090
```

---

## 📊 Recovery Testing

### Monthly DR Drill

**Objective:** Validate recovery procedures and RTO/RPO

**Schedule:** First Saturday of each month, 2:00 AM UTC

**Test Scenarios:**
1. Pod failure simulation
2. Node failure simulation
3. Data corruption recovery
4. Backup restore validation

**Test Procedure:**
```bash
# 1. Create test namespace
kubectl create namespace mcp-dr-test

# 2. Deploy test instance
kubectl apply -f k8s/deployment.yaml -n mcp-dr-test

# 3. Simulate failure
kubectl delete pod -n mcp-dr-test -l app=mcp-semantic --force

# 4. Measure recovery time
START=$(date +%s)
kubectl wait --for=condition=ready pod -l app=mcp-semantic -n mcp-dr-test --timeout=300s
END=$(date +%s)
echo "Recovery time: $((END - START)) seconds"

# 5. Verify functionality
kubectl exec -n mcp-dr-test POD_NAME -- curl http://localhost:8081/health/ready

# 6. Cleanup
kubectl delete namespace mcp-dr-test
```

**Success Criteria:**
- ✅ RTO < 15 minutes
- ✅ RPO < 1 hour
- ✅ All services operational
- ✅ No data loss
- ✅ Metrics and monitoring functional

---

## 🔔 Incident Response

### Severity Levels

#### P0 - Critical (Complete Outage)
- **Response Time:** Immediate
- **Escalation:** Page on-call engineer
- **Communication:** Status page update every 15 minutes

#### P1 - High (Partial Outage)
- **Response Time:** < 15 minutes
- **Escalation:** Notify on-call engineer
- **Communication:** Status page update every 30 minutes

#### P2 - Medium (Degraded Performance)
- **Response Time:** < 1 hour
- **Escalation:** Create incident ticket
- **Communication:** Status page update every 2 hours

#### P3 - Low (Minor Issue)
- **Response Time:** < 4 hours
- **Escalation:** Standard ticket
- **Communication:** Internal notification only

### Incident Response Workflow

```
┌─────────────────────────────────────────────────────────┐
│                   Incident Detected                     │
│              (Monitoring Alert / User Report)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              1. Assess & Classify                       │
│              - Determine severity                       │
│              - Identify affected components             │
│              - Estimate impact                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              2. Initiate Response                       │
│              - Page on-call (P0/P1)                     │
│              - Create incident ticket                   │
│              - Update status page                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              3. Execute Recovery                        │
│              - Follow DR procedures                     │
│              - Document actions taken                   │
│              - Communicate progress                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              4. Verify Recovery                         │
│              - Run smoke tests                          │
│              - Check all metrics                        │
│              - Confirm with stakeholders                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              5. Post-Incident Review                    │
│              - Root cause analysis                      │
│              - Document lessons learned                 │
│              - Update procedures                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📞 Contact Information

### On-Call Rotation
- **Primary:** ops-primary@ninjatech.ai
- **Secondary:** ops-secondary@ninjatech.ai
- **Manager:** ops-manager@ninjatech.ai

### Escalation Path
1. On-Call Engineer (0-15 min)
2. Team Lead (15-30 min)
3. Engineering Manager (30-60 min)
4. VP Engineering (60+ min)

### External Contacts
- **AWS Support:** Premium Support (24/7)
- **Kubernetes Support:** Enterprise Support
- **Security Team:** security@ninjatech.ai

---

## 📝 Post-Incident Checklist

After any incident:
- [ ] Document incident timeline
- [ ] Identify root cause
- [ ] Update runbooks if needed
- [ ] Review and improve monitoring
- [ ] Conduct blameless postmortem
- [ ] Share lessons learned
- [ ] Update DR plan if needed
- [ ] Schedule follow-up actions

---

## 🔄 Plan Maintenance

### Review Schedule
- **Monthly:** DR drill execution
- **Quarterly:** Full plan review
- **Annually:** Comprehensive audit

### Update Triggers
- After any P0/P1 incident
- After infrastructure changes
- After new feature deployments
- After security incidents

### Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2024-01-10 | Initial version | SuperNinja AI |

---

## 📊 Metrics & KPIs

### Recovery Metrics
- **MTTR (Mean Time To Recovery):** Target < 15 minutes
- **MTBF (Mean Time Between Failures):** Target > 720 hours (30 days)
- **Backup Success Rate:** Target > 99.9%
- **Restore Success Rate:** Target > 99.5%

### Monitoring Dashboard
```
Grafana Dashboard: DR Metrics
- Last successful backup
- Backup size trend
- Recovery time trend
- Incident frequency
- RTO/RPO compliance
```

---

**Document Owner:** NinjaTech AI Operations Team  
**Last Reviewed:** 2024-01-10  
**Next Review:** 2024-04-10  
**Version:** 1.0.0