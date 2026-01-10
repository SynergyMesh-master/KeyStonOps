/**
 * MCP Tool Interface Definitions
 * 
 * Comprehensive interface definitions for MCP tools with support for
 * various tool types, execution modes, and result formats.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

/**
 * Tool Type
 */
export enum ToolType {
  FUNCTION = 'function',
  COMMAND = 'command',
  API = 'api',
  WORKFLOW = 'workflow',
  TRANSFORMER = 'transformer',
  VALIDATOR = 'validator',
  GENERATOR = 'generator',
  ANALYZER = 'analyzer'
}

/**
 * Execution Mode
 */
export enum ExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  STREAMING = 'streaming',
  BATCH = 'batch',
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential'
}

/**
 * Tool Status
 */
export enum ToolStatus {
  REGISTERING = 'registering',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  DEPRECATED = 'deprecated',
  MAINTENANCE = 'maintenance'
}

/**
 * Parameter Type
 */
export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  FILE = 'file',
  BINARY = 'binary',
  DATE = 'date',
  ENUM = 'enum'
}

/**
 * Tool Parameter
 */
export interface ToolParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: ParameterValidation;
  metadata?: Record<string, any>;
}

/**
 * Parameter Validation
 */
export interface ParameterValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: any[];
  custom?: string; // Reference to custom validator
}

/**
 * Tool Result
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: ToolError;
  metadata?: ToolResultMetadata;
  executionTime: number;
  timestamp: number;
}

/**
 * Tool Error
 */
export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Tool Result Metadata
 */
export interface ToolResultMetadata {
  version: string;
  toolId: string;
  executionId: string;
  parameters: Record<string, any>;
  metrics: Record<string, number>;
  logs: string[];
  warnings: string[];
}

/**
 * Tool Configuration
 */
export interface ToolConfiguration {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheTimeout: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  resources: ToolResources;
}

/**
 * Tool Resources
 */
export interface ToolResources {
  maxMemory: number;
  maxCPU: number;
  maxDisk: number;
  maxNetwork: number;
  requiredPermissions: string[];
}

/**
 * Tool Schema
 */
export interface ToolSchema {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  category: string;
  type: ToolType;
  mode: ExecutionMode;
  parameters: ToolParameter[];
  returns: ToolResultSchema;
  examples: ToolExample[];
  dependencies: string[];
}

/**
 * Tool Result Schema
 */
export interface ToolResultSchema {
  type: ParameterType;
  description: string;
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
  required?: string[];
}

/**
 * Tool Example
 */
export interface ToolExample {
  name: string;
  description: string;
  parameters: Record<string, any>;
  result: ToolResult;
}

/**
 * Tool Interface
 */
export interface ITool {
  readonly id: string;
  readonly schema: ToolSchema;
  readonly configuration: ToolConfiguration;
  readonly status: ToolStatus;
  readonly registeredAt: number;
  readonly lastUsed: number;
  readonly usageCount: number;

  /**
   * Execute the tool
   */
  execute(parameters: Record<string, any>, context?: ToolExecutionContext): Promise<ToolResult>;

  /**
   * Validate parameters
   */
  validateParameters(parameters: Record<string, any>): ToolValidationResult;

  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata;

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<ToolConfiguration>): void;

  /**
   * Get usage statistics
   */
  getUsageStatistics(): ToolUsageStatistics;

  /**
   * Reset usage statistics
   */
  resetUsageStatistics(): void;

  /**
   * Destroy tool
   */
  destroy(): void;
}

/**
 * Tool Execution Context
 */
export interface ToolExecutionContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: number;
  permissions: string[];
  environment: Record<string, string>;
  callbacks: {
    onProgress?: (progress: ToolProgress) => void;
    onLog?: (log: ToolLog) => void;
    onMetric?: (metric: ToolMetric) => void;
  };
}

/**
 * Tool Progress
 */
export interface ToolProgress {
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
  timestamp: number;
}

/**
 * Tool Log
 */
export interface ToolLog {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Tool Metric
 */
export interface ToolMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Tool Validation Result
 */
export interface ToolValidationResult {
  isValid: boolean;
  errors: ToolValidationError[];
  warnings: ToolValidationWarning[];
}

/**
 * Tool Validation Error
 */
export interface ToolValidationError {
  parameter: string;
  code: string;
  message: string;
  severity: 'error' | 'critical';
}

/**
 * Tool Validation Warning
 */
export interface ToolValidationWarning {
  parameter: string;
  code: string;
  message: string;
}

/**
 * Tool Metadata
 */
export interface ToolMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  type: ToolType;
  mode: ExecutionMode;
  registeredAt: number;
  lastUsed: number;
  usageCount: number;
  averageExecutionTime: number;
  successRate: number;
  status: ToolStatus;
}

/**
 * Tool Usage Statistics
 */
export interface ToolUsageStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime: number;
  lastErrorTime?: number;
  errorsByCode: Record<string, number>;
  popularParameters: Record<string, number>;
}

/**
 * Tool Factory Interface
 */
export interface IToolFactory {
  /**
   * Create a new tool instance
   */
  createTool(schema: ToolSchema, config?: Partial<ToolConfiguration>): ITool;

  /**
   * Get supported tool types
   */
  getSupportedTypes(): ToolType[];

  /**
   * Validate tool schema
   */
  validateSchema(schema: ToolSchema): boolean;

  /**
   * Get factory metadata
   */
  getFactoryMetadata(): ToolFactoryMetadata;
}

/**
 * Tool Factory Metadata
 */
export interface ToolFactoryMetadata {
  name: string;
  version: string;
  description: string;
  supportedTypes: ToolType[];
  capabilities: string[];
}

/**
 * Tool Registry Interface
 */
export interface IToolRegistry {
  /**
   * Register a tool
   */
  registerTool(tool: ITool): Promise<void>;

  /**
   * Unregister a tool
   */
  unregisterTool(toolId: string): Promise<void>;

  /**
   * Get a tool by ID
   */
  getTool(toolId: string): ITool | null;

  /**
   * List all tools
   */
  listTools(): ITool[];

  /**
   * Search for tools
   */
  searchTools(criteria: ToolSearchCriteria): ITool[];

  /**
   * Get tools by type
   */
  getToolsByType(type: ToolType): ITool[];

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ITool[];

  /**
   * Get tools by tag
   */
  getToolsByTag(tag: string): ITool[];

  /**
   * Get registry statistics
   */
  getStatistics(): ToolRegistryStatistics;
}

/**
 * Tool Search Criteria
 */
export interface ToolSearchCriteria {
  name?: string;
  type?: ToolType;
  category?: string;
  tags?: string[];
  author?: string;
  status?: ToolStatus;
  minVersion?: string;
  maxVersion?: string;
  registeredAfter?: number;
  registeredBefore?: number;
}

/**
 * Tool Registry Statistics
 */
export interface ToolRegistryStatistics {
  totalTools: number;
  toolsByType: Record<ToolType, number>;
  toolsByCategory: Record<string, number>;
  toolsByStatus: Record<ToolStatus, number>;
  totalExecutions: number;
  successfulExecutions: number;
  averageExecutionTime: number;
  lastUpdated: number;
}

/**
 * Tool Executor Interface
 */
export interface IToolExecutor {
  /**
   * Execute a tool
   */
  execute(
    toolId: string,
    parameters: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolResult>;

  /**
   * Execute multiple tools in parallel
   */
  executeParallel(
    executions: Array<{
      toolId: string;
      parameters: Record<string, any>;
      context?: ToolExecutionContext;
    }>
  ): Promise<ToolResult[]>;

  /**
   * Execute tools in sequence
   */
  executeSequence(
    executions: Array<{
      toolId: string;
      parameters: Record<string, any>;
      context?: ToolExecutionContext;
    }>
  ): Promise<ToolResult[]>;

  /**
   * Cancel an execution
   */
  cancelExecution(executionId: string): Promise<void>;

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ToolExecutionStatus;

  /**
   * Get executor statistics
   */
  getStatistics(): ToolExecutorStatistics;
}

/**
 * Tool Execution Status
 */
export interface ToolExecutionStatus {
  executionId: string;
  toolId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  progress?: number;
  result?: ToolResult;
  error?: string;
}

/**
 * Tool Executor Statistics
 */
export interface ToolExecutorStatistics {
  totalExecutions: number;
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  averageExecutionTime: number;
  executionsPerSecond: number;
  queueSize: number;
}

/**
 * Tool Builder Interface
 */
export interface IToolBuilder {
  /**
   * Set tool name
   */
  name(name: string): IToolBuilder;

  /**
   * Set tool version
   */
  version(version: string): IToolBuilder;

  /**
   * Set tool description
   */
  description(description: string): IToolBuilder;

  /**
   * Set tool author
   */
  author(author: string): IToolBuilder;

  /**
   * Set tool type
   */
  type(type: ToolType): IToolBuilder;

  /**
   * Set execution mode
   */
  mode(mode: ExecutionMode): IToolBuilder;

  /**
   * Add parameter
   */
  parameter(parameter: ToolParameter): IToolBuilder;

  /**
   * Add multiple parameters
   */
  parameters(parameters: ToolParameter[]): IToolBuilder;

  /**
   * Set result schema
   */
  returns(schema: ToolResultSchema): IToolBuilder;

  /**
   * Add tag
   */
  tag(tag: string): IToolBuilder;

  /**
   * Add multiple tags
   */
  tags(tags: string[]): IToolBuilder;

  /**
   * Set category
   */
  category(category: string): IToolBuilder;

  /**
   * Add example
   */
  example(example: ToolExample): IToolBuilder;

  /**
   * Add multiple examples
   */
  examples(examples: ToolExample[]): IToolBuilder;

  /**
   * Set configuration
   */
  configuration(config: Partial<ToolConfiguration>): IToolBuilder;

  /**
   * Set execution function
   */
  execute(executor: (params: Record<string, any>, context?: ToolExecutionContext) => Promise<any>): IToolBuilder;

  /**
   * Build the tool
   */
  build(): ITool;
}

/**
 * Tool Plugin Interface
 */
export interface IToolPlugin {
  /**
   * Plugin name
   */
  readonly name: string;

  /**
   * Plugin version
   */
  readonly version: string;

  /**
   * Plugin description
   */
  readonly description: string;

  /**
   * Initialize plugin
   */
  initialize(config?: Record<string, any>): Promise<void>;

  /**
   * Register tool
   */
  registerTool(tool: ITool): Promise<void>;

  /**
   * Unregister tool
   */
  unregisterTool(toolId: string): Promise<void>;

  /**
   * Get plugin tools
   */
  getTools(): ITool[];

  /**
   * Destroy plugin
   */
  destroy(): void;
}

/**
 * Default tool configuration
 */
export const DEFAULT_TOOL_CONFIGURATION: ToolConfiguration = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableCaching: true,
  cacheTimeout: 300000,
  enableMetrics: true,
  enableLogging: true,
  logLevel: 'info',
  resources: {
    maxMemory: 512 * 1024 * 1024, // 512MB
    maxCPU: 100, // 100%
    maxDisk: 1024 * 1024 * 1024, // 1GB
    maxNetwork: 100 * 1024 * 1024, // 100MB/s
    requiredPermissions: []
  }
};

/**
 * Tool interface utilities
 */
export class ToolInterfaceUtils {
  /**
   * Create a basic tool parameter
   */
  static createParameter(
    name: string,
    type: ParameterType,
    required: boolean = false,
    description: string = ''
  ): ToolParameter {
    return {
      name,
      type,
      required,
      description
    };
  }

  /**
   * Create a string parameter with validation
   */
  static createStringParameter(
    name: string,
    required: boolean = false,
    description: string = '',
    validation?: ParameterValidation
  ): ToolParameter {
    return {
      name,
      type: ParameterType.STRING,
      required,
      description,
      validation
    };
  }

  /**
   * Create a number parameter with validation
   */
  static createNumberParameter(
    name: string,
    required: boolean = false,
    description: string = '',
    validation?: ParameterValidation
  ): ToolParameter {
    return {
      name,
      type: ParameterType.NUMBER,
      required,
      description,
      validation
    };
  }

  /**
   * Create an array parameter
   */
  static createArrayParameter(
    name: string,
    itemType: ParameterType,
    required: boolean = false,
    description: string = ''
  ): ToolParameter {
    return {
      name,
      type: ParameterType.ARRAY,
      required,
      description,
      metadata: { itemType }
    };
  }

  /**
   * Create a basic tool result
   */
  static createResult(
    success: boolean,
    data?: any,
    error?: ToolError,
    executionTime: number = 0
  ): ToolResult {
    return {
      success,
      data,
      error,
      executionTime,
      timestamp: Date.now()
    };
  }

  /**
   * Create a tool error
   */
  static createError(
    code: string,
    message: string,
    details?: Record<string, any>
  ): ToolError {
    return {
      code,
      message,
      details
    };
  }

  /**
   * Validate tool schema
   */
  static validateSchema(schema: ToolSchema): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    // Basic validation
    if (!schema.name || schema.name.trim().length === 0) {
      errors.push({
        parameter: 'name',
        code: 'REQUIRED_FIELD',
        message: 'Tool name is required',
        severity: 'error'
      });
    }

    if (!schema.version || schema.version.trim().length === 0) {
      errors.push({
        parameter: 'version',
        code: 'REQUIRED_FIELD',
        message: 'Tool version is required',
        severity: 'error'
      });
    }

    if (!schema.description || schema.description.trim().length === 0) {
      errors.push({
        parameter: 'description',
        code: 'REQUIRED_FIELD',
        message: 'Tool description is required',
        severity: 'error'
      });
    }

    // Validate parameters
    for (const param of schema.parameters) {
      if (!param.name || param.name.trim().length === 0) {
        errors.push({
          parameter: param.name,
          code: 'INVALID_PARAMETER_NAME',
          message: 'Parameter name is required',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}