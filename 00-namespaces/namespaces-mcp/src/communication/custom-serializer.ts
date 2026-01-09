/**
 * MCP Custom Serializer - Extensible custom serialization framework
 * 
 * Provides flexible custom serialization with:
 * - Pluggable serialization strategies
 * - Custom type converters
 * - Performance optimization hooks
 * - Extensible validation framework
 */

import { Serializer } from './serializer-registry';

export interface CustomTypeConverter<T = any> {
  name: string;
  types: string[];
  serialize: (value: T, context?: SerializationContext) => Promise<any>;
  deserialize: (value: any, context?: DeserializationContext) => Promise<T>;
  validate?: (value: T) => Promise<boolean>;
}

export interface SerializationPlugin {
  name: string;
  version: string;
  converters: CustomTypeConverter[];
  preprocessors?: Array<(data: any, context: SerializationContext) => Promise<any>>;
  postprocessors?: Array<(data: any, context: SerializationContext) => Promise<any>>;
  validators?: Array<(data: any) => Promise<boolean>>;
}

export interface SerializationContext {
  version?: string;
  metadata?: Record<string, any>;
  options?: Record<string, any>;
  depth?: number;
  maxDepth?: number;
}

export interface DeserializationContext {
  version?: string;
  metadata?: Record<string, any>;
  options?: Record<string, any>;
  depth?: number;
  maxDepth?: number;
}

export interface CustomSerializerConfig {
  plugins?: SerializationPlugin[];
  enableValidation?: boolean;
  maxDepth?: number;
  enableMetrics?: boolean;
  fallbackToJSON?: boolean;
  preserveUndefined?: boolean;
}

/**
 * Extensible custom serializer implementation
 */
export class MCPCustomSerializer implements Serializer {
  public readonly name = 'custom';
  public readonly version = '1.0.0';
  public readonly mimeTypes = [
    'application/x-custom',
    'application/vnd.mcp.custom',
    'application/octet-stream' // fallback
  ];
  public readonly compress = false;
  public readonly binary = true;

  private plugins = new Map<string, SerializationPlugin>();
  private converters = new Map<string, CustomTypeConverter>();
  private metrics = {
    serializations: 0,
    deserializations: 0,
    errors: 0,
    conversions: 0,
    validationTime: 0
  };

  constructor(private config: CustomSerializerConfig = {}) {
    this.config = {
      enableValidation: true,
      maxDepth: 10,
      enableMetrics: false,
      fallbackToJSON: true,
      preserveUndefined: false,
      ...config
    };

    // Register built-in plugins
    this.registerBuiltInPlugins();
    
    // Register user plugins
    if (this.config.plugins) {
      for (const plugin of this.config.plugins) {
        this.registerPlugin(plugin);
      }
    }
  }

  async serialize(data: any, options: CustomSerializerConfig = {}): Promise<Buffer> {
    const startTime = performance.now();
    
    try {
      const context: SerializationContext = {
        version: options.version || '1.0',
        metadata: options.metadata || {},
        options: options.options || {},
        depth: 0,
        maxDepth: options.maxDepth || this.config.maxDepth
      };

      // Apply preprocessors
      let processedData = await this.applyPreprocessors(data, context);

      // Serialize with custom converters
      const serialized = await this.serializeWithConverters(processedData, context);

      // Apply postprocessors
      const finalResult = await this.applyPostprocessors(serialized, context);

      // Convert to buffer
      let result: Buffer;
      if (typeof finalResult === 'string') {
        result = Buffer.from(finalResult, 'utf8');
      } else if (Buffer.isBuffer(finalResult)) {
        result = finalResult;
      } else {
        result = Buffer.from(JSON.stringify(finalResult), 'utf8');
      }

      if (this.config.enableMetrics) {
        this.metrics.serializations++;
        const time = performance.now() - startTime;
        console.log(`Serialization completed in ${time.toFixed(2)}ms`);
      }

      return result;

    } catch (error) {
      if (this.config.enableMetrics) {
        this.metrics.errors++;
      }
      
      // Fallback to JSON if enabled
      if (this.config.fallbackToJSON) {
        console.warn('Custom serialization failed, falling back to JSON:', error);
        return Buffer.from(JSON.stringify(data), 'utf8');
      }
      
      throw new Error(`Custom serialization failed: ${error.message}`);
    }
  }

  async deserialize(data: Buffer, options: CustomSerializerConfig = {}): Promise<any> {
    const startTime = performance.now();
    
    try {
      const context: DeserializationContext = {
        version: options.version || '1.0',
        metadata: options.metadata || {},
        options: options.options || {},
        depth: 0,
        maxDepth: options.maxDepth || this.config.maxDepth
      };

      // Convert buffer to initial data
      let initialData: any;
      try {
        // Try to parse as JSON first
        const str = data.toString('utf8');
        initialData = JSON.parse(str);
      } catch {
        // If not JSON, treat as raw buffer
        initialData = data;
      }

      // Deserialize with custom converters
      const deserialized = await this.deserializeWithConverters(initialData, context);

      if (this.config.enableMetrics) {
        this.metrics.deserializations++;
        const time = performance.now() - startTime;
        console.log(`Deserialization completed in ${time.toFixed(2)}ms`);
      }

      return deserialized;

    } catch (error) {
      if (this.config.enableMetrics) {
        this.metrics.errors++;
      }
      
      // Fallback to JSON if enabled
      if (this.config.fallbackToJSON) {
        console.warn('Custom deserialization failed, falling back to JSON:', error);
        return JSON.parse(data.toString('utf8'));
      }
      
      throw new Error(`Custom deserialization failed: ${error.message}`);
    }
  }

  async validate(data: any): Promise<boolean> {
    if (!this.config.enableValidation) {
      return true;
    }

    try {
      // Run all validators from plugins
      for (const plugin of this.plugins.values()) {
        if (plugin.validators) {
          for (const validator of plugin.validators) {
            const isValid = await validator(data);
            if (!isValid) {
              return false;
            }
          }
        }
      }

      // Test serialization/deserialization cycle
      const serialized = await this.serialize(data);
      await this.deserialize(serialized);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Register a serialization plugin
   */
  registerPlugin(plugin: SerializationPlugin): void {
    this.plugins.set(plugin.name, plugin);
    
    // Register converters
    for (const converter of plugin.converters) {
      for (const type of converter.types) {
        this.converters.set(type, converter);
      }
    }
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    // Remove converters
    for (const converter of plugin.converters) {
      for (const type of converter.types) {
        this.converters.delete(type);
      }
    }

    this.plugins.delete(name);
    return true;
  }

  /**
   * Get registered plugins
   */
  getPlugins(): Array<{ name: string; version: string; converters: string[] }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      converters: plugin.converters.map(c => c.name)
    }));
  }

  /**
   * Get supported types
   */
  getSupportedTypes(): string[] {
    return Array.from(this.converters.keys());
  }

  /**
   * Get metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  private async serializeWithConverters(data: any, context: SerializationContext): Promise<any> {
    // Check depth limit
    if (context.depth && context.maxDepth && context.depth >= context.maxDepth) {
      throw new Error('Maximum serialization depth exceeded');
    }

    const dataType = Array.isArray(data) ? 'array' : typeof data;
    const converter = this.converters.get(dataType);

    if (converter) {
      if (this.config.enableMetrics) {
        this.metrics.conversions++;
      }

      const newContext = { ...context, depth: (context.depth || 0) + 1 };
      return await converter.serialize(data, newContext);
    }

    // Handle objects recursively
    if (dataType === 'object' && data !== null) {
      const result: any = {};
      const newContext = { ...context, depth: (context.depth || 0) + 1 };

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined || this.config.preserveUndefined) {
          result[key] = await this.serializeWithConverters(value, newContext);
        }
      }

      return result;
    }

    // Handle arrays recursively
    if (Array.isArray(data)) {
      const newContext = { ...context, depth: (context.depth || 0) + 1 };
      return Promise.all(data.map(item => this.serializeWithConverters(item, newContext)));
    }

    // Return primitive values as-is
    return data;
  }

  private async deserializeWithConverters(data: any, context: DeserializationContext): Promise<any> {
    // Check depth limit
    if (context.depth && context.maxDepth && context.depth >= context.maxDepth) {
      throw new Error('Maximum deserialization depth exceeded');
    }

    // Try to detect type and find converter
    let dataType: string;
    
    if (Array.isArray(data)) {
      dataType = 'array';
    } else if (typeof data === 'object' && data !== null) {
      // Check for type hint in metadata
      if (data.__type && this.converters.has(data.__type)) {
        dataType = data.__type;
      } else {
        dataType = 'object';
      }
    } else {
      dataType = typeof data;
    }

    const converter = this.converters.get(dataType);

    if (converter) {
      if (this.config.enableMetrics) {
        this.metrics.conversions++;
      }

      const newContext = { ...context, depth: (context.depth || 0) + 1 };
      return await converter.deserialize(data, newContext);
    }

    // Handle objects recursively
    if (dataType === 'object' && data !== null && !Array.isArray(data)) {
      const result: any = {};
      const newContext = { ...context, depth: (context.depth || 0) + 1 };

      for (const [key, value] of Object.entries(data)) {
        result[key] = await this.deserializeWithConverters(value, newContext);
      }

      return result;
    }

    // Handle arrays recursively
    if (Array.isArray(data)) {
      const newContext = { ...context, depth: (context.depth || 0) + 1 };
      return Promise.all(data.map(item => this.deserializeWithConverters(item, newContext)));
    }

    // Return primitive values as-is
    return data;
  }

  private async applyPreprocessors(data: any, context: SerializationContext): Promise<any> {
    let result = data;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.preprocessors) {
        for (const preprocessor of plugin.preprocessors) {
          result = await preprocessor(result, context);
        }
      }
    }
    
    return result;
  }

  private async applyPostprocessors(data: any, context: SerializationContext): Promise<any> {
    let result = data;
    
    for (const plugin of this.plugins.values()) {
      if (plugin.postprocessors) {
        for (const postprocessor of plugin.postprocessors) {
          result = await postprocessor(result, context);
        }
      }
    }
    
    return result;
  }

  private registerBuiltInPlugins(): void {
    // Date converter
    const dateConverter: CustomTypeConverter<Date> = {
      name: 'date',
      types: ['object'],
      serialize: async (value: Date) => ({
        __type: 'date',
        value: value.toISOString()
      }),
      deserialize: async (data: any) => new Date(data.value),
      validate: async (value: Date) => value instanceof Date && !isNaN(value.getTime())
    };

    // Regex converter
    const regexConverter: CustomTypeConverter<RegExp> = {
      name: 'regex',
      types: ['object'],
      serialize: async (value: RegExp) => ({
        __type: 'regex',
        pattern: value.source,
        flags: value.flags
      }),
      deserialize: async (data: any) => new RegExp(data.pattern, data.flags),
      validate: async (value: RegExp) => value instanceof RegExp
    };

    // Error converter
    const errorConverter: CustomTypeConverter<Error> = {
      name: 'error',
      types: ['object'],
      serialize: async (value: Error) => ({
        __type: 'error',
        name: value.name,
        message: value.message,
        stack: value.stack
      }),
      deserialize: async (data: any) => {
        const error = new Error(data.message);
        error.name = data.name;
        error.stack = data.stack;
        return error;
      },
      validate: async (value: Error) => value instanceof Error
    };

    const builtInPlugin: SerializationPlugin = {
      name: 'builtin',
      version: '1.0.0',
      converters: [dateConverter, regexConverter, errorConverter]
    };

    this.registerPlugin(builtInPlugin);
  }

  /**
   * Create custom serializer with plugins
   */
  static withPlugins(plugins: SerializationPlugin[]): MCPCustomSerializer {
    return new MCPCustomSerializer({ plugins });
  }

  /**
   * Create custom serializer with validation disabled
   */
  static withoutValidation(): MCPCustomSerializer {
    return new MCPCustomSerializer({ enableValidation: false });
  }

  /**
   * Create custom serializer with JSON fallback
   */
  static withJSONFallback(): MCPCustomSerializer {
    return new MCPCustomSerializer({ fallbackToJSON: true });
  }
}