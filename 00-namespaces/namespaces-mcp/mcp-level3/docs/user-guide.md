# MCP Level 3 - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [Engine Overview](#engine-overview)
5. [Common Use Cases](#common-use-cases)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

MCP (Model Context Protocol) Level 3 is a comprehensive artifact management and orchestration system consisting of 8 specialized engines that work together to provide enterprise-grade capabilities for AI/ML workflows, data processing, and artifact lifecycle management.

### What is MCP Level 3?

MCP Level 3 provides:
- **Intelligent Query Processing** via RAG Engine
- **Workflow Orchestration** via DAG Engine
- **Policy Enforcement** via Governance Engine
- **Knowledge Management** via Taxonomy Engine
- **Task Execution** via Execution Engine
- **Quality Assurance** via Validation Engine
- **Deployment Management** via Promotion Engine
- **Artifact Storage** via Artifact Registry

### Who Should Use This Guide?

- Data Scientists and ML Engineers
- DevOps Engineers
- Platform Engineers
- Application Developers
- System Administrators

---

## Getting Started

### Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm 3.x
- Docker (for local development)

### Quick Start

#### 1. Install MCP Level 3

```bash
# Add Helm repository
helm repo add mcp https://charts.mcp.io
helm repo update

# Install MCP Level 3
helm install mcp-level3 mcp/mcp-level3 \
  --namespace mcp-system \
  --create-namespace \
  --values values.yaml
```

#### 2. Verify Installation

```bash
# Check all pods are running
kubectl get pods -n mcp-system

# Expected output:
# NAME                                READY   STATUS    RESTARTS   AGE
# rag-engine-xxx                      1/1     Running   0          2m
# dag-engine-xxx                      1/1     Running   0          2m
# governance-engine-xxx               1/1     Running   0          2m
# taxonomy-engine-xxx                 1/1     Running   0          2m
# execution-engine-xxx                1/1     Running   0          2m
# validation-engine-xxx               1/1     Running   0          2m
# promotion-engine-xxx                1/1     Running   0          2m
# artifact-registry-xxx               1/1     Running   0          2m
```

#### 3. Access the Dashboard

```bash
# Port forward to access dashboard
kubectl port-forward -n mcp-system svc/mcp-dashboard 8080:80

# Open browser to http://localhost:8080
```

#### 4. Your First Query

```bash
# Submit a query to RAG Engine
curl -X POST http://localhost:8080/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "context_size": 5
  }'
```

---

## Core Concepts

### Artifacts

Artifacts are the fundamental units in MCP Level 3. They represent:
- ML models
- Datasets
- Documents
- Code packages
- Configuration files
- Any versioned resource

**Artifact Properties:**
- Unique ID
- Version
- Type
- Metadata
- Content (stored in object storage)
- Lineage information

### Workflows

Workflows define sequences of tasks executed by the DAG Engine:

```yaml
name: data_processing_pipeline
tasks:
  - id: extract
    type: extract
    config:
      source: s3://data/input.csv
  
  - id: transform
    type: transform
    depends_on: [extract]
    config:
      operations: [clean, normalize]
  
  - id: load
    type: load
    depends_on: [transform]
    config:
      destination: postgres://db/table
```

### Policies

Policies control access and behavior:

```yaml
name: rate_limit_policy
type: rate_limit
rules:
  - resource: rag-engine
    max_requests_per_minute: 100
  - resource: registry
    max_upload_size_mb: 1000
```

### Entities and Relationships

The Taxonomy Engine manages knowledge graphs:

```yaml
entities:
  - id: machine_learning
    type: concept
    properties:
      definition: "A subset of AI..."
  
  - id: deep_learning
    type: concept
    properties:
      definition: "A subset of ML..."

relationships:
  - source: deep_learning
    target: machine_learning
    type: is_subfield_of
```

---

## Engine Overview

### RAG Engine

**Purpose:** Retrieval-Augmented Generation for intelligent query processing

**Key Features:**
- Vector search
- Graph traversal
- Hybrid retrieval
- Multi-modal support

**Example Usage:**

```python
import requests

response = requests.post(
    "http://rag-engine:8080/api/v1/query",
    json={
        "query": "Explain quantum computing",
        "context_size": 5,
        "use_entity_extraction": True,
        "use_graph_traversal": True
    }
)

result = response.json()
print(f"Answer: {result['answer']}")
print(f"Quality Score: {result['quality_score']}")
print(f"Sources: {len(result['sources'])}")
```

### DAG Engine

**Purpose:** Workflow orchestration and dependency management

**Key Features:**
- DAG-based workflows
- Parallel execution
- Dependency resolution
- Retry logic

**Example Usage:**

```python
workflow = {
    "name": "ml_training_pipeline",
    "tasks": [
        {
            "id": "data_prep",
            "type": "python",
            "config": {
                "script": "prepare_data.py"
            }
        },
        {
            "id": "train_model",
            "type": "python",
            "depends_on": ["data_prep"],
            "config": {
                "script": "train.py",
                "resources": {
                    "gpu": 1,
                    "memory": "16Gi"
                }
            }
        },
        {
            "id": "evaluate",
            "type": "python",
            "depends_on": ["train_model"],
            "config": {
                "script": "evaluate.py"
            }
        }
    ]
}

response = requests.post(
    "http://dag-engine:8080/api/v1/workflows",
    json=workflow
)

workflow_id = response.json()["workflow_id"]
print(f"Workflow submitted: {workflow_id}")
```

### Governance Engine

**Purpose:** Policy enforcement, access control, and audit logging

**Key Features:**
- RBAC (Role-Based Access Control)
- Policy-as-code
- Audit logging
- Compliance reporting

**Example Usage:**

```python
# Create a policy
policy = {
    "name": "ml_model_access",
    "type": "rbac",
    "rules": [
        {
            "role": "data_scientist",
            "resources": ["ml_models"],
            "actions": ["read", "write"]
        },
        {
            "role": "viewer",
            "resources": ["ml_models"],
            "actions": ["read"]
        }
    ]
}

response = requests.post(
    "http://governance-engine:8080/api/v1/policies",
    json=policy
)

# Verify access
auth_check = {
    "user": "john.doe",
    "role": "data_scientist",
    "resource": "ml_models/model-v1",
    "action": "write"
}

response = requests.post(
    "http://governance-engine:8080/api/v1/auth/verify",
    json=auth_check
)

print(f"Access granted: {response.json()['allowed']}")
```

### Taxonomy Engine

**Purpose:** Knowledge graph management and entity recognition

**Key Features:**
- Ontology management
- Entity extraction
- Relationship mapping
- Graph queries

**Example Usage:**

```python
# Create entity
entity = {
    "id": "neural_networks",
    "type": "concept",
    "properties": {
        "definition": "Computing systems inspired by biological neural networks",
        "category": "machine_learning"
    }
}

requests.post(
    "http://taxonomy-engine:8080/api/v1/entities",
    json=entity
)

# Create relationship
relationship = {
    "source": "neural_networks",
    "target": "machine_learning",
    "type": "is_subfield_of",
    "properties": {
        "confidence": 1.0
    }
}

requests.post(
    "http://taxonomy-engine:8080/api/v1/relationships",
    json=relationship
)

# Query graph
query = {
    "start_entity": "neural_networks",
    "max_hops": 2,
    "relationship_types": ["is_subfield_of", "related_to"]
}

response = requests.post(
    "http://taxonomy-engine:8080/api/v1/graph/query",
    json=query
)

print(f"Found {len(response.json()['nodes'])} related concepts")
```

### Execution Engine

**Purpose:** Task execution with transaction support

**Key Features:**
- Distributed execution
- Transaction management
- Rollback support
- Resource management

**Example Usage:**

```python
# Execute task
task = {
    "type": "python",
    "config": {
        "script": "process_data.py",
        "args": ["--input", "data.csv"],
        "resources": {
            "cpu": "2",
            "memory": "4Gi"
        }
    },
    "transaction": {
        "enabled": True,
        "isolation_level": "read_committed"
    }
}

response = requests.post(
    "http://execution-engine:8080/api/v1/tasks",
    json=task
)

task_id = response.json()["task_id"]

# Monitor execution
status = requests.get(
    f"http://execution-engine:8080/api/v1/tasks/{task_id}"
).json()

print(f"Status: {status['state']}")
print(f"Progress: {status['progress']}%")
```

### Validation Engine

**Purpose:** Data and artifact validation

**Key Features:**
- Schema validation
- Data quality checks
- Model evaluation
- Test execution

**Example Usage:**

```python
# Validate data
validation_request = {
    "schema_id": "user_data_v1",
    "data": {
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30
    }
}

response = requests.post(
    "http://validation-engine:8080/api/v1/validate",
    json=validation_request
)

result = response.json()
print(f"Valid: {result['valid']}")
if not result['valid']:
    print(f"Errors: {result['errors']}")

# Evaluate model
evaluation = {
    "model_id": "model-v1.0.0",
    "test_dataset": "test_data.csv",
    "metrics": ["accuracy", "precision", "recall", "f1"]
}

response = requests.post(
    "http://validation-engine:8080/api/v1/evaluate",
    json=evaluation
)

metrics = response.json()["metrics"]
print(f"Accuracy: {metrics['accuracy']:.2%}")
print(f"F1 Score: {metrics['f1']:.2%}")
```

### Promotion Engine

**Purpose:** Artifact promotion and deployment

**Key Features:**
- Multi-environment support
- Deployment strategies (canary, blue-green, rolling)
- Approval workflows
- Automatic rollback

**Example Usage:**

```python
# Promote artifact
promotion = {
    "artifact_id": "model-v1.0.0",
    "source_environment": "staging",
    "target_environment": "production",
    "strategy": "canary",
    "canary_percentage": 10,
    "approval_required": True
}

response = requests.post(
    "http://promotion-engine:8080/api/v1/promotions",
    json=promotion
)

promotion_id = response.json()["promotion_id"]

# Approve promotion
approval = {
    "promotion_id": promotion_id,
    "approved": True,
    "approver": "john.doe",
    "comments": "Metrics look good"
}

requests.post(
    "http://promotion-engine:8080/api/v1/approvals",
    json=approval
)

# Monitor promotion
status = requests.get(
    f"http://promotion-engine:8080/api/v1/promotions/{promotion_id}"
).json()

print(f"Status: {status['state']}")
print(f"Canary Health: {status['canary_health']}")
```

### Artifact Registry

**Purpose:** Centralized artifact storage and versioning

**Key Features:**
- Version management
- Metadata storage
- Lineage tracking
- Access control

**Example Usage:**

```python
# Upload artifact
import base64

with open("model.pkl", "rb") as f:
    content = base64.b64encode(f.read()).decode()

artifact = {
    "name": "sentiment_model",
    "version": "1.0.0",
    "type": "ml_model",
    "content": content,
    "metadata": {
        "framework": "scikit-learn",
        "accuracy": 0.95,
        "training_date": "2024-01-10"
    }
}

response = requests.post(
    "http://registry:8080/api/v1/artifacts",
    json=artifact
)

artifact_id = response.json()["artifact_id"]
print(f"Artifact uploaded: {artifact_id}")

# Download artifact
response = requests.get(
    f"http://registry:8080/api/v1/artifacts/{artifact_id}/download"
)

content = base64.b64decode(response.content)
with open("downloaded_model.pkl", "wb") as f:
    f.write(content)

# Query artifacts
search = {
    "type": "ml_model",
    "metadata.framework": "scikit-learn",
    "metadata.accuracy": {"$gte": 0.9}
}

response = requests.post(
    "http://registry:8080/api/v1/artifacts/search",
    json=search
)

artifacts = response.json()["artifacts"]
print(f"Found {len(artifacts)} matching artifacts")
```

---

## Common Use Cases

### Use Case 1: ML Model Training Pipeline

```python
# 1. Upload training data
data_artifact = {
    "name": "training_data",
    "type": "dataset",
    "content": base64_encoded_data,
    "metadata": {"rows": 10000, "features": 50}
}

data_id = requests.post(
    "http://registry:8080/api/v1/artifacts",
    json=data_artifact
).json()["artifact_id"]

# 2. Create training workflow
workflow = {
    "name": "model_training",
    "tasks": [
        {
            "id": "validate_data",
            "type": "validation",
            "config": {"artifact_id": data_id}
        },
        {
            "id": "train",
            "type": "python",
            "depends_on": ["validate_data"],
            "config": {
                "script": "train.py",
                "args": [f"--data={data_id}"]
            }
        },
        {
            "id": "evaluate",
            "type": "validation",
            "depends_on": ["train"],
            "config": {"metrics": ["accuracy", "f1"]}
        }
    ]
}

workflow_id = requests.post(
    "http://dag-engine:8080/api/v1/workflows",
    json=workflow
).json()["workflow_id"]

# 3. Monitor training
while True:
    status = requests.get(
        f"http://dag-engine:8080/api/v1/workflows/{workflow_id}"
    ).json()
    
    if status["state"] == "completed":
        print("Training completed!")
        model_id = status["outputs"]["model_id"]
        break
    
    time.sleep(10)

# 4. Promote to production
promotion = {
    "artifact_id": model_id,
    "source_environment": "staging",
    "target_environment": "production",
    "strategy": "canary"
}

requests.post(
    "http://promotion-engine:8080/api/v1/promotions",
    json=promotion
)
```

### Use Case 2: Document Q&A System

```python
# 1. Upload documents
for doc_path in document_paths:
    with open(doc_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    
    artifact = {
        "name": os.path.basename(doc_path),
        "type": "document",
        "content": content
    }
    
    doc_id = requests.post(
        "http://registry:8080/api/v1/artifacts",
        json=artifact
    ).json()["artifact_id"]
    
    # 2. Index document
    requests.post(
        "http://rag-engine:8080/api/v1/index",
        json={"artifact_id": doc_id}
    )

# 3. Query documents
query = {
    "query": "What are the key findings?",
    "context_size": 5,
    "use_entity_extraction": True
}

response = requests.post(
    "http://rag-engine:8080/api/v1/query",
    json=query
).json()

print(f"Answer: {response['answer']}")
print(f"Sources: {[s['name'] for s in response['sources']]}")
```

### Use Case 3: Data Processing Pipeline

```python
# Create ETL workflow
workflow = {
    "name": "etl_pipeline",
    "tasks": [
        {
            "id": "extract",
            "type": "extract",
            "config": {
                "source": "s3://data/raw/",
                "format": "parquet"
            }
        },
        {
            "id": "validate",
            "type": "validation",
            "depends_on": ["extract"],
            "config": {
                "schema": "data_schema_v1",
                "quality_checks": ["completeness", "accuracy"]
            }
        },
        {
            "id": "transform",
            "type": "transform",
            "depends_on": ["validate"],
            "config": {
                "operations": [
                    {"type": "clean", "params": {}},
                    {"type": "normalize", "params": {}},
                    {"type": "enrich", "params": {"taxonomy": True}}
                ]
            }
        },
        {
            "id": "load",
            "type": "load",
            "depends_on": ["transform"],
            "config": {
                "destination": "postgres://db/processed_data",
                "mode": "append"
            }
        }
    ]
}

workflow_id = requests.post(
    "http://dag-engine:8080/api/v1/workflows",
    json=workflow
).json()["workflow_id"]
```

---

## Best Practices

### 1. Artifact Management

**DO:**
- Use semantic versioning (e.g., 1.0.0, 1.1.0, 2.0.0)
- Include comprehensive metadata
- Tag artifacts appropriately
- Document artifact lineage

**DON'T:**
- Store large artifacts without compression
- Skip validation before upload
- Use generic names
- Forget to clean up old versions

### 2. Workflow Design

**DO:**
- Break workflows into small, reusable tasks
- Use proper dependency management
- Implement retry logic
- Add monitoring and logging

**DON'T:**
- Create monolithic workflows
- Ignore error handling
- Skip resource limits
- Hardcode configuration

### 3. Security

**DO:**
- Use RBAC for access control
- Encrypt sensitive data
- Rotate credentials regularly
- Audit all operations

**DON'T:**
- Store secrets in code
- Use overly permissive policies
- Skip authentication
- Ignore audit logs

### 4. Performance

**DO:**
- Use caching where appropriate
- Implement rate limiting
- Monitor resource usage
- Optimize queries

**DON'T:**
- Make synchronous calls for long operations
- Ignore connection pooling
- Skip indexing
- Over-provision resources

### 5. Monitoring

**DO:**
- Set up alerts for critical metrics
- Monitor latency percentiles (P50, P95, P99)
- Track error rates
- Review audit logs regularly

**DON'T:**
- Rely only on averages
- Ignore warning signs
- Skip capacity planning
- Forget to test alerts

---

## Troubleshooting

### Common Issues

#### Issue: High Latency

**Symptoms:**
- Slow query responses
- Timeout errors
- Queue buildup

**Solutions:**
1. Check resource utilization
2. Review cache hit rates
3. Optimize database queries
4. Scale horizontally

#### Issue: Failed Workflows

**Symptoms:**
- Tasks stuck in pending state
- Execution errors
- Resource exhaustion

**Solutions:**
1. Check task logs
2. Verify resource limits
3. Review dependencies
4. Check for deadlocks

#### Issue: Authentication Failures

**Symptoms:**
- 401/403 errors
- Access denied messages
- Policy violations

**Solutions:**
1. Verify credentials
2. Check RBAC policies
3. Review audit logs
4. Validate token expiration

### Getting Help

- **Documentation:** https://docs.mcp.io
- **Community Forum:** https://community.mcp.io
- **GitHub Issues:** https://github.com/mcp/mcp-level3/issues
- **Slack Channel:** #mcp-support

---

**Last Updated:** 2024-01-10  
**Version:** 1.0.0