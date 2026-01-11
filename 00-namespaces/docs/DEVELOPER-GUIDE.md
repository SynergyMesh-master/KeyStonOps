# MCP Level 3 - Developer Guide

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Development Setup](#development-setup)
4. [Code Structure](#code-structure)
5. [API Usage Examples](#api-usage-examples)
6. [Extension Development](#extension-development)
7. [Testing Guide](#testing-guide)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or later
- TypeScript 5.x
- Docker (for local testing)
- kubectl (for Kubernetes deployment)
- Git

### Quick Start

```bash
# Clone repository
git clone https://github.com/MachineNativeOps/machine-native-ops.git
cd machine-native-ops/00-namespaces/namespaces-mcp

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  MCP Level 3 Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Layer (REST/GraphQL)                │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────┴─────────────────────────────────┐  │
│  │           Semantic Control Plane                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │ Validation   │  │ Promotion    │  │ Artifact  │ │  │
│  │  │ Engine       │  │ Engine       │  │ Registry  │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  │                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │ RAG Engine   │  │ DAG Engine   │  │ Taxonomy  │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  │                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │ Execution    │  │ Governance   │  │ Monitoring│ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  │                                                      │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │              Storage & Infrastructure                │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  S3/GCS/Azure  │  Redis  │  Prometheus  │  Grafana  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
User Request
    ↓
API Gateway
    ↓
┌───────────────────────────────────────┐
│   Validation Engine                   │
│   - Schema validation                 │
│   - Data quality check                │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│   Artifact Registry                   │
│   - Store validated data              │
│   - Version management                │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│   Promotion Engine                    │
│   - Request approval                  │
│   - Execute promotion                 │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│   Governance Engine                   │
│   - Audit logging                     │
│   - Compliance check                  │
└───────────────────────────────────────┘
```

---

## 💻 Development Setup

### Environment Setup

```bash
# Create .env file
cat > .env <<EOF
NODE_ENV=development
LOG_LEVEL=debug
CACHE_SIZE=1000
CACHE_TTL=60000
STORAGE_BACKEND=local
STORAGE_PATH=/tmp/mcp-artifacts
EOF

# Install development tools
npm install -g typescript ts-node nodemon

# Setup Git hooks
npm run prepare
```

### IDE Configuration

#### VS Code

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

#### WebStorm

```
Settings → Languages & Frameworks → TypeScript
- TypeScript version: Use TypeScript from node_modules
- Enable TypeScript Language Service

Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
- Automatic ESLint configuration
- Run eslint --fix on save
```

---

## 📁 Code Structure

```
namespaces-mcp/
├── src/
│   ├── semantic/                 # Semantic Control Plane
│   │   ├── validation-engine.ts  # Data validation
│   │   ├── promotion-engine.ts   # Release promotion
│   │   ├── artifact-registry.ts  # Artifact management
│   │   ├── rag-engine.ts        # RAG processing
│   │   ├── dag-engine.ts        # DAG management
│   │   ├── taxonomy-engine.ts   # Taxonomy management
│   │   ├── execution-engine.ts  # Task execution
│   │   ├── governance-engine.ts # Governance & compliance
│   │   ├── index.ts             # Main exports
│   │   └── __tests__/           # Test files
│   │       ├── validation-engine.test.ts
│   │       ├── promotion-engine.test.ts
│   │       ├── artifact-registry.test.ts
│   │       └── performance.test.ts
│   ├── api/                     # API layer (future)
│   ├── utils/                   # Utility functions
│   └── types/                   # TypeScript types
├── k8s/                         # Kubernetes manifests
│   ├── deployment.yaml
│   ├── monitoring.yaml
│   └── backup-cronjob.yaml
├── docs/                        # Documentation
├── scripts/                     # Build & deployment scripts
├── openapi.yaml                 # API specification
├── tsconfig.json               # TypeScript config
├── package.json                # NPM config
└── README.md                   # Project README
```

---

## 🔧 API Usage Examples

### Validation Engine

#### Register Schema

```typescript
import { ValidationEngine, ValidationSchema } from './semantic';

const engine = new ValidationEngine({
  enableCache: true,
  cacheSize: 10000,
  cacheTTL: 300000,
});

// Register JSON Schema
const schema: ValidationSchema = {
  id: 'user-schema',
  name: 'User Schema',
  version: '1.0.0',
  format: 'json-schema',
  schema: {
    type: 'object',
    required: ['name', 'email', 'age'],
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' },
      age: { type: 'number', minimum: 0, maximum: 150 },
    },
  },
  rules: [
    {
      id: 'email-format',
      name: 'Email Format',
      type: 'format',
      field: 'email',
      constraint: 'email',
      severity: 'error',
      message: 'Invalid email format',
    },
  ],
};

engine.registerSchema(schema);
```

#### Validate Data

```typescript
// Validate data
const result = await engine.validate('user-schema', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

if (result.valid) {
  console.log('✅ Validation passed');
} else {
  console.log('❌ Validation failed');
  result.errors.forEach(error => {
    console.log(`  - ${error.field}: ${error.message}`);
  });
}

// Check data quality
const data = [
  { name: 'John', email: 'john@example.com', age: 30 },
  { name: 'Jane', email: 'jane@example.com', age: 25 },
];

const quality = await engine.checkQuality(data);
console.log('Quality Metrics:', {
  completeness: `${(quality.completeness * 100).toFixed(2)}%`,
  accuracy: `${(quality.accuracy * 100).toFixed(2)}%`,
  consistency: `${(quality.consistency * 100).toFixed(2)}%`,
  overall: `${(quality.overall * 100).toFixed(2)}%`,
});
```

### Promotion Engine

#### Request Promotion

```typescript
import { PromotionEngine, PromotionRequest } from './semantic';

const engine = new PromotionEngine({
  approvalPolicies: [
    {
      stage: 'staging',
      requiredApprovals: 1,
      approvers: ['dev-lead'],
    },
    {
      stage: 'prod',
      requiredApprovals: 2,
      approvers: ['tech-lead', 'product-manager'],
    },
  ],
  autoRollback: true,
  rollbackTimeout: 30000,
});

// Request promotion
const request: PromotionRequest = {
  id: 'promo-001',
  artifactId: 'my-app@1.0.0',
  version: '1.0.0',
  fromStage: 'dev',
  toStage: 'staging',
  requestedBy: 'developer@example.com',
  requestedAt: new Date(),
  reason: 'New feature release',
};

const promotion = await engine.requestPromotion(request);
console.log('Promotion created:', promotion.id);
console.log('Status:', promotion.status);
console.log('Approvals required:', promotion.approvals.length);
```

#### Approve Promotion

```typescript
// Approve promotion
await engine.approvePromotion('promo-001', 'dev-lead', 'Looks good!');

// Check status
const updated = engine.getPromotion('promo-001');
console.log('Status:', updated?.status);

// Rollback if needed
if (updated?.status === 'completed') {
  await engine.rollbackPromotion('promo-001', 'operator', 'Service unhealthy');
}
```

### Artifact Registry

#### Publish Artifact

```typescript
import { ArtifactRegistry, ArtifactMetadata } from './semantic';

const registry = new ArtifactRegistry({
  storage: {
    backend: 's3',
    bucket: 'my-artifacts',
    region: 'us-east-1',
  },
  retentionDays: 90,
  maxVersions: 10,
  enableDeduplication: true,
});

// Publish artifact
const data = Buffer.from('artifact content');
const metadata: ArtifactMetadata = {
  description: 'My application v1.0.0',
  author: 'developer@example.com',
  tags: ['production', 'v1'],
  buildInfo: {
    buildId: 'build-123',
    buildTime: new Date(),
    commitHash: 'abc123',
    branch: 'main',
    environment: 'production',
  },
};

const artifact = await registry.publish(
  'my-app',
  '1.0.0',
  'tar.gz',
  data,
  metadata
);

console.log('Artifact published:', artifact.id);
console.log('Checksum:', artifact.checksum);
console.log('Size:', artifact.size);
```

#### Download Artifact

```typescript
// Download artifact
const data = await registry.download('my-app@1.0.0');
console.log('Downloaded:', data.length, 'bytes');

// Get latest version
const latest = registry.getLatestVersion('my-app');
console.log('Latest version:', latest?.version);

// Search artifacts
const results = registry.search({
  tags: ['production'],
  author: 'developer@example.com',
  limit: 10,
});

console.log('Found:', results.total, 'artifacts');
results.artifacts.forEach(artifact => {
  console.log(`  - ${artifact.name}@${artifact.version}`);
});
```

---

## 🔌 Extension Development

### Creating Custom Validators

```typescript
import { ValidationRule } from './semantic';

// Custom validation rule
const customRule: ValidationRule = {
  id: 'custom-business-rule',
  name: 'Custom Business Rule',
  type: 'custom',
  field: 'orderAmount',
  constraint: (value: number) => {
    // Custom validation logic
    if (value < 0) {
      return { valid: false, message: 'Order amount cannot be negative' };
    }
    if (value > 10000) {
      return { valid: false, message: 'Order amount exceeds limit' };
    }
    return { valid: true };
  },
  severity: 'error',
};

// Register schema with custom rule
engine.registerSchema({
  id: 'order-schema',
  name: 'Order Schema',
  version: '1.0.0',
  format: 'json-schema',
  schema: { type: 'object' },
  rules: [customRule],
});
```

### Custom Storage Backend

```typescript
import { StorageBackendManager } from './semantic';

class CustomStorageBackend extends StorageBackendManager {
  async upload(path: string, data: Buffer, metadata?: Record<string, any>): Promise<void> {
    // Implement custom upload logic
    console.log(`Uploading to custom backend: ${path}`);
    // ... your implementation
  }

  async download(path: string): Promise<Buffer> {
    // Implement custom download logic
    console.log(`Downloading from custom backend: ${path}`);
    // ... your implementation
    return Buffer.from('data');
  }

  async delete(path: string): Promise<void> {
    // Implement custom delete logic
    console.log(`Deleting from custom backend: ${path}`);
    // ... your implementation
  }

  async exists(path: string): Promise<boolean> {
    // Implement custom exists check
    console.log(`Checking existence in custom backend: ${path}`);
    // ... your implementation
    return true;
  }
}
```

### Event Listeners

```typescript
// Listen to validation events
engine.on('validation:passed', ({ schemaId, result }) => {
  console.log(`✅ Validation passed for schema: ${schemaId}`);
});

engine.on('validation:failed', ({ schemaId, result }) => {
  console.log(`❌ Validation failed for schema: ${schemaId}`);
  console.log('Errors:', result.errors.length);
});

// Listen to promotion events
promotionEngine.on('promotion:requested', ({ promotion }) => {
  console.log(`📝 Promotion requested: ${promotion.id}`);
});

promotionEngine.on('promotion:completed', ({ promotion }) => {
  console.log(`✅ Promotion completed: ${promotion.id}`);
});

promotionEngine.on('promotion:rolled-back', ({ promotion }) => {
  console.log(`⏪ Promotion rolled back: ${promotion.id}`);
});

// Listen to artifact events
registry.on('artifact:published', ({ artifact }) => {
  console.log(`📦 Artifact published: ${artifact.id}`);
});

registry.on('artifact:downloaded', ({ artifactId }) => {
  console.log(`⬇️ Artifact downloaded: ${artifactId}`);
});
```

---

## 🧪 Testing Guide

### Unit Testing

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import ValidationEngine from '../validation-engine';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  it('should validate data successfully', async () => {
    engine.registerSchema({
      id: 'test-schema',
      name: 'Test Schema',
      version: '1.0.0',
      format: 'json-schema',
      schema: {
        type: 'object',
        required: ['name'],
      },
    });

    const result = await engine.validate('test-schema', { name: 'Test' });
    expect(result.valid).toBe(true);
  });

  it('should detect validation errors', async () => {
    engine.registerSchema({
      id: 'test-schema',
      name: 'Test Schema',
      version: '1.0.0',
      format: 'json-schema',
      schema: {
        type: 'object',
        required: ['name'],
      },
    });

    const result = await engine.validate('test-schema', {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### Integration Testing

```typescript
describe('Integration Tests', () => {
  it('should handle end-to-end workflow', async () => {
    const validation = new ValidationEngine();
    const promotion = new PromotionEngine({
      approvalPolicies: [
        {
          stage: 'staging',
          requiredApprovals: 1,
          approvers: ['dev-lead'],
          autoApprove: true,
        },
      ],
    });
    const registry = new ArtifactRegistry({
      storage: {
        backend: 'local',
        basePath: '/tmp/test',
      },
    });

    // 1. Validate
    validation.registerSchema({
      id: 'test-schema',
      name: 'Test Schema',
      version: '1.0.0',
      format: 'json-schema',
      schema: { type: 'object' },
    });

    const validationResult = await validation.validate('test-schema', { test: 'data' });
    expect(validationResult.valid).toBe(true);

    // 2. Publish
    const artifact = await registry.publish(
      'test-app',
      '1.0.0',
      'tar.gz',
      Buffer.from('test')
    );
    expect(artifact.id).toBe('test-app@1.0.0');

    // 3. Promote
    const promotionRequest = await promotion.requestPromotion({
      id: 'test-promo',
      artifactId: artifact.id,
      version: '1.0.0',
      fromStage: 'dev',
      toStage: 'staging',
      requestedBy: 'test',
      requestedAt: new Date(),
    });
    expect(promotionRequest.status).toBe('completed');
  });
});
```

### Performance Testing

```typescript
describe('Performance Tests', () => {
  it('should handle 1K concurrent validations', async () => {
    const engine = new ValidationEngine();
    engine.registerSchema({
      id: 'perf-schema',
      name: 'Performance Schema',
      version: '1.0.0',
      format: 'json-schema',
      schema: { type: 'object' },
    });

    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      promises.push(engine.validate('perf-schema', { id: i }));
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // <1 second
  });
});
```

---

## 📚 Best Practices

### Code Style

```typescript
// ✅ Good: Use descriptive names
async function validateUserData(data: UserData): Promise<ValidationResult> {
  // ...
}

// ❌ Bad: Use cryptic names
async function vud(d: any): Promise<any> {
  // ...
}

// ✅ Good: Use TypeScript types
interface UserData {
  name: string;
  email: string;
  age: number;
}

// ❌ Bad: Use any
function processData(data: any): any {
  // ...
}

// ✅ Good: Handle errors properly
try {
  await engine.validate('schema-id', data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}

// ❌ Bad: Ignore errors
await engine.validate('schema-id', data).catch(() => {});
```

### Error Handling

```typescript
// ✅ Good: Create custom error classes
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Good: Provide context in errors
throw new ValidationError(
  `Validation failed for schema: ${schemaId}`,
  errors
);

// ✅ Good: Use try-catch for async operations
async function safeValidate(schemaId: string, data: any): Promise<ValidationResult | null> {
  try {
    return await engine.validate(schemaId, data);
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
}
```

### Performance Optimization

```typescript
// ✅ Good: Use caching
const engine = new ValidationEngine({
  enableCache: true,
  cacheSize: 10000,
});

// ✅ Good: Batch operations
const promises = items.map(item => engine.validate('schema', item));
const results = await Promise.all(promises);

// ❌ Bad: Sequential operations
for (const item of items) {
  await engine.validate('schema', item); // Slow!
}

// ✅ Good: Use connection pooling
const registry = new ArtifactRegistry({
  storage: {
    backend: 's3',
    bucket: 'artifacts',
    region: 'us-east-1',
  },
});

// ✅ Good: Implement pagination
const results = registry.search({
  tags: ['production'],
  limit: 100,
  offset: 0,
});
```

---

## 🔍 Troubleshooting

### Common Issues

#### Issue 1: Validation Timeout

```typescript
// Problem: Validation takes too long
const result = await engine.validate('schema', largeData);

// Solution: Increase timeout
const engine = new ValidationEngine({
  timeout: 10000, // 10 seconds
});
```

#### Issue 2: Memory Leak

```typescript
// Problem: Memory usage grows over time
for (let i = 0; i < 1000000; i++) {
  await engine.validate('schema', data);
}

// Solution: Clear cache periodically
setInterval(() => {
  engine.clearCache();
}, 60000); // Every minute
```

#### Issue 3: Storage Connection Failed

```typescript
// Problem: Cannot connect to S3
const registry = new ArtifactRegistry({
  storage: {
    backend: 's3',
    bucket: 'artifacts',
    region: 'us-east-1',
  },
});

// Solution: Check credentials and permissions
// 1. Verify AWS credentials
// 2. Check IAM permissions
// 3. Verify bucket exists
// 4. Check network connectivity
```

### Debug Mode

```typescript
// Enable debug logging
const engine = new ValidationEngine({
  logLevel: 'debug',
});

// Listen to internal events
engine.on('*', (event, data) => {
  console.log('Event:', event, data);
});

// Check metrics
const metrics = engine.getMetrics();
console.log('Metrics:', metrics);

const stats = engine.getStats();
console.log('Stats:', stats);
```

---

## 📞 Support

- **Documentation:** https://docs.ninjatech.ai/mcp-level3
- **GitHub Issues:** https://github.com/MachineNativeOps/machine-native-ops/issues
- **Discussions:** https://github.com/MachineNativeOps/machine-native-ops/discussions
- **Email:** support@ninjatech.ai

---

**Last Updated:** 2024-01-10  
**Version:** 3.0.0  
**Maintainer:** NinjaTech AI Team