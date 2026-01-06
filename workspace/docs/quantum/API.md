# QuantumFlow Toolkit API Documentation

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, the API does not require authentication. In production, API keys or OAuth2 should be implemented.

## Endpoints

### Health Checks

#### GET /api/health

Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00",
  "version": "1.0.0"
}
```

#### GET /api/health/ready

Readiness check endpoint. Verifies that the application is ready to serve traffic.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00",
  "checks": {
    "database": "ok"
  }
}
```

#### GET /api/health/live

Liveness check endpoint. Verifies that the application is alive.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-01-15T10:30:00"
}
```

### Workflows

#### POST /api/workflows

Create a new workflow.

**Request Body:**
```json
{
  "name": "My Workflow",
  "tasks": [
    {
      "type": "classical",
      "config": {
        "operation": "preprocess",
        "data": [1.0, 2.0, 3.0]
      },
      "dependencies": []
    },
    {
      "type": "quantum",
      "config": {
        "circuit": "simple_x",
        "shots": 100,
        "backend": "cirq",
        "backend_type": "simulator"
      },
      "dependencies": [0]
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "workflow_id": 1,
  "name": "My Workflow",
  "status": "pending",
  "created_at": "2025-01-15T10:30:00",
  "task_count": 2
}
```

#### GET /api/workflows

List workflows with pagination.

**Query Parameters:**
- `limit` (int, default: 100): Maximum number of workflows to return
- `offset` (int, default: 0): Number of workflows to skip

**Response:**
```json
[
  {
    "workflow_id": 1,
    "name": "My Workflow",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00",
    "task_count": 2
  }
]
```

#### GET /api/workflows/{workflow_id}

Get workflow details by ID.

**Response:**
```json
{
  "workflow_id": 1,
  "name": "My Workflow",
  "status": "completed",
  "created_at": "2025-01-15T10:30:00",
  "started_at": "2025-01-15T10:31:00",
  "completed_at": "2025-01-15T10:32:00",
  "tasks": [
    {
      "id": 0,
      "type": "classical",
      "status": "completed",
      "error": null
    },
    {
      "id": 1,
      "type": "quantum",
      "status": "completed",
      "error": null
    }
  ]
}
```

#### POST /api/workflows/{workflow_id}/execute

Execute a workflow.

**Response:**
```json
{
  "workflow_id": 1,
  "name": "My Workflow",
  "status": "completed",
  "results": {
    "0": 2.0,
    "1": {
      "result": {"0": 50, "1": 50},
      "backend": "cirq",
      "backend_type": "simulator"
    }
  }
}
```

### Performance Metrics

#### GET /api/performance/{workflow_id}

Get performance metrics for a workflow.

**Response:**
```json
[
  {
    "workflow_id": 1,
    "task_id": 0,
    "runtime": 0.123,
    "circuit_depth": null,
    "shots": null,
    "memory_usage": 1024000,
    "cpu_usage": 15.5,
    "timestamp": "2025-01-15T10:32:00"
  },
  {
    "workflow_id": 1,
    "task_id": 1,
    "runtime": 0.456,
    "circuit_depth": 5,
    "shots": 100,
    "memory_usage": 2048000,
    "cpu_usage": 25.3,
    "timestamp": "2025-01-15T10:32:00"
  }
]
```

#### GET /api/performance/{workflow_id}/{task_id}

Get performance metrics for a specific task.

**Response:**
```json
{
  "workflow_id": 1,
  "task_id": 1,
  "runtime": 0.456,
  "circuit_depth": 5,
  "shots": 100,
  "memory_usage": 2048000,
  "cpu_usage": 25.3,
  "timestamp": "2025-01-15T10:32:00"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message",
  "details": {},
  "type": "ErrorType"
}
```

### Status Codes

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

## Rate Limiting

Rate limiting is enabled by default (60 requests per minute). When exceeded, a `429 Too Many Requests` response is returned.

## Examples

### Python

```python
import requests

# Create workflow
response = requests.post(
    "http://localhost:8000/api/workflows",
    json={
        "name": "Test Workflow",
        "tasks": [
            {
                "type": "quantum",
                "config": {
                    "circuit": "simple_x",
                    "shots": 100,
                    "backend": "cirq"
                }
            }
        ]
    }
)
workflow_id = response.json()["workflow_id"]

# Execute workflow
response = requests.post(
    f"http://localhost:8000/api/workflows/{workflow_id}/execute"
)
results = response.json()
```

### cURL

```bash
# Create workflow
curl -X POST http://localhost:8000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "tasks": [{
      "type": "quantum",
      "config": {
        "circuit": "simple_x",
        "shots": 100,
        "backend": "cirq"
      }
    }]
  }'

# Execute workflow
curl -X POST http://localhost:8000/api/workflows/1/execute
```

