/**
 * Tool and Plugin Registry
 * 
 * Maintains a registry of all available tools, adapters, and plugins,
 * supporting dynamic discovery and registration.
 */

import { Tool, ToolMetadata, ToolDescriptor, ToolFactory } from './tool';
import { ToolNotFoundError, RegistryError } from './errors';
import { Logger } from '../observability/logger';

/**
 * Registry error class
 */
class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

/**
 * Tool filter options
 */
export interface ToolFilter {
  adapter?: string;
  tags?: string[];
  capabilities?: string[];
  deprecated?: boolean;
  namePattern?: RegExp;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalTools: number;
  toolsByAdapter: Record<string, number>;
  deprecatedTools: number;
  registeredAdapters: string[];
}

/**
 * Tool Registry class
 */
export class ToolRegistry {
  private tools: Map<string, ToolDescriptor>;
  private toolsByAdapter: Map<string, Set<string>>;
  private logger: Logger;
  private locked: boolean;

  constructor() {
    this.tools = new Map();
    this.toolsByAdapter = new Map();
    this.logger = new Logger('ToolRegistry');
    this.locked = false;
  }

  /**
   * Register a tool
   */
  register(descriptor: ToolDescriptor): void {
    if (this.locked) {
      throw new RegistryError('Registry is locked and cannot accept new registrations');
    }

    const { metadata } = descriptor;
    
    // Validate metadata
    if (!metadata.name || !metadata.adapter) {
      throw new RegistryError('Tool metadata must include name and adapter');
    }

    // Check for duplicate
    if (this.tools.has(metadata.name)) {
      this.logger.warn(`Tool '${metadata.name}' is already registered. Overwriting.`);
    }

    // Register tool
    this.tools.set(metadata.name, descriptor);

    // Update adapter index
    if (!this.toolsByAdapter.has(metadata.adapter)) {
      this.toolsByAdapter.set(metadata.adapter, new Set());
    }
    this.toolsByAdapter.get(metadata.adapter)!.add(metadata.name);

    this.logger.info(`Registered tool: ${metadata.name} (adapter: ${metadata.adapter})`);
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): boolean {
    if (this.locked) {
      throw new RegistryError('Registry is locked and cannot unregister tools');
    }

    const descriptor = this.tools.get(toolName);
    if (!descriptor) {
      return false;
    }

    // Remove from adapter index
    const adapterTools = this.toolsByAdapter.get(descriptor.metadata.adapter);
    if (adapterTools) {
      adapterTools.delete(toolName);
      if (adapterTools.size === 0) {
        this.toolsByAdapter.delete(descriptor.metadata.adapter);
      }
    }

    // Remove tool
    this.tools.delete(toolName);
    this.logger.info(`Unregistered tool: ${toolName}`);
    
    return true;
  }

  /**
   * Get a tool descriptor
   */
  get(toolName: string): ToolDescriptor | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Check if a tool exists
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * List all tool names
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * List all tool metadata
   */
  listMetadata(): ToolMetadata[] {
    return Array.from(this.tools.values()).map(d => d.metadata);
  }

  /**
   * Filter tools by criteria
   */
  filter(filter: ToolFilter): ToolMetadata[] {
    let results = Array.from(this.tools.values());

    // Filter by adapter
    if (filter.adapter) {
      results = results.filter(d => d.metadata.adapter === filter.adapter);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(d => 
        filter.tags!.some(tag => d.metadata.tags?.includes(tag))
      );
    }

    // Filter by capabilities
    if (filter.capabilities && filter.capabilities.length > 0) {
      results = results.filter(d =>
        filter.capabilities!.every(cap => d.metadata.capabilities?.includes(cap))
      );
    }

    // Filter by deprecated status
    if (filter.deprecated !== undefined) {
      results = results.filter(d => d.metadata.deprecated === filter.deprecated);
    }

    // Filter by name pattern
    if (filter.namePattern) {
      results = results.filter(d => filter.namePattern!.test(d.metadata.name));
    }

    return results.map(d => d.metadata);
  }

  /**
   * Get tools by adapter
   */
  getByAdapter(adapter: string): ToolMetadata[] {
    const toolNames = this.toolsByAdapter.get(adapter);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames)
      .map(name => this.tools.get(name))
      .filter((d): d is ToolDescriptor => d !== undefined)
      .map(d => d.metadata);
  }

  /**
   * Get all registered adapters
   */
  getAdapters(): string[] {
    return Array.from(this.toolsByAdapter.keys());
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const toolsByAdapter: Record<string, number> = {};
    
    for (const [adapter, tools] of this.toolsByAdapter.entries()) {
      toolsByAdapter[adapter] = tools.size;
    }

    const deprecatedTools = Array.from(this.tools.values())
      .filter(d => d.metadata.deprecated)
      .length;

    return {
      totalTools: this.tools.size,
      toolsByAdapter,
      deprecatedTools,
      registeredAdapters: this.getAdapters()
    };
  }

  /**
   * Create a tool instance
   */
  createTool(toolName: string, config?: any): Tool {
    const descriptor = this.tools.get(toolName);
    
    if (!descriptor) {
      throw new ToolNotFoundError(toolName);
    }

    return descriptor.factory.createTool(config);
  }

  /**
   * Lock the registry (prevent further registrations)
   */
  lock(): void {
    this.locked = true;
    this.logger.info('Registry locked');
  }

  /**
   * Unlock the registry
   */
  unlock(): void {
    this.locked = false;
    this.logger.info('Registry unlocked');
  }

  /**
   * Check if registry is locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    if (this.locked) {
      throw new RegistryError('Registry is locked and cannot be cleared');
    }

    this.tools.clear();
    this.toolsByAdapter.clear();
    this.logger.info('Registry cleared');
  }

  /**
   * Validate registry integrity
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for orphaned adapter references
    for (const [adapter, toolNames] of this.toolsByAdapter.entries()) {
      for (const toolName of toolNames) {
        if (!this.tools.has(toolName)) {
          errors.push(`Orphaned tool reference in adapter '${adapter}': ${toolName}`);
        }
      }
    }

    // Check for tools without adapter references
    for (const [toolName, descriptor] of this.tools.entries()) {
      const adapterTools = this.toolsByAdapter.get(descriptor.metadata.adapter);
      if (!adapterTools || !adapterTools.has(toolName)) {
        errors.push(`Tool '${toolName}' not indexed in adapter '${descriptor.metadata.adapter}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export registry to JSON
   */
  toJSON(): any {
    return {
      tools: Array.from(this.tools.entries()).map(([name, descriptor]) => ({
        name,
        metadata: descriptor.metadata,
        inputSchema: descriptor.inputSchema,
        outputSchema: descriptor.outputSchema
      })),
      stats: this.getStats(),
      locked: this.locked
    };
  }

  /**
   * Get tool count
   */
  size(): number {
    return this.tools.size;
  }
}

/**
 * Global registry instance
 */
let globalRegistry: ToolRegistry | null = null;

/**
 * Get or create global registry
 */
export function getGlobalRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (mainly for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}