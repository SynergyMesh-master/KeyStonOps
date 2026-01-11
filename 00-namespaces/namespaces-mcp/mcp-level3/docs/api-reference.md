# MCP Level 3 - API Reference

## Overview

This document provides comprehensive API reference for all MCP Level 3 engines.

**Base URL:** `http://<engine-host>:8080/api/v1`

**Authentication:** Bearer token in Authorization header

**Content-Type:** `application/json`

---

## RAG Engine API

### Query Endpoint

**POST** `/rag/query`

Submit a query for retrieval-augmented generation.

**Request Body:**
```json
{
  "query": "string (required)",
  "context_size": "integer (optional, default: 5)",
  "use_entity_extraction": "boolean (optional, default: false)",
  "use_graph_traversal": "boolean (optional, default: false)",
  "max_hops": "integer (optional, default: 2)",
  "filters": {
    "type": "string (optional)",
    "date_range": {
      "start": "ISO8601 datetime",
      "end": "ISO8601 datetime"
    }
  }
}
```

**Response:**
```json
{
  "answer": "string",
  "quality_score": "float (0-1)",
  "entities": [
    {
      "text": "string",
      "type": "string",
      "confidence": "float"
    }
  ],
  "sources": [
    {
      "artifact_id": "string",
      "name": "string",
      "relevance_score": "float",
      "excerpt": "string"
    }
  ],
  "graph_path": [
    {
      "node": "string",
      "relationship": "string"
    }
  ],
  "metadata": {
    "latency_ms": "integer",
    "tokens_used": "integer"
  }
}
```

**Status Codes:**
- `200 OK` - Query successful
- `400 Bad Request` - Invalid query
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://rag-engine:8080/api/v1/rag/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "context_size": 5,
    "use_entity_extraction": true
  }'
```

### Index Document

**POST** `/rag/index`

Index a document for retrieval.

**Request Body:**
```json
{
  "artifact_id": "string (required)",
  "chunk_size": "integer (optional, default: 512)",
  "chunk_overlap": "integer (optional, default: 50)",
  "extract_entities": "boolean (optional, default: true)"
}
```

**Response:**
```json
{
  "job_id": "string",
  "status": "pending|running|completed|failed",
  "chunks_created": "integer",
  "entities_extracted": "integer"
}
```

### Vector Search

**POST** `/rag/search/vector`

Perform vector similarity search.

**Request Body:**
```json
{
  "query_vector": "array of floats (required)",
  "top_k": "integer (optional, default: 10)",
  "filters": "object (optional)"
}
```

**Response:**
```json
{
  "results": [
    {
      "chunk_id": "string",
      "score": "float",
      "content": "string",
      "metadata": "object"
    }
  ]
}
```

---

## DAG Engine API

### Create Workflow

**POST** `/dag/workflows`

Create and submit a new workflow.

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "tasks": [
    {
      "id": "string (required)",
      "type": "string (required)",
      "depends_on": ["string"] (optional),
      "config": "object (required)",
      "retry": {
        "max_attempts": "integer (default: 3)",
        "backoff_seconds": "integer (default: 60)"
      },
      "timeout_seconds": "integer (optional)"
    }
  ],
  "schedule": {
    "cron": "string (optional)",
    "timezone": "string (optional)"
  }
}
```

**Response:**
```json
{
  "workflow_id": "string",
  "state": "pending|running|completed|failed",
  "created_at": "ISO8601 datetime",
  "estimated_duration_seconds": "integer"
}
```

**Status Codes:**
- `201 Created` - Workflow created
- `400 Bad Request` - Invalid workflow definition
- `409 Conflict` - Workflow name already exists

### Get Workflow Status

**GET** `/dag/workflows/{workflow_id}`

Get workflow execution status.

**Response:**
```json
{
  "workflow_id": "string",
  "name": "string",
  "state": "pending|running|completed|failed",
  "tasks": [
    {
      "id": "string",
      "status": "pending|running|success|failed",
      "started_at": "ISO8601 datetime",
      "completed_at": "ISO8601 datetime",
      "duration_seconds": "integer",
      "error": "string (if failed)"
    }
  ],
  "progress": "float (0-100)",
  "created_at": "ISO8601 datetime",
  "updated_at": "ISO8601 datetime"
}
```

### Cancel Workflow

**DELETE** `/dag/workflows/{workflow_id}`

Cancel a running workflow.

**Response:**
```json
{
  "workflow_id": "string",
  "state": "cancelled",
  "cancelled_at": "ISO8601 datetime"
}
```

---

## Governance Engine API

### Verify Authorization

**POST** `/governance/auth/verify`

Verify user authorization for an action.

**Request Body:**
```json
{
  "user": "string (required)",
  "resource": "string (required)",
  "action": "string (required)",
  "context": "object (optional)"
}
```

**Response:**
```json
{
  "allowed": "boolean",
  "reason": "string (if denied)",
  "policy_id": "string",
  "evaluated_at": "ISO8601 datetime"
}
```

### Create Policy

**POST** `/governance/policies`

Create a new policy.

**Request Body:**
```json
{
  "name": "string (required)",
  "type": "rbac|rate_limit|compliance (required)",
  "rules": [
    {
      "condition": "string (CEL expression)",
      "action": "allow|deny",
      "priority": "integer"
    }
  ],
  "enabled": "boolean (default: true)"
}
```

**Response:**
```json
{
  "policy_id": "string",
  "name": "string",
  "created_at": "ISO8601 datetime"
}
```

### Get Audit Logs

**GET** `/governance/audit/logs`

Retrieve audit logs.

**Query Parameters:**
- `user` - Filter by user
- `resource` - Filter by resource
- `action` - Filter by action
- `start_time` - Start of time range (ISO8601)
- `end_time` - End of time range (ISO8601)
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "entries": [
    {
      "id": "string",
      "timestamp": "ISO8601 datetime",
      "user": "string",
      "action": "string",
      "resource": "string",
      "result": "success|failure",
      "ip_address": "string",
      "metadata": "object"
    }
  ],
  "total": "integer",
  "limit": "integer",
  "offset": "integer"
}
```

---

## Taxonomy Engine API

### Create Entity

**POST** `/taxonomy/entities`

Create a new entity.

**Request Body:**
```json
{
  "id": "string (required)",
  "type": "string (required)",
  "properties": "object (required)",
  "aliases": ["string"] (optional)
}
```

**Response:**
```json
{
  "entity_id": "string",
  "created_at": "ISO8601 datetime"
}
```

### Create Relationship

**POST** `/taxonomy/relationships`

Create a relationship between entities.

**Request Body:**
```json
{
  "source": "string (required)",
  "target": "string (required)",
  "type": "string (required)",
  "properties": "object (optional)",
  "bidirectional": "boolean (default: false)"
}
```

**Response:**
```json
{
  "relationship_id": "string",
  "created_at": "ISO8601 datetime"
}
```

### Query Graph

**POST** `/taxonomy/graph/query`

Query the knowledge graph.

**Request Body:**
```json
{
  "start_entity": "string (required)",
  "max_hops": "integer (optional, default: 2)",
  "relationship_types": ["string"] (optional),
  "filters": "object (optional)"
}
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "string",
      "type": "string",
      "properties": "object"
    }
  ],
  "edges": [
    {
      "source": "string",
      "target": "string",
      "type": "string",
      "properties": "object"
    }
  ],
  "paths": [
    {
      "nodes": ["string"],
      "length": "integer"
    }
  ]
}
```

---

## Execution Engine API

### Execute Task

**POST** `/execution/tasks`

Execute a task.

**Request Body:**
```json
{
  "type": "python|shell|docker (required)",
  "config": {
    "script": "string (for python/shell)",
    "image": "string (for docker)",
    "args": ["string"],
    "env": "object",
    "resources": {
      "cpu": "string",
      "memory": "string",
      "gpu": "integer"
    }
  },
  "transaction": {
    "enabled": "boolean (default: false)",
    "isolation_level": "read_uncommitted|read_committed|repeatable_read|serializable"
  },
  "timeout_seconds": "integer (optional)"
}
```

**Response:**
```json
{
  "task_id": "string",
  "state": "pending|running|completed|failed",
  "created_at": "ISO8601 datetime"
}
```

### Get Task Status

**GET** `/execution/tasks/{task_id}`

Get task execution status.

**Response:**
```json
{
  "task_id": "string",
  "state": "pending|running|completed|failed",
  "progress": "float (0-100)",
  "started_at": "ISO8601 datetime",
  "completed_at": "ISO8601 datetime",
  "duration_seconds": "integer",
  "result": "object (if completed)",
  "error": "string (if failed)",
  "logs": "string"
}
```

---

## Validation Engine API

### Validate Data

**POST** `/validation/validate`

Validate data against a schema.

**Request Body:**
```json
{
  "schema_id": "string (required)",
  "data": "object (required)",
  "strict": "boolean (default: true)"
}
```

**Response:**
```json
{
  "valid": "boolean",
  "errors": [
    {
      "field": "string",
      "message": "string",
      "code": "string"
    }
  ],
  "warnings": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

### Evaluate Model

**POST** `/validation/evaluate`

Evaluate a model's performance.

**Request Body:**
```json
{
  "model_id": "string (required)",
  "test_dataset": "string (required)",
  "metrics": ["accuracy", "precision", "recall", "f1"],
  "threshold": "float (optional)"
}
```

**Response:**
```json
{
  "evaluation_id": "string",
  "metrics": {
    "accuracy": "float",
    "precision": "float",
    "recall": "float",
    "f1": "float"
  },
  "passed": "boolean",
  "report_url": "string"
}
```

---

## Promotion Engine API

### Create Promotion

**POST** `/promotion/promotions`

Promote an artifact to another environment.

**Request Body:**
```json
{
  "artifact_id": "string (required)",
  "source_environment": "string (required)",
  "target_environment": "string (required)",
  "strategy": "canary|blue_green|rolling (required)",
  "canary_percentage": "integer (for canary)",
  "approval_required": "boolean (default: false)",
  "rollback_on_failure": "boolean (default: true)"
}
```

**Response:**
```json
{
  "promotion_id": "string",
  "state": "pending_approval|in_progress|completed|failed|rolled_back",
  "created_at": "ISO8601 datetime"
}
```

### Approve Promotion

**POST** `/promotion/approvals`

Approve a pending promotion.

**Request Body:**
```json
{
  "promotion_id": "string (required)",
  "approved": "boolean (required)",
  "approver": "string (required)",
  "comments": "string (optional)"
}
```

**Response:**
```json
{
  "approval_id": "string",
  "promotion_id": "string",
  "approved": "boolean",
  "approved_at": "ISO8601 datetime"
}
```

---

## Artifact Registry API

### Upload Artifact

**POST** `/registry/artifacts`

Upload a new artifact.

**Request Body:**
```json
{
  "name": "string (required)",
  "version": "string (optional, auto-generated if not provided)",
  "type": "string (required)",
  "content": "base64 string (required)",
  "metadata": "object (optional)",
  "tags": ["string"] (optional)
}
```

**Response:**
```json
{
  "artifact_id": "string",
  "version": "string",
  "checksum": "string (SHA-256)",
  "size_bytes": "integer",
  "created_at": "ISO8601 datetime",
  "download_url": "string"
}
```

### Download Artifact

**GET** `/registry/artifacts/{artifact_id}/download`

Download an artifact.

**Query Parameters:**
- `version` - Specific version (optional, defaults to latest)

**Response:**
- Binary content with appropriate Content-Type header

### Search Artifacts

**POST** `/registry/artifacts/search`

Search for artifacts.

**Request Body:**
```json
{
  "query": "string (optional)",
  "type": "string (optional)",
  "tags": ["string"] (optional),
  "metadata": "object (optional)",
  "date_range": {
    "start": "ISO8601 datetime",
    "end": "ISO8601 datetime"
  },
  "limit": "integer (default: 100)",
  "offset": "integer (default: 0)"
}
```

**Response:**
```json
{
  "artifacts": [
    {
      "artifact_id": "string",
      "name": "string",
      "version": "string",
      "type": "string",
      "size_bytes": "integer",
      "created_at": "ISO8601 datetime",
      "metadata": "object",
      "tags": ["string"]
    }
  ],
  "total": "integer",
  "limit": "integer",
  "offset": "integer"
}
```

---

## Error Responses

All APIs use consistent error response format:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)",
    "request_id": "string"
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST` - Malformed request
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Rate Limits

Default rate limits per API key:
- **RAG Engine:** 1000 requests/minute
- **DAG Engine:** 500 requests/minute
- **Governance Engine:** 5000 requests/minute
- **Taxonomy Engine:** 1000 requests/minute
- **Execution Engine:** 200 requests/minute
- **Validation Engine:** 500 requests/minute
- **Promotion Engine:** 100 requests/minute
- **Artifact Registry:** 500 requests/minute

Rate limit headers:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time (Unix timestamp)

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit` - Number of results per page (max: 1000)
- `offset` - Number of results to skip
- `sort` - Sort field
- `order` - Sort order (asc|desc)

**Response Headers:**
- `X-Total-Count` - Total number of results
- `Link` - Pagination links (first, prev, next, last)

---

## Webhooks

Configure webhooks to receive event notifications:

**POST** `/webhooks`

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["workflow.completed", "artifact.uploaded"],
  "secret": "string (for signature verification)"
}
```

**Webhook Payload:**
```json
{
  "event": "string",
  "timestamp": "ISO8601 datetime",
  "data": "object",
  "signature": "HMAC-SHA256 signature"
}
```

---

**API Version:** v1  
**Last Updated:** 2024-01-10  
**OpenAPI Spec:** Available at `/api/v1/openapi.json`