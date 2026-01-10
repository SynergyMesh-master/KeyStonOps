/**
 * Namespaces-MCP 增強版入口點
 * 
 * 整合治理層、安全層、架構系統的綜合 MCP 平台
 * 提供統一的 API 介面和完整功能導出
 */

// Core Protocol Exports
export { MCPProtocol } from './protocol/core/mcp-protocol';
export { MessageHandler } from './protocol/core/message-handler';
export { TransportLayer } from './protocol/core/transport-layer';
export { ProtocolValidator } from './protocol/core/protocol-validator';

// Registry Exports
export { RegistryCore } from './protocol/registry/registry-core';
export { Discovery } from './protocol/registry/discovery';
export { Lifecycle } from './protocol/registry/lifecycle';
export { Metadata } from './protocol/registry/metadata';

// Communication Exports
export { MessageBus } from './communication/message-bus';
export { EventEmitter } from './communication/event-emitter';
export { AuthHandler } from './communication/auth-handler';
export { TopicManager } from './communication/topic-manager';

// Transport Exports
export { HttpTransport } from './communication/http-transport';
export { WebSocketTransport } from './communication/websocket-transport';
export { GrpcTransport } from './communication/grpc-transport';
export { MessageQueueTransport } from './communication/message-queue-transport';

// Serialization Exports
export { JsonSerializer } from './communication/json-serializer';
export { BinarySerializer } from './communication/binary-serializer';
export { CustomSerializer } from './communication/custom-serializer';
export { SerializerRegistry } from './communication/serializer-registry';

// Security Exports
export { SecurityMiddleware } from './communication/security-middleware';
export { EncryptionService } from './communication/encryption-service';
export { RateLimiter } from './communication/rate-limiter';

// Tools Core Exports
export { ToolExecutor } from './tools/core/tool-executor';
export { ToolRegistry } from './tools/core/tool-registry';
export { ToolValidator } from './tools/core/tool-validator';
export { ITool, IToolResult, IToolContext } from './tools/core/tool-interface';

// Tools Execution Exports
export { ExecutionEngine } from './tools/execution/execution-engine';
export { TaskScheduler } from './tools/execution/task-scheduler';
export { WorkflowOrchestrator } from './tools/execution/workflow-orchestrator';
export { ResultCollector } from './tools/execution/result-collector';

// Tools Resources Exports
export { ResourceManager } from './tools/resources/resource-manager';
export { ResourceMonitor } from './tools/resources/resource-monitor';
export { ResourcePool } from './tools/resources/resource-pool';
export { ResourceAllocator } from './tools/resources/resource-allocator';

// Data Management Exports
export { StorageEngine } from './data-management/storage-engine';
export { QueryEngine } from './data-management/query-engine';
export { CacheSystem } from './data-management/cache-system';
export { MigrationTools } from './data-management/migration-tools';

// Monitoring Exports
export { MetricsCollector } from './monitoring/metrics-collector';
export { LoggingSystem } from './monitoring/logging-system';
export { DistributedTracing } from './monitoring/distributed-tracing';
export { HealthMonitoring } from './monitoring/health-monitoring';

// Configuration Exports
export { DynamicConfig } from './configuration/dynamic-config';
export { PolicyEngine } from './configuration/policy-engine';
export { AccessControl } from './configuration/access-control';

// Enhanced System Exports
export { 
  EnhancedMCPSystem, 
  EnhancedMCPSystemFactory,
  EnhancedMCPConfig 
} from './enhanced-mcp-system';

// Integration Bridge Exports
export { 
  ComprehensiveIntegrationBridge,
  IIntegrationBridge 
} from './integration/integration-bridge';

// Taxonomy Integration Exports
export { TaxonomyIntegration } from './taxonomy-integration';

// Python Converters (for interoperability)
export { converter } from './converter';
export { advancedConverter } from './advanced_converter';

/**
 * Namespaces-MCP 版本信息
 */
export const VERSION = '2.0.0-enhanced';
export const BUILD_DATE = new Date().toISOString();
export const FEATURES = {
  governance: true,
  security: true,
  schema: true,
  monitoring: true,
  integration: true
};

/**
 * 快速建立增強系統的便利函數
 */
export function createEnhancedMCPSystem(config?: Partial<EnhancedMCPConfig>): EnhancedMCPSystem {
  return EnhancedMCPSystemFactory.createCustom(config || {});
}

/**
 * 預設配置便利函數
 */
export function createDefaultMCPSystem(): EnhancedMCPSystem {
  return EnhancedMCPSystemFactory.createDefault();
}

/**
 * 系統信息匯出
 */
export const SYSTEM_INFO = {
  name: 'Namespaces-MCP',
  version: VERSION,
  description: 'Enhanced Model Context Protocol with Governance, Security, and Schema Integration',
  features: FEATURES,
  buildDate: BUILD_DATE,
  repository: 'https://github.com/MachineNativeOps/machine-native-ops',
  documentation: 'https://github.com/MachineNativeOps/machine-native-ops/tree/main/00-namespaces/namespaces-mcp'
};

/**
 * 預設導出
 */
export default {
  EnhancedMCPSystem,
  EnhancedMCPSystemFactory,
  createEnhancedMCPSystem,
  createDefaultMCPSystem,
  SYSTEM_INFO
};