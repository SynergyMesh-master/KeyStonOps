/**
 * Main SDK Class
 * 
 * Implements the main SDK class, encapsulating lifecycle management,
 * configuration, and orchestration of registry, adapters, and cross-cutting concerns.
 */

import { ToolRegistry, getGlobalRegistry } from './registry';
import { Tool, ToolContext, ToolResult, ToolUtils } from './tool';
import { CredentialManager } from '../credentials/manager';
import { SchemaValidator } from '../schema/validator';
import { Logger } from '../observability/logger';
import { Tracer } from '../observability/tracer';
import { MetricsCollector } from '../observability/metrics';
import { AuditLogger } from '../observability/audit';
import { ConfigManager } from '../config';
import { PluginLoader } from '../plugins';
import { SDKError, ToolNotFoundError } from './errors';

/**
 * SDK Configuration
 */
export interface SDKConfiguration {
  environment?: string;
  configPath?: string;
  debug?: boolean;
  credentialProviders?: any[];
  pluginDirs?: string[];
  observability?: {
    logging?: boolean;
    tracing?: boolean;
    metrics?: boolean;
    audit?: boolean;
  };
  registry?: {
    useGlobal?: boolean;
    autoLock?: boolean;
  };
}

/**
 * SDK Lifecycle State
 */
export enum SDKState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN = 'shutdown',
  ERROR = 'error'
}

/**
 * Main SDK Class
 */
export class SDK {
  private state: SDKState;
  private config: SDKConfiguration;
  private registry: ToolRegistry;
  private credentialManager: CredentialManager;
  private schemaValidator: SchemaValidator;
  private logger: Logger;
  private tracer: Tracer;
  private metrics: MetricsCollector;
  private auditLogger: AuditLogger;
  private configManager: ConfigManager;
  private pluginLoader: PluginLoader;
  private adapters: Map<string, any>;

  constructor(config: SDKConfiguration = {}) {
    this.state = SDKState.UNINITIALIZED;
    this.config = config;
    this.adapters = new Map();

    // Initialize core components
    this.logger = new Logger('SDK', { debug: config.debug });
    this.tracer = new Tracer();
    this.metrics = new MetricsCollector();
    this.auditLogger = new AuditLogger();
    this.configManager = new ConfigManager(config.configPath);
    this.schemaValidator = new SchemaValidator();
    this.credentialManager = new CredentialManager();
    this.pluginLoader = new PluginLoader(config.pluginDirs);

    // Initialize or use global registry
    this.registry = config.registry?.useGlobal 
      ? getGlobalRegistry() 
      : new ToolRegistry();

    this.logger.info('SDK instance created');
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    if (this.state !== SDKState.UNINITIALIZED) {
      throw new SDKError(`Cannot initialize SDK in state: ${this.state}`);
    }

    this.state = SDKState.INITIALIZING;
    this.logger.info('Initializing SDK...');

    try {
      // Load configuration
      await this.configManager.load(this.config.environment);
      this.logger.info('Configuration loaded');

      // Initialize credential manager
      await this.credentialManager.initialize(this.config.credentialProviders);
      this.logger.info('Credential manager initialized');

      // Initialize observability
      if (this.config.observability?.tracing) {
        await this.tracer.initialize();
        this.logger.info('Tracing initialized');
      }

      if (this.config.observability?.metrics) {
        await this.metrics.initialize();
        this.logger.info('Metrics collection initialized');
      }

      if (this.config.observability?.audit) {
        await this.auditLogger.initialize();
        this.logger.info('Audit logging initialized');
      }

      // Load plugins
      await this.pluginLoader.loadPlugins(this.registry);
      this.logger.info(`Loaded ${this.pluginLoader.getLoadedPlugins().length} plugins`);

      // Load built-in adapters
      await this.loadBuiltInAdapters();
      this.logger.info('Built-in adapters loaded');

      // Lock registry if configured
      if (this.config.registry?.autoLock) {
        this.registry.lock();
        this.logger.info('Registry locked');
      }

      this.state = SDKState.READY;
      this.logger.info('SDK initialization complete');

      // Log audit event
      await this.auditLogger.log({
        event: 'sdk_initialized',
        timestamp: new Date(),
        metadata: {
          environment: this.config.environment,
          toolCount: this.registry.size()
        }
      });

    } catch (error: any) {
      this.state = SDKState.ERROR;
      this.logger.error('SDK initialization failed', error);
      throw error;
    }
  }

  /**
   * Load built-in adapters
   */
  private async loadBuiltInAdapters(): Promise<void> {
    // Adapters will be loaded dynamically
    // This is a placeholder for the adapter loading logic
    const adapterNames = ['github', 'cloudflare', 'openai', 'google'];
    
    for (const adapterName of adapterNames) {
      try {
        // Dynamic import would happen here
        // const adapter = await import(`../adapters/${adapterName}`);
        // await adapter.register(this.registry, this.credentialManager);
        this.logger.debug(`Adapter '${adapterName}' loaded`);
      } catch (error: any) {
        this.logger.warn(`Failed to load adapter '${adapterName}': ${error.message}`);
      }
    }
  }

  /**
   * List all available tools
   */
  async listTools(filter?: any): Promise<any[]> {
    this.ensureReady();
    
    const span = this.tracer.startSpan('listTools');
    
    try {
      const tools = filter 
        ? this.registry.filter(filter)
        : this.registry.listMetadata();

      this.metrics.increment('tools.list', { count: tools.length });
      
      return tools;
    } finally {
      span.end();
    }
  }

  /**
   * Get tool metadata
   */
  async getToolMetadata(toolName: string): Promise<any> {
    this.ensureReady();
    
    const descriptor = this.registry.get(toolName);
    if (!descriptor) {
      throw new ToolNotFoundError(toolName);
    }

    return {
      ...descriptor.metadata,
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    };
  }

  /**
   * Invoke a tool
   */
  async invokeTool<TInput = any, TOutput = any>(
    toolName: string,
    input: TInput,
    context?: Partial<ToolContext>
  ): Promise<ToolResult<TOutput>> {
    this.ensureReady();

    const fullContext = ToolUtils.createContext(context);
    const span = this.tracer.startSpan('invokeTool', {
      toolName,
      correlationId: fullContext.correlationId
    });

    const startTime = Date.now();

    try {
      // Get tool instance
      const tool = this.registry.createTool(toolName);
      
      this.logger.info(`Invoking tool: ${toolName}`, {
        correlationId: fullContext.correlationId
      });

      // Execute tool
      const result = await tool.execute(input, fullContext);

      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.histogram('tool.execution.duration', duration, {
        tool: toolName,
        success: result.success
      });
      this.metrics.increment('tool.invocations', {
        tool: toolName,
        success: result.success
      });

      // Log audit event
      await this.auditLogger.log({
        event: 'tool_invoked',
        toolName,
        correlationId: fullContext.correlationId,
        timestamp: new Date(),
        success: result.success,
        duration,
        userId: fullContext.userId
      });

      return result;

    } catch (error: any) {
      this.logger.error(`Tool invocation failed: ${toolName}`, error);
      
      this.metrics.increment('tool.errors', {
        tool: toolName,
        errorType: error.name
      });

      await this.auditLogger.log({
        event: 'tool_invocation_failed',
        toolName,
        correlationId: fullContext.correlationId,
        timestamp: new Date(),
        error: error.message
      });

      throw error;

    } finally {
      span.end();
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): any {
    this.ensureReady();
    return this.registry.getStats();
  }

  /**
   * Get SDK state
   */
  getState(): SDKState {
    return this.state;
  }

  /**
   * Check if SDK is ready
   */
  isReady(): boolean {
    return this.state === SDKState.READY;
  }

  /**
   * Shutdown the SDK
   */
  async shutdown(): Promise<void> {
    if (this.state === SDKState.SHUTDOWN || this.state === SDKState.SHUTTING_DOWN) {
      return;
    }

    this.state = SDKState.SHUTTING_DOWN;
    this.logger.info('Shutting down SDK...');

    try {
      // Shutdown observability
      await this.tracer.shutdown();
      await this.metrics.shutdown();
      await this.auditLogger.shutdown();

      // Shutdown credential manager
      await this.credentialManager.shutdown();

      // Unload plugins
      await this.pluginLoader.unloadPlugins();

      this.state = SDKState.SHUTDOWN;
      this.logger.info('SDK shutdown complete');

    } catch (error: any) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }

  /**
   * Ensure SDK is ready
   */
  private ensureReady(): void {
    if (this.state !== SDKState.READY) {
      throw new SDKError(`SDK is not ready. Current state: ${this.state}`);
    }
  }

  /**
   * Get registry instance
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }

  /**
   * Get credential manager
   */
  getCredentialManager(): CredentialManager {
    return this.credentialManager;
  }

  /**
   * Get logger
   */
  getLogger(): Logger {
    return this.logger;
  }
}