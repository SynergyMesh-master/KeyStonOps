/**
 * Tool Wrapper Base Class
 * 
 * Defines the base class and interface for all tool wrappers,
 * enforcing a standard contract for tool metadata, schema, and invocation.
 */

import { SchemaValidator } from '../schema/validator';
import { ToolExecutionError, SchemaValidationError } from './errors';

/**
 * Tool metadata interface
 */
export interface ToolMetadata {
  /** Unique tool identifier */
  name: string;
  /** Human-readable title */
  title: string;
  /** Tool description */
  description: string;
  /** Tool version */
  version: string;
  /** Tool category/tags */
  tags?: string[];
  /** Adapter/service name */
  adapter: string;
  /** Required capabilities */
  capabilities?: string[];
  /** Deprecation notice */
  deprecated?: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
}

/**
 * Tool invocation context
 */
export interface ToolContext {
  /** Correlation ID for tracing */
  correlationId: string;
  /** User/agent identifier */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Request timestamp */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Tool invocation result
 */
export interface ToolResult<T = any> {
  /** Execution success status */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error information */
  error?: {
    code: number;
    message: string;
    details?: any;
  };
  /** Execution metadata */
  metadata: {
    executionTime: number;
    timestamp: Date;
    correlationId: string;
  };
}

/**
 * Abstract base class for tool wrappers
 */
export abstract class Tool<TInput = any, TOutput = any> {
  protected validator: SchemaValidator;
  
  constructor(protected metadata: ToolMetadata) {
    this.validator = new SchemaValidator();
  }

  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return { ...this.metadata };
  }

  /**
   * Get input schema (JSON Schema)
   */
  abstract getInputSchema(): any;

  /**
   * Get output schema (JSON Schema)
   */
  abstract getOutputSchema(): any;

  /**
   * Execute the tool with validation
   */
  async execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const inputValidation = await this.validator.validate(
        input,
        this.getInputSchema()
      );
      
      if (!inputValidation.valid) {
        throw new SchemaValidationError(
          'Input validation failed',
          inputValidation.errors || [],
          context.correlationId
        );
      }

      // Execute tool logic
      const result = await this.invoke(input, context);

      // Validate output
      const outputValidation = await this.validator.validate(
        result,
        this.getOutputSchema()
      );
      
      if (!outputValidation.valid) {
        throw new SchemaValidationError(
          'Output validation failed',
          outputValidation.errors || [],
          context.correlationId
        );
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime,
          timestamp: new Date(),
          correlationId: context.correlationId
        }
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: {
          code: error.code || -32603,
          message: error.message,
          details: error.data
        },
        metadata: {
          executionTime,
          timestamp: new Date(),
          correlationId: context.correlationId
        }
      };
    }
  }

  /**
   * Core tool implementation (to be overridden by subclasses)
   */
  protected abstract invoke(input: TInput, context: ToolContext): Promise<TOutput>;

  /**
   * Lifecycle hooks
   */
  async onBeforeInvoke?(input: TInput, context: ToolContext): Promise<void>;
  async onAfterInvoke?(result: TOutput, context: ToolContext): Promise<void>;
  async onError?(error: Error, context: ToolContext): Promise<void>;

  /**
   * Check if tool supports a capability
   */
  hasCapability(capability: string): boolean {
    return this.metadata.capabilities?.includes(capability) || false;
  }

  /**
   * Check if tool is deprecated
   */
  isDeprecated(): boolean {
    return this.metadata.deprecated || false;
  }

  /**
   * Get deprecation message
   */
  getDeprecationMessage(): string | undefined {
    return this.metadata.deprecationMessage;
  }
}

/**
 * Tool factory interface
 */
export interface ToolFactory {
  /**
   * Create a tool instance
   */
  createTool(config?: any): Tool;
  
  /**
   * Get tool metadata without instantiation
   */
  getToolMetadata(): ToolMetadata;
}

/**
 * Tool descriptor for registry
 */
export interface ToolDescriptor {
  metadata: ToolMetadata;
  factory: ToolFactory;
  inputSchema: any;
  outputSchema: any;
}

/**
 * Utility functions for tool management
 */
export class ToolUtils {
  /**
   * Generate correlation ID
   */
  static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create tool context
   */
  static createContext(options: Partial<ToolContext> = {}): ToolContext {
    return {
      correlationId: options.correlationId || this.generateCorrelationId(),
      userId: options.userId,
      sessionId: options.sessionId,
      timestamp: options.timestamp || new Date(),
      metadata: options.metadata || {}
    };
  }

  /**
   * Validate tool metadata
   */
  static validateMetadata(metadata: ToolMetadata): boolean {
    return !!(
      metadata.name &&
      metadata.title &&
      metadata.description &&
      metadata.version &&
      metadata.adapter
    );
  }

  /**
   * Compare tool versions
   */
  static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    
    return 0;
  }
}