# 技術改進規範文檔

**版本**: 1.0.0  
**日期**: 2024-01-09  
**基於**: 全網最佳實踐索引和深度分析

---

## 目錄

1. [Schema 驗證優化](#1-schema-驗證優化)
2. [測試策略實施](#2-測試策略實施)
3. [性能優化方案](#3-性能優化方案)
4. [安全加固措施](#4-安全加固措施)
5. [可觀測性增強](#5-可觀測性增強)
6. [文檔標準化](#6-文檔標準化)
7. [CI/CD 優化](#7-cicd-優化)

---

## 1. Schema 驗證優化

### 1.1 當前狀態分析

**namespaces-sdk 當前實現**:
- ✅ 使用自定義驗證器
- ⚠️ 性能未優化
- ⚠️ 缺少緩存機制
- ⚠️ 錯誤消息可改進

### 1.2 優化方案

#### 方案 A: 遷移到 Zod（推薦）

**優勢**:
- ✅ TypeScript 原生支持
- ✅ 類型推斷
- ✅ 更好的錯誤消息
- ✅ 組合性強
- ✅ 性能優秀

**實施代碼**:
```typescript
import { z } from 'zod';

// 1. 定義 Schema
const GitHubIssueInputSchema = z.object({
  repository: z.string()
    .regex(/^[^/]+\/[^/]+$/, 'Must be in format owner/repo')
    .describe('Repository in format owner/repo'),
  title: z.string()
    .min(1, 'Title is required')
    .max(256, 'Title too long')
    .describe('Issue title'),
  body: z.string()
    .optional()
    .describe('Issue body/description'),
  labels: z.array(z.string())
    .optional()
    .describe('Issue labels'),
  assignees: z.array(z.string())
    .optional()
    .describe('Assignees')
}).strict();

// 2. 類型推斷
type GitHubIssueInput = z.infer<typeof GitHubIssueInputSchema>;

// 3. 驗證
const result = GitHubIssueInputSchema.safeParse(input);
if (!result.success) {
  throw new SchemaValidationError(
    'Input validation failed',
    result.error.errors
  );
}

// 4. 轉換和清理
const CleanedSchema = GitHubIssueInputSchema.transform((data) => ({
  ...data,
  title: data.title.trim(),
  labels: data.labels?.filter(l => l.length > 0)
}));

// 5. Schema 組合
const BaseToolInputSchema = z.object({
  correlationId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

const ExtendedGitHubIssueSchema = BaseToolInputSchema.merge(
  GitHubIssueInputSchema
);
```

**性能對比**:
| 驗證器 | 速度 | 類型安全 | 錯誤消息 | 推薦度 |
|--------|------|----------|----------|--------|
| Ajv | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Zod | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Joi | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Yup | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

#### 方案 B: 優化現有 Ajv 實現

**實施代碼**:
```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone';

// 1. 優化配置
const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
  removeAdditional: true,
  strict: false,
  code: {
    optimize: true,
    es5: false
  }
});

addFormats(ajv);

// 2. 預編譯 Schema
const compiledSchemas = new Map<string, ValidateFunction>();

function compileSchema(schema: JSONSchema): ValidateFunction {
  const hash = SchemaUtils.hash(schema);
  
  if (compiledSchemas.has(hash)) {
    return compiledSchemas.get(hash)!;
  }
  
  const validate = ajv.compile(schema);
  compiledSchemas.set(hash, validate);
  
  return validate;
}

// 3. 生成獨立驗證代碼
const moduleCode = standaloneCode(ajv, {
  'github-issue-input': GitHubIssueInputSchema
});

// 4. 緩存驗證結果
class CachedValidator {
  private cache = new LRUCache<string, ValidationResult>({
    max: 1000,
    ttl: 60000 // 1 minute
  });
  
  async validate(data: any, schema: JSONSchema): Promise<ValidationResult> {
    const cacheKey = this.getCacheKey(data, schema);
    
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await this.performValidation(data, schema);
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

**性能提升**:
- ✅ 預編譯: 10-100x 速度提升
- ✅ 緩存: 避免重複驗證
- ✅ 獨立代碼: 零依賴部署

### 1.3 實施優先級

**P0 - 立即實施**:
1. 添加 Schema 緩存
2. 實現預編譯
3. 優化錯誤消息

**P1 - 短期實施**:
1. 評估 Zod 遷移
2. 添加性能基準測試
3. 實現漸進式驗證

---

## 2. 測試策略實施

### 2.1 測試金字塔

```
        /\
       /E2E\         10% - 端到端測試
      /------\
     /Contract\      20% - 契約測試
    /----------\
   /Integration\     30% - 集成測試
  /--------------\
 /  Unit Tests   \   40% - 單元測試
/------------------\
```

### 2.2 單元測試實施

**目標覆蓋率**: 80%+

**測試模板**:
```typescript
// tests/unit/core/registry.test.ts
import { ToolRegistry } from '../../../src/core/registry';
import { ToolDescriptor } from '../../../src/core/tool';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  
  beforeEach(() => {
    registry = new ToolRegistry();
  });
  
  afterEach(() => {
    registry.clear();
  });
  
  describe('register', () => {
    it('should register a tool successfully', () => {
      const descriptor = createMockToolDescriptor();
      
      registry.register(descriptor);
      
      expect(registry.has(descriptor.metadata.name)).toBe(true);
      expect(registry.size()).toBe(1);
    });
    
    it('should throw when registering duplicate tool', () => {
      const descriptor = createMockToolDescriptor();
      
      registry.register(descriptor);
      
      expect(() => registry.register(descriptor))
        .toThrow('Tool already registered');
    });
    
    it('should throw when registry is locked', () => {
      registry.lock();
      
      expect(() => registry.register(createMockToolDescriptor()))
        .toThrow('Registry is locked');
    });
  });
  
  describe('filter', () => {
    beforeEach(() => {
      registry.register(createMockToolDescriptor({ adapter: 'github' }));
      registry.register(createMockToolDescriptor({ adapter: 'openai' }));
    });
    
    it('should filter by adapter', () => {
      const results = registry.filter({ adapter: 'github' });
      
      expect(results).toHaveLength(1);
      expect(results[0].adapter).toBe('github');
    });
    
    it('should filter by tags', () => {
      const results = registry.filter({ tags: ['api'] });
      
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions
function createMockToolDescriptor(overrides?: Partial<ToolMetadata>): ToolDescriptor {
  return {
    metadata: {
      name: 'test_tool',
      title: 'Test Tool',
      description: 'A test tool',
      version: '1.0.0',
      adapter: 'test',
      ...overrides
    },
    factory: {
      createTool: () => new MockTool(),
      getToolMetadata: () => ({} as any)
    },
    inputSchema: {},
    outputSchema: {}
  };
}
```

### 2.3 集成測試實施

**測試模板**:
```typescript
// tests/integration/github-adapter.test.ts
import { initializeSDK } from '../../src';
import { SDK } from '../../src/core/sdk';

describe('GitHub Adapter Integration', () => {
  let sdk: SDK;
  
  beforeAll(async () => {
    sdk = await initializeSDK({
      environment: 'test',
      credentialProviders: [
        new EnvCredentialProvider('TEST_')
      ]
    });
  });
  
  afterAll(async () => {
    await sdk.shutdown();
  });
  
  describe('create_issue', () => {
    it('should create issue in real repository', async () => {
      const result = await sdk.invokeTool('github_create_issue', {
        repository: process.env.TEST_GITHUB_REPO,
        title: `Test Issue ${Date.now()}`,
        body: 'Created by integration test',
        labels: ['test']
      });
      
      expect(result.success).toBe(true);
      expect(result.data.issue_number).toBeGreaterThan(0);
      expect(result.data.url).toContain('github.com');
      
      // Cleanup
      await cleanupTestIssue(result.data.issue_number);
    });
    
    it('should handle rate limiting gracefully', async () => {
      // Test rate limit handling
    });
  });
});
```

### 2.4 契約測試實施

**測試模板**:
```typescript
// tests/contract/mcp-protocol.test.ts
import { Pact } from '@pact-foundation/pact';

describe('MCP Protocol Contract', () => {
  const provider = new Pact({
    consumer: 'namespace-sdk',
    provider: 'mcp-server',
    port: 8080
  });
  
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  
  describe('tools/list', () => {
    it('should return list of tools', async () => {
      await provider.addInteraction({
        state: 'tools are available',
        uponReceiving: 'a request for tools list',
        withRequest: {
          method: 'POST',
          path: '/rpc',
          body: {
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 1
          }
        },
        willRespondWith: {
          status: 200,
          body: {
            jsonrpc: '2.0',
            result: {
              tools: Matchers.eachLike({
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {}
              })
            },
            id: 1
          }
        }
      });
      
      const response = await sdk.listTools();
      expect(response).toBeDefined();
    });
  });
});
```

### 2.5 性能測試實施

**測試模板**:
```typescript
// tests/performance/benchmark.test.ts
import { performance } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  let sdk: SDK;
  
  beforeAll(async () => {
    sdk = await initializeSDK({ environment: 'test' });
  });
  
  it('should handle 1000 tool invocations in < 5s', async () => {
    const start = performance.now();
    
    const promises = Array.from({ length: 1000 }, () =>
      sdk.invokeTool('test_tool', {})
    );
    
    await Promise.all(promises);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000);
  });
  
  it('should validate 10000 schemas in < 1s', async () => {
    const validator = new SchemaValidator();
    const schema = { type: 'object', properties: {} };
    
    const start = performance.now();
    
    for (let i = 0; i < 10000; i++) {
      await validator.validate({}, schema);
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 3. 性能優化方案

### 3.1 連接池實現

**實施代碼**:
```typescript
// src/core/connection-pool.ts
import { Agent } from 'http';
import { Agent as HTTPSAgent } from 'https';

export class ConnectionPool {
  private httpAgent: Agent;
  private httpsAgent: HTTPSAgent;
  
  constructor(options: ConnectionPoolOptions = {}) {
    this.httpAgent = new Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: options.maxSockets || 50,
      maxFreeSockets: options.maxFreeSockets || 10,
      timeout: options.timeout || 60000
    });
    
    this.httpsAgent = new HTTPSAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: options.maxSockets || 50,
      maxFreeSockets: options.maxFreeSockets || 10,
      timeout: options.timeout || 60000
    });
  }
  
  getAgent(protocol: 'http' | 'https'): Agent | HTTPSAgent {
    return protocol === 'https' ? this.httpsAgent : this.httpAgent;
  }
  
  async destroy(): Promise<void> {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

// 使用示例
const pool = new ConnectionPool({ maxSockets: 100 });

const response = await fetch(url, {
  agent: pool.getAgent('https')
});
```

### 3.2 批處理實現

**實施代碼**:
```typescript
// src/core/batch-processor.ts
export class BatchProcessor<TInput, TOutput> {
  private queue: BatchItem<TInput, TOutput>[] = [];
  private processing = false;
  private timer: NodeJS.Timeout | null = null;
  
  constructor(
    private processor: (items: TInput[]) => Promise<TOutput[]>,
    private options: BatchOptions = {}
  ) {
    this.options = {
      maxBatchSize: 100,
      maxWaitMs: 10,
      ...options
    };
  }
  
  async add(input: TInput): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      this.queue.push({ input, resolve, reject });
      this.scheduleFlush();
    });
  }
  
  private scheduleFlush(): void {
    if (this.timer) return;
    
    this.timer = setTimeout(
      () => this.flush(),
      this.options.maxWaitMs
    );
    
    if (this.queue.length >= this.options.maxBatchSize!) {
      this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    const batch = this.queue.splice(0, this.options.maxBatchSize);
    
    try {
      const inputs = batch.map(item => item.input);
      const outputs = await this.processor(inputs);
      
      batch.forEach((item, index) => {
        item.resolve(outputs[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.reject(error as Error);
      });
    } finally {
      this.processing = false;
      
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    }
  }
}

// 使用示例
const batchValidator = new BatchProcessor(
  async (schemas) => {
    return await Promise.all(
      schemas.map(s => validator.validate(s.data, s.schema))
    );
  },
  { maxBatchSize: 50, maxWaitMs: 10 }
);
```

### 3.3 緩存策略

**實施代碼**:
```typescript
// src/core/cache.ts
import { LRUCache } from 'lru-cache';

export class MultiLevelCache<K, V> {
  private l1Cache: Map<K, CacheEntry<V>>; // 內存緩存
  private l2Cache: LRUCache<K, CacheEntry<V>>; // LRU 緩存
  
  constructor(options: CacheOptions) {
    this.l1Cache = new Map();
    this.l2Cache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: options.ttl || 300000, // 5 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
  }
  
  async get(
    key: K,
    fetcher: () => Promise<V>
  ): Promise<V> {
    // L1 查找
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && !this.isExpired(l1Entry)) {
      return l1Entry.value;
    }
    
    // L2 查找
    const l2Entry = this.l2Cache.get(key);
    if (l2Entry && !this.isExpired(l2Entry)) {
      // 提升到 L1
      this.l1Cache.set(key, l2Entry);
      return l2Entry.value;
    }
    
    // 獲取新值
    const value = await fetcher();
    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      hits: 0
    };
    
    this.l1Cache.set(key, entry);
    this.l2Cache.set(key, entry);
    
    return value;
  }
  
  invalidate(key: K): void {
    this.l1Cache.delete(key);
    this.l2Cache.delete(key);
  }
  
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
  }
  
  private isExpired(entry: CacheEntry<V>): boolean {
    const age = Date.now() - entry.timestamp;
    return age > (this.l2Cache.ttl || 300000);
  }
}
```

---

## 4. 安全加固措施

### 4.1 輸入驗證增強

**實施代碼**:
```typescript
// src/security/input-validator.ts
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export class SecurityValidator {
  /**
   * 清理 HTML 輸入
   */
  sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href']
    });
  }
  
  /**
   * 驗證 URL
   */
  validateURL(url: string): boolean {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    });
  }
  
  /**
   * 防止 SQL 注入
   */
  sanitizeSQL(input: string): string {
    return input.replace(/['";\\]/g, '');
  }
  
  /**
   * 防止命令注入
   */
  sanitizeCommand(input: string): string {
    return input.replace(/[;&|`$()]/g, '');
  }
  
  /**
   * 驗證 JSON
   */
  validateJSON(input: string): boolean {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 速率限制檢查
   */
  async checkRateLimit(
    userId: string,
    operation: string
  ): Promise<boolean> {
    const key = `${userId}:${operation}`;
    const count = await this.rateLimiter.get(key);
    
    if (count >= this.limits[operation]) {
      return false;
    }
    
    await this.rateLimiter.increment(key);
    return true;
  }
}
```

### 4.2 憑證安全增強

**實施代碼**:
```typescript
// src/credentials/secure-storage.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class SecureCredentialStorage {
  private algorithm = 'aes-256-gcm';
  
  /**
   * 加密憑證
   */
  async encrypt(
    data: string,
    password: string
  ): Promise<EncryptedCredential> {
    const salt = randomBytes(32);
    const key = (await scryptAsync(password, salt, 32)) as Buffer;
    const iv = randomBytes(16);
    
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm
    };
  }
  
  /**
   * 解密憑證
   */
  async decrypt(
    encrypted: EncryptedCredential,
    password: string
  ): Promise<string> {
    const key = (await scryptAsync(
      password,
      Buffer.from(encrypted.salt, 'hex'),
      32
    )) as Buffer;
    
    const decipher = createDecipheriv(
      encrypted.algorithm,
      key,
      Buffer.from(encrypted.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * 安全刪除
   */
  secureDelete(data: Buffer): void {
    // 覆寫內存
    data.fill(0);
  }
}
```

### 4.3 審計日誌增強

**實施代碼**:
```typescript
// src/observability/tamper-evident-audit.ts
import { createHash, createHmac } from 'crypto';

export class TamperEvidentAuditLog {
  private chain: AuditBlock[] = [];
  private secret: string;
  
  constructor(secret: string) {
    this.secret = secret;
    // 創建創世區塊
    this.chain.push(this.createGenesisBlock());
  }
  
  /**
   * 添加審計事件
   */
  async addEvent(event: AuditEvent): Promise<void> {
    const previousBlock = this.chain[this.chain.length - 1];
    
    const block: AuditBlock = {
      index: this.chain.length,
      timestamp: Date.now(),
      event,
      previousHash: previousBlock.hash,
      hash: ''
    };
    
    block.hash = this.calculateHash(block);
    
    // 驗證鏈完整性
    if (!this.isValidBlock(block, previousBlock)) {
      throw new Error('Invalid block: chain integrity compromised');
    }
    
    this.chain.push(block);
  }
  
  /**
   * 計算區塊哈希
   */
  private calculateHash(block: Omit<AuditBlock, 'hash'>): string {
    const data = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      event: block.event,
      previousHash: block.previousHash
    });
    
    return createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
  }
  
  /**
   * 驗證區塊
   */
  private isValidBlock(
    block: AuditBlock,
    previousBlock: AuditBlock
  ): boolean {
    if (block.previousHash !== previousBlock.hash) {
      return false;
    }
    
    const calculatedHash = this.calculateHash(block);
    return calculatedHash === block.hash;
  }
  
  /**
   * 驗證整個鏈
   */
  verifyChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      if (!this.isValidBlock(this.chain[i], this.chain[i - 1])) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * 導出審計日誌
   */
  export(): string {
    return JSON.stringify(this.chain, null, 2);
  }
  
  private createGenesisBlock(): AuditBlock {
    const block: Omit<AuditBlock, 'hash'> = {
      index: 0,
      timestamp: Date.now(),
      event: {
        event: 'audit_log_initialized',
        timestamp: new Date()
      },
      previousHash: '0'
    };
    
    return {
      ...block,
      hash: this.calculateHash(block)
    };
  }
}
```

---

## 5. 可觀測性增強

### 5.1 OpenTelemetry 完整集成

**實施代碼**:
```typescript
// src/observability/otel-setup.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

export function setupObservability(config: ObservabilityConfig) {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'namespace-sdk',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment
    }),
    
    // 追蹤配置
    traceExporter: new JaegerExporter({
      endpoint: config.jaegerEndpoint || 'http://localhost:14268/api/traces'
    }),
    spanProcessor: new BatchSpanProcessor(
      new JaegerExporter(),
      {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000
      }
    ),
    
    // 指標配置
    metricReader: new PeriodicExportingMetricReader({
      exporter: new PrometheusExporter({
        port: config.metricsPort || 9464
      }),
      exportIntervalMillis: 60000
    }),
    
    // 自動儀表化
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          requestHook: (span, request) => {
            span.setAttribute('http.request.body.size', 
              request.headers['content-length'] || 0
            );
          }
        }
      })
    ]
  });
  
  sdk.start();
  
  // 優雅關閉
  process.on('SIGTERM', async () => {
    await sdk.shutdown();
  });
  
  return sdk;
}
```

### 5.2 自定義指標

**實施代碼**:
```typescript
// src/observability/custom-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('namespace-sdk', '1.0.0');

// 工具調用計數器
export const toolInvocationCounter = meter.createCounter(
  'sdk.tool.invocations',
  {
    description: 'Number of tool invocations',
    unit: '1'
  }
);

// 工具執行時間直方圖
export const toolDurationHistogram = meter.createHistogram(
  'sdk.tool.duration',
  {
    description: 'Tool execution duration',
    unit: 'ms',
    advice: {
      explicitBucketBoundaries: [10, 50, 100, 250, 500, 1000, 2500, 5000]
    }
  }
);

// 活躍工具計數
export const activeToolsGauge = meter.createUpDownCounter(
  'sdk.tool.active',
  {
    description: 'Number of currently executing tools',
    unit: '1'
  }
);

// 憑證緩存命中率
export const credentialCacheHitRatio = meter.createObservableGauge(
  'sdk.credential.cache.hit_ratio',
  {
    description: 'Credential cache hit ratio',
    unit: '1'
  }
);

// 使用示例
export function recordToolInvocation(
  toolName: string,
  duration: number,
  success: boolean
) {
  toolInvocationCounter.add(1, {
    tool: toolName,
    status: success ? 'success' : 'error'
  });
  
  toolDurationHistogram.record(duration, {
    tool: toolName
  });
}
```

---

## 6. 文檔標準化

### 6.1 API 文檔生成

**實施步驟**:
```typescript
// 1. 使用 TypeDoc
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "theme": "default",
  "includeVersion": true,
  "excludePrivate": true,
  "excludeProtected": false,
  "excludeExternals": true,
  "readme": "README.md",
  "categorizeByGroup": true,
  "categoryOrder": [
    "Core",
    "Schema",
    "Credentials",
    "Observability",
    "Adapters",
    "*"
  ]
}

// 2. JSDoc 註釋標準
/**
 * Creates a new issue in a GitHub repository.
 * 
 * @param input - The issue creation parameters
 * @param input.repository - Repository in format owner/repo
 * @param input.title - Issue title (1-256 characters)
 * @param input.body - Optional issue description
 * @param input.labels - Optional array of label names
 * 
 * @returns Promise resolving to issue details
 * @returns result.issue_number - The created issue number
 * @returns result.url - The issue URL
 * 
 * @throws {SchemaValidationError} If input validation fails
 * @throws {AuthenticationError} If GitHub authentication fails
 * @throws {RateLimitError} If rate limit is exceeded
 * 
 * @example
 * ```typescript
 * const result = await sdk.invokeTool('github_create_issue', {
 *   repository: 'owner/repo',
 *   title: 'Bug report',
 *   body: 'Description of the bug',
 *   labels: ['bug', 'high-priority']
 * });
 * 
 * console.log(`Issue created: ${result.data.url}`);
 * ```
 * 
 * @see {@link https://docs.github.com/en/rest/issues/issues#create-an-issue}
 */
async function createIssue(input: GitHubIssueInput): Promise<GitHubIssueOutput> {
  // Implementation
}
```

### 6.2 交互式文檔

**實施步驟**:
```typescript
// 使用 Docusaurus
// docusaurus.config.js
module.exports = {
  title: 'namespace-sdk',
  tagline: 'Machine-native platform integration layer',
  url: 'https://namespace-sdk.io',
  baseUrl: '/',
  
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/ninjatech-ai/namespace-sdk/edit/main/',
        },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  
  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../src/index.ts'],
        tsconfig: '../tsconfig.json',
      },
    ],
  ],
};
```

---

## 7. CI/CD 優化

### 7.1 GitHub Actions 工作流

**實施代碼**:
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run CodeQL
        uses: github/codeql-action/analyze@v3
  
  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

---

## 8. 實施檢查清單

### 8.1 namespaces-sdk

- [ ] 遷移到 Zod 或優化 Ajv
- [ ] 實現完整測試套件（80%+ 覆蓋率）
- [ ] 添加連接池
- [ ] 實現批處理
- [ ] 添加多級緩存
- [ ] 集成 OpenTelemetry
- [ ] 實現安全輸入驗證
- [ ] 添加憑證加密
- [ ] 實現防篡改審計日誌
- [ ] 完善 API 文檔
- [ ] 添加交互式文檔
- [ ] 優化 CI/CD 流程

### 8.2 namespaces-adk

- [ ] 完成 Agent 運行時
- [ ] 實現狀態機
- [ ] 完成記憶管理系統
- [ ] 實現工作流編排
- [ ] 添加錯誤恢復機制
- [ ] 實現工具鏈模式
- [ ] 集成可觀測性
- [ ] 添加測試套件
- [ ] 完善文檔
- [ ] 添加使用示例

### 8.3 namespaces-mcp

- [ ] 完整實現 MCP 協議
- [ ] 實現 JSON-RPC 2.0 服務器
- [ ] 添加 WebSocket 支持
- [ ] 實現資源管理
- [ ] 添加提示模板
- [ ] 實現 SSE 支持
- [ ] 添加測試套件
- [ ] 實現契約測試
- [ ] 完善文檔
- [ ] 添加示例

---

## 9. 參考資源總覽

### 9.1 官方文檔
- TypeScript Handbook
- Python Best Practices Guide
- MCP Specification
- JSON-RPC 2.0 Spec
- OpenTelemetry Documentation

### 9.2 開源項目
- Stripe SDK
- AWS SDK
- LangChain
- AutoGPT
- Semantic Kernel

### 9.3 工具和庫
- Zod / Ajv
- Jest / Pytest
- Pact
- OpenTelemetry
- Prometheus

### 9.4 書籍和文章
- Clean Architecture
- Designing Data-Intensive Applications
- Site Reliability Engineering
- The Pragmatic Programmer

---

**文檔維護者**: SuperNinja AI Agent  
**最後更新**: 2024-01-09  
**下次審查**: 2024-02-09