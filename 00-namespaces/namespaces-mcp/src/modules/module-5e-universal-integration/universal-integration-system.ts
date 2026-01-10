/**
 * Universal Integration System - Complete Integration Hub
 * 
 * Enterprise-grade universal integration system combining all components:
 * - Universal Adapter (auto-discovery)
 * - Protocol Translator (multi-protocol support)
 * - Data Transformer (format conversion)
 * - API Gateway (unified management)
 * - Integration Orchestrator (workflow automation)
 * 
 * Performance Targets:
 * - End-to-End Latency: <1s
 * - Throughput: 10,000+ integrations/second
 * - Concurrent Operations: 100,000+
 * - Availability: 99.99%+
 * 
 * @module UniversalIntegrationSystem
 */

import { EventEmitter } from 'events';
import { UniversalAdapter, DiscoveredService, AdapterConfig } from './universal-adapter';
import { ProtocolTranslator, ProtocolMessage, TranslatorConfig } from './protocol-translator';
import { DataTransformer, TransformRequest, TransformerConfig } from './data-transformer';
import { APIGateway, GatewayRequest, GatewayConfig } from './api-gateway';
import { IntegrationOrchestrator, WorkflowDefinition, OrchestratorConfig } from './integration-orchestrator';

/**
 * Integration request
 */
export interface IntegrationRequest {
  id: string;
  source: {
    service: string;
    protocol: string;
    format: string;
  };
  target: {
    service: string;
    protocol: string;
    format: string;
  };
  data: any;
  workflow?: string;
  options?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Integration result
 */
export interface IntegrationResult {
  success: boolean;
  requestId: string;
  data?: any;
  error?: Error;
  executionTime: number;
  steps: IntegrationStep[];
  metadata: Record<string, any>;
}

/**
 * Integration step
 */
export interface IntegrationStep {
  name: string;
  component: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: Error;
  metadata: Record<string, any>;
}

/**
 * System configuration
 */
export interface SystemConfig {
  adapter?: Partial<AdapterConfig>;
  translator?: Partial<TranslatorConfig>;
  transformer?: Partial<TransformerConfig>;
  gateway?: Partial<GatewayConfig>;
  orchestrator?: Partial<OrchestratorConfig>;
  enableAutoDiscovery?: boolean;
  enableProtocolTranslation?: boolean;
  enableDataTransformation?: boolean;
  enableAPIGateway?: boolean;
  enableOrchestration?: boolean;
}

/**
 * System statistics
 */
export interface SystemStats {
  totalIntegrations: number;
  successfulIntegrations: number;
  failedIntegrations: number;
  averageExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  throughput: number;
  activeIntegrations: number;
  successRate: number;
  errorRate: number;
  componentStats: {
    adapter: any;
    translator: any;
    transformer: any;
    gateway: any;
    orchestrator: any;
  };
}

/**
 * Universal Integration System
 * 
 * Complete integration hub combining all components for
 * enterprise-grade integration capabilities.
 */
export class UniversalIntegrationSystem extends EventEmitter {
  private config: SystemConfig;
  private adapter: UniversalAdapter;
  private translator: ProtocolTranslator;
  private transformer: DataTransformer;
  private gateway: APIGateway;
  private orchestrator: IntegrationOrchestrator;
  private stats: SystemStats;
  private executionTimes: number[];
  private startTime: Date;
  private running: boolean;

  constructor(config: SystemConfig = {}) {
    super();
    
    this.config = {
      enableAutoDiscovery: true,
      enableProtocolTranslation: true,
      enableDataTransformation: true,
      enableAPIGateway: true,
      enableOrchestration: true,
      ...config
    };

    // Initialize components
    this.adapter = new UniversalAdapter(config.adapter);
    this.translator = new ProtocolTranslator(config.translator);
    this.transformer = new DataTransformer(config.transformer);
    this.gateway = new APIGateway(config.gateway);
    this.orchestrator = new IntegrationOrchestrator(config.orchestrator);

    this.executionTimes = [];
    this.startTime = new Date();
    this.running = false;

    this.stats = {
      totalIntegrations: 0,
      successfulIntegrations: 0,
      failedIntegrations: 0,
      averageExecutionTime: 0,
      p50ExecutionTime: 0,
      p95ExecutionTime: 0,
      p99ExecutionTime: 0,
      throughput: 0,
      activeIntegrations: 0,
      successRate: 0,
      errorRate: 0,
      componentStats: {
        adapter: {},
        translator: {},
        transformer: {},
        gateway: {},
        orchestrator: {}
      }
    };

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for components
   */
  private setupEventHandlers(): void {
    // Adapter events
    this.adapter.on('service:discovered', (data) => {
      this.emit('adapter:service-discovered', data);
    });

    this.adapter.on('service:connected', (data) => {
      this.emit('adapter:service-connected', data);
    });

    // Translator events
    this.translator.on('translation:success', (data) => {
      this.emit('translator:success', data);
    });

    this.translator.on('translation:error', (data) => {
      this.emit('translator:error', data);
    });

    // Transformer events
    this.transformer.on('transformation:success', (data) => {
      this.emit('transformer:success', data);
    });

    this.transformer.on('transformation:error', (data) => {
      this.emit('transformer:error', data);
    });

    // Gateway events
    this.gateway.on('request:success', (data) => {
      this.emit('gateway:success', data);
    });

    this.gateway.on('request:error', (data) => {
      this.emit('gateway:error', data);
    });

    // Orchestrator events
    this.orchestrator.on('workflow:completed', (data) => {
      this.emit('orchestrator:completed', data);
    });

    this.orchestrator.on('workflow:failed', (data) => {
      this.emit('orchestrator:failed', data);
    });
  }

  /**
   * Start integration system
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('System already running');
    }

    this.running = true;

    // Start components
    if (this.config.enableAutoDiscovery) {
      await this.adapter.startDiscovery();
    }

    if (this.config.enableAPIGateway) {
      await this.gateway.start();
    }

    this.emit('system:started');
  }

  /**
   * Stop integration system
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Stop components
    if (this.config.enableAutoDiscovery) {
      await this.adapter.stopDiscovery();
    }

    if (this.config.enableAPIGateway) {
      await this.gateway.stop();
    }

    this.emit('system:stopped');
  }

  /**
   * Process integration request
   */
  async integrate(request: IntegrationRequest): Promise<IntegrationResult> {
    const startTime = Date.now();
    const steps: IntegrationStep[] = [];

    try {
      this.stats.activeIntegrations++;
      this.emit('integration:started', { requestId: request.id });

      let data = request.data;

      // Step 1: Service Discovery (if needed)
      if (this.config.enableAutoDiscovery) {
        const discoveryStep = await this.performDiscovery(request);
        steps.push(discoveryStep);
      }

      // Step 2: Protocol Translation
      if (this.config.enableProtocolTranslation) {
        const translationStep = await this.performTranslation(request, data);
        steps.push(translationStep);
        if (translationStep.success) {
          data = (translationStep.metadata as any).translatedData;
        }
      }

      // Step 3: Data Transformation
      if (this.config.enableDataTransformation) {
        const transformationStep = await this.performTransformation(request, data);
        steps.push(transformationStep);
        if (transformationStep.success) {
          data = (transformationStep.metadata as any).transformedData;
        }
      }

      // Step 4: API Gateway Routing
      if (this.config.enableAPIGateway) {
        const gatewayStep = await this.performGatewayRouting(request, data);
        steps.push(gatewayStep);
        if (gatewayStep.success) {
          data = (gatewayStep.metadata as any).responseData;
        }
      }

      // Step 5: Workflow Orchestration (if workflow specified)
      if (this.config.enableOrchestration && request.workflow) {
        const orchestrationStep = await this.performOrchestration(request, data);
        steps.push(orchestrationStep);
        if (orchestrationStep.success) {
          data = (orchestrationStep.metadata as any).workflowOutput;
        }
      }

      const executionTime = Date.now() - startTime;
      this.updateStats(true, executionTime);

      this.emit('integration:completed', {
        requestId: request.id,
        executionTime
      });

      return {
        success: true,
        requestId: request.id,
        data,
        executionTime,
        steps,
        metadata: request.metadata || {}
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateStats(false, executionTime);

      this.emit('integration:failed', {
        requestId: request.id,
        error
      });

      return {
        success: false,
        requestId: request.id,
        error: error as Error,
        executionTime,
        steps,
        metadata: request.metadata || {}
      };
    } finally {
      this.stats.activeIntegrations--;
    }
  }

  /**
   * Perform service discovery
   */
  private async performDiscovery(request: IntegrationRequest): Promise<IntegrationStep> {
    const startTime = new Date();

    try {
      // Check if services are discovered
      const sourceService = this.adapter.searchServices({
        name: request.source.service
      })[0];

      const targetService = this.adapter.searchServices({
        name: request.target.service
      })[0];

      const endTime = new Date();

      return {
        name: 'Service Discovery',
        component: 'UniversalAdapter',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: true,
        metadata: {
          sourceService,
          targetService
        }
      };
    } catch (error) {
      const endTime = new Date();

      return {
        name: 'Service Discovery',
        component: 'UniversalAdapter',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        error: error as Error,
        metadata: {}
      };
    }
  }

  /**
   * Perform protocol translation
   */
  private async performTranslation(
    request: IntegrationRequest,
    data: any
  ): Promise<IntegrationStep> {
    const startTime = new Date();

    try {
      const message: ProtocolMessage = {
        id: request.id,
        sourceProtocol: request.source.protocol as any,
        targetProtocol: request.target.protocol as any,
        encoding: 'json' as any,
        headers: {},
        body: data,
        metadata: request.metadata || {},
        timestamp: new Date()
      };

      const result = await this.translator.translate(
        message,
        request.target.protocol as any
      );

      const endTime = new Date();

      return {
        name: 'Protocol Translation',
        component: 'ProtocolTranslator',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: result.success,
        error: result.error,
        metadata: {
          translatedData: result.message?.body,
          translationTime: result.translationTime
        }
      };
    } catch (error) {
      const endTime = new Date();

      return {
        name: 'Protocol Translation',
        component: 'ProtocolTranslator',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        error: error as Error,
        metadata: {}
      };
    }
  }

  /**
   * Perform data transformation
   */
  private async performTransformation(
    request: IntegrationRequest,
    data: any
  ): Promise<IntegrationStep> {
    const startTime = new Date();

    try {
      const transformRequest: TransformRequest = {
        id: request.id,
        sourceFormat: request.source.format as any,
        targetFormat: request.target.format as any,
        data,
        metadata: request.metadata
      };

      const result = await this.transformer.transform(transformRequest);

      const endTime = new Date();

      return {
        name: 'Data Transformation',
        component: 'DataTransformer',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: result.success,
        error: result.error,
        metadata: {
          transformedData: result.data,
          transformationTime: result.transformationTime
        }
      };
    } catch (error) {
      const endTime = new Date();

      return {
        name: 'Data Transformation',
        component: 'DataTransformer',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        error: error as Error,
        metadata: {}
      };
    }
  }

  /**
   * Perform API gateway routing
   */
  private async performGatewayRouting(
    request: IntegrationRequest,
    data: any
  ): Promise<IntegrationStep> {
    const startTime = new Date();

    try {
      const gatewayRequest: GatewayRequest = {
        id: request.id,
        method: 'POST' as any,
        path: `/api/${request.target.service}`,
        headers: {},
        query: {},
        body: data,
        metadata: request.metadata || {},
        timestamp: new Date()
      };

      const response = await this.gateway.handleRequest(gatewayRequest);

      const endTime = new Date();

      return {
        name: 'API Gateway Routing',
        component: 'APIGateway',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: response.statusCode === 200,
        metadata: {
          responseData: response.body,
          statusCode: response.statusCode
        }
      };
    } catch (error) {
      const endTime = new Date();

      return {
        name: 'API Gateway Routing',
        component: 'APIGateway',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        error: error as Error,
        metadata: {}
      };
    }
  }

  /**
   * Perform workflow orchestration
   */
  private async performOrchestration(
    request: IntegrationRequest,
    data: any
  ): Promise<IntegrationStep> {
    const startTime = new Date();

    try {
      const result = await this.orchestrator.executeWorkflow(
        request.workflow!,
        data,
        request.metadata
      );

      const endTime = new Date();

      return {
        name: 'Workflow Orchestration',
        component: 'IntegrationOrchestrator',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: result.status === 'completed',
        error: result.error,
        metadata: {
          workflowOutput: result.output,
          executionTime: result.executionTime
        }
      };
    } catch (error) {
      const endTime = new Date();

      return {
        name: 'Workflow Orchestration',
        component: 'IntegrationOrchestrator',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        error: error as Error,
        metadata: {}
      };
    }
  }

  /**
   * Update statistics
   */
  private updateStats(success: boolean, executionTime: number): void {
    this.stats.totalIntegrations++;
    
    if (success) {
      this.stats.successfulIntegrations++;
    } else {
      this.stats.failedIntegrations++;
    }

    // Update execution times
    this.executionTimes.push(executionTime);
    if (this.executionTimes.length > 1000) {
      this.executionTimes.shift();
    }

    // Calculate percentiles
    const sorted = [...this.executionTimes].sort((a, b) => a - b);
    this.stats.p50ExecutionTime = sorted[Math.floor(sorted.length * 0.5)];
    this.stats.p95ExecutionTime = sorted[Math.floor(sorted.length * 0.95)];
    this.stats.p99ExecutionTime = sorted[Math.floor(sorted.length * 0.99)];

    // Calculate average execution time
    const alpha = 0.1;
    this.stats.averageExecutionTime = 
      alpha * executionTime + (1 - alpha) * this.stats.averageExecutionTime;

    // Calculate throughput
    const elapsedSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    this.stats.throughput = this.stats.totalIntegrations / elapsedSeconds;

    // Calculate success rate
    this.stats.successRate = this.stats.successfulIntegrations / this.stats.totalIntegrations;

    // Calculate error rate
    this.stats.errorRate = this.stats.failedIntegrations / this.stats.totalIntegrations;

    // Update component stats
    this.stats.componentStats = {
      adapter: this.adapter.getStats(),
      translator: this.translator.getStats(),
      transformer: this.transformer.getStats(),
      gateway: this.gateway.getStats(),
      orchestrator: this.orchestrator.getStats()
    };
  }

  /**
   * Get system statistics
   */
  getStats(): SystemStats {
    return { ...this.stats };
  }

  /**
   * Get component instances
   */
  getComponents() {
    return {
      adapter: this.adapter,
      translator: this.translator,
      transformer: this.transformer,
      gateway: this.gateway,
      orchestrator: this.orchestrator
    };
  }

  /**
   * Register workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.orchestrator.registerWorkflow(workflow);
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalIntegrations: 0,
      successfulIntegrations: 0,
      failedIntegrations: 0,
      averageExecutionTime: 0,
      p50ExecutionTime: 0,
      p95ExecutionTime: 0,
      p99ExecutionTime: 0,
      throughput: 0,
      activeIntegrations: 0,
      successRate: 0,
      errorRate: 0,
      componentStats: {
        adapter: {},
        translator: {},
        transformer: {},
        gateway: {},
        orchestrator: {}
      }
    };
    this.executionTimes = [];
    this.startTime = new Date();
    this.emit('stats:reset');
  }
}

/**
 * Create universal integration system instance
 */
export function createUniversalIntegrationSystem(
  config?: SystemConfig
): UniversalIntegrationSystem {
  return new UniversalIntegrationSystem(config);
}