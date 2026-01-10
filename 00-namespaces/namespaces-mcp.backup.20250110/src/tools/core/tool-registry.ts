/**
 * MCP Tool Registry
 * 
 * Comprehensive tool registry with registration, discovery, search,
 * and lifecycle management for MCP tools.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ITool,
  IToolRegistry,
  ToolType,
  ToolStatus,
  ToolSchema,
  ToolConfiguration,
  ToolSearchCriteria,
  ToolRegistryStatistics,
  ToolValidationResult,
  DEFAULT_TOOL_CONFIGURATION
} from './tool-interface';

/**
 * Registry Configuration
 */
export interface RegistryConfig {
  maxTools: number;
  enableMetrics: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
  cleanupInterval: number;
  enableValidation: boolean;
  strictValidation: boolean;
  enableNotifications: boolean;
}

/**
 * Tool Registration
 */
export interface ToolRegistration {
  tool: ITool;
  registeredAt: number;
  registeredBy: string;
  metadata: Record<string, any>;
}

/**
 * Tool Registry Implementation
 */
export class MCPToolRegistry extends EventEmitter implements IToolRegistry {
  private config: RegistryConfig;
  private tools: Map<string, ToolRegistration> = new Map();
  private toolsByType: Map<ToolType, Set<string>> = new Map();
  private toolsByCategory: Map<string, Set<string>> = new Map();
  private toolsByTag: Map<string, Set<string>> = new Map();
  private toolsByStatus: Map<ToolStatus, Set<string>> = new Map();
  private cache: Map<string, any> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private statistics: ToolRegistryStatistics;

  constructor(config?: Partial<RegistryConfig>) {
    super();
    
    this.config = {
      maxTools: 10000,
      enableMetrics: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      cleanupInterval: 300000, // 5 minutes
      enableValidation: true,
      strictValidation: false,
      enableNotifications: true,
      ...config
    };

    this.initializeStatistics();
    this.initializeIndexes();
    this.startCleanup();
  }

  /**
   * Register a tool
   */
  public async registerTool(tool: ITool): Promise<void> {
    try {
      // Check capacity
      if (this.tools.size >= this.config.maxTools) {
        throw new Error('Registry capacity exceeded');
      }

      // Validate tool
      if (this.config.enableValidation) {
        const validation = this.validateTool(tool);
        if (!validation.isValid) {
          throw new Error(`Tool validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Check for duplicates
      if (this.tools.has(tool.id)) {
        throw new Error(`Tool with ID '${tool.id}' is already registered`);
      }

      // Create registration
      const registration: ToolRegistration = {
        tool,
        registeredAt: Date.now(),
        registeredBy: 'system', // Could be passed as parameter
        metadata: {}
      };

      // Add to registry
      this.tools.set(tool.id, registration);
      this.addToIndexes(tool);

      // Update statistics
      this.updateStatistics();

      this.emit('tool-registered', { toolId: tool.id, tool });

      if (this.config.enableNotifications) {
        this.emit('notification', {
          type: 'tool-registered',
          toolId: tool.id,
          toolName: tool.schema.name,
          toolType: tool.schema.type
        });
      }

    } catch (error) {
      this.emit('tool-registration-error', { tool, error });
      throw error;
    }
  }

  /**
   * Unregister a tool
   */
  public async unregisterTool(toolId: string): Promise<void> {
    try {
      const registration = this.tools.get(toolId);
      
      if (!registration) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      const tool = registration.tool;

      // Remove from registry
      this.tools.delete(toolId);
      this.removeFromIndexes(tool);

      // Destroy tool
      tool.destroy();

      // Update statistics
      this.updateStatistics();

      this.emit('tool-unregistered', { toolId, tool });

      if (this.config.enableNotifications) {
        this.emit('notification', {
          type: 'tool-unregistered',
          toolId,
          toolName: tool.schema.name
        });
      }

    } catch (error) {
      this.emit('tool-unregistration-error', { toolId, error });
      throw error;
    }
  }

  /**
   * Get a tool by ID
   */
  public getTool(toolId: string): ITool | null {
    const registration = this.tools.get(toolId);
    return registration ? registration.tool : null;
  }

  /**
   * List all tools
   */
  public listTools(): ITool[] {
    return Array.from(this.tools.values()).map(reg => reg.tool);
  }

  /**
   * Search for tools
   */
  public searchTools(criteria: ToolSearchCriteria): ITool[] {
    let tools = this.listTools();

    // Apply filters
    tools = this.applySearchFilters(tools, criteria);

    // Apply text search
    if (criteria.name) {
      const searchTerm = criteria.name.toLowerCase();
      tools = tools.filter(tool => 
        tool.schema.name.toLowerCase().includes(searchTerm) ||
        tool.schema.description.toLowerCase().includes(searchTerm)
      );
    }

    return tools;
  }

  /**
   * Get tools by type
   */
  public getToolsByType(type: ToolType): ITool[] {
    const toolIds = this.toolsByType.get(type) || new Set();
    return Array.from(toolIds)
      .map(id => this.getTool(id))
      .filter(tool => tool !== undefined) as ITool[];
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): ITool[] {
    const toolIds = this.toolsByCategory.get(category) || new Set();
    return Array.from(toolIds)
      .map(id => this.getTool(id))
      .filter(tool => tool !== undefined) as ITool[];
  }

  /**
   * Get tools by tag
   */
  public getToolsByTag(tag: string): ITool[] {
    const toolIds = this.toolsByTag.get(tag) || new Set();
    return Array.from(toolIds)
      .map(id => this.getTool(id))
      .filter(tool => tool !== undefined) as ITool[];
  }

  /**
   * Get registry statistics
   */
  public getStatistics(): ToolRegistryStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Update tool registration
   */
  public async updateTool(toolId: string, updates: Partial<ITool>): Promise<void> {
    const registration = this.tools.get(toolId);
    
    if (!registration) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const oldTool = registration.tool;

    // Remove old tool from indexes
    this.removeFromIndexes(oldTool);

    // Create updated tool (in a real implementation, this would merge properties)
    const updatedTool = { ...oldTool, ...updates };

    // Update registration
    registration.tool = updatedTool;

    // Add to indexes with new properties
    this.addToIndexes(updatedTool);

    this.emit('tool-updated', { toolId, oldTool, newTool: updatedTool });
  }

  /**
   * Get tool registration metadata
   */
  public getRegistrationMetadata(toolId: string): Record<string, any> | null {
    const registration = this.tools.get(toolId);
    return registration ? registration.metadata : null;
  }

  /**
   * Update tool registration metadata
   */
  public updateRegistrationMetadata(toolId: string, metadata: Record<string, any>): void {
    const registration = this.tools.get(toolId);
    
    if (!registration) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    registration.metadata = { ...registration.metadata, ...metadata };
    this.emit('registration-metadata-updated', { toolId, metadata });
  }

  /**
   * Get tools registered in a time range
   */
  public getToolsRegisteredInTimeRange(startTime: number, endTime: number): ITool[] {
    return Array.from(this.tools.values())
      .filter(reg => reg.registeredAt >= startTime && reg.registeredAt <= endTime)
      .map(reg => reg.tool);
  }

  /**
   * Get recently used tools
   */
  public getRecentlyUsedTools(limit: number = 10): ITool[] {
    return this.listTools()
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  }

  /**
   * Get most popular tools
   */
  public getMostPopularTools(limit: number = 10): ITool[] {
    return this.listTools()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get tools with errors
   */
  public getErrorTools(): ITool[] {
    return this.listTools().filter(tool => tool.status === ToolStatus.ERROR);
  }

  /**
   * Get deprecated tools
   */
  public getDeprecatedTools(): ITool[] {
    return this.listTools().filter(tool => tool.status === ToolStatus.DEPRECATED);
  }

  /**
   * Clear all tools
   */
  public async clearTools(): Promise<void> {
    const toolIds = Array.from(this.tools.keys());
    
    for (const toolId of toolIds) {
      try {
        await this.unregisterTool(toolId);
      } catch (error) {
        // Continue with other tools
      }
    }

    this.emit('tools-cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): RegistryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<RegistryConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.cleanupInterval !== undefined) {
      this.restartCleanup();
    }
    
    this.emit('config-updated', this.config);
  }

  /**
   * Validate tool
   */
  public validateTool(tool: ITool): ToolValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation
    if (!tool.id || tool.id.trim().length === 0) {
      errors.push({
        parameter: 'id',
        code: 'REQUIRED_FIELD',
        message: 'Tool ID is required',
        severity: 'error'
      });
    }

    if (!tool.schema) {
      errors.push({
        parameter: 'schema',
        code: 'REQUIRED_FIELD',
        message: 'Tool schema is required',
        severity: 'error'
      });
    } else {
      // Validate schema
      const schemaValidation = this.validateSchema(tool.schema);
      errors.push(...schemaValidation.errors);
      warnings.push(...schemaValidation.warnings);
    }

    if (!tool.configuration) {
      if (this.config.strictValidation) {
        errors.push({
          parameter: 'configuration',
          code: 'REQUIRED_FIELD',
          message: 'Tool configuration is required',
          severity: 'error'
        });
      }
    } else {
      // Validate configuration
      const configValidation = this.validateConfiguration(tool.configuration);
      errors.push(...configValidation.errors);
      warnings.push(...configValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Destroy registry
   */
  public async destroy(): Promise<void> {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Unregister all tools
    await this.clearTools();

    // Clear data
    this.tools.clear();
    this.toolsByType.clear();
    this.toolsByCategory.clear();
    this.toolsByTag.clear();
    this.toolsByStatus.clear();
    this.cache.clear();
    this.removeAllListeners();
  }

  // Private methods

  private initializeStatistics(): void {
    this.statistics = {
      totalTools: 0,
      toolsByType: {} as Record<ToolType, number>,
      toolsByCategory: {},
      toolsByStatus: {} as Record<ToolStatus, number>,
      totalExecutions: 0,
      successfulExecutions: 0,
      averageExecutionTime: 0,
      lastUpdated: Date.now()
    };
  }

  private initializeIndexes(): void {
    // Initialize type indexes
    for (const type of Object.values(ToolType)) {
      this.toolsByType.set(type, new Set());
    }

    // Initialize status indexes
    for (const status of Object.values(ToolStatus)) {
      this.toolsByStatus.set(status, new Set());
    }
  }

  private addToIndexes(tool: ITool): void {
    // Add to type index
    if (!this.toolsByType.has(tool.schema.type)) {
      this.toolsByType.set(tool.schema.type, new Set());
    }
    this.toolsByType.get(tool.schema.type)!.add(tool.id);

    // Add to category index
    if (!this.toolsByCategory.has(tool.schema.category)) {
      this.toolsByCategory.set(tool.schema.category, new Set());
    }
    this.toolsByCategory.get(tool.schema.category)!.add(tool.id);

    // Add to tag indexes
    for (const tag of tool.schema.tags) {
      if (!this.toolsByTag.has(tag)) {
        this.toolsByTag.set(tag, new Set());
      }
      this.toolsByTag.get(tag)!.add(tool.id);
    }

    // Add to status index
    if (!this.toolsByStatus.has(tool.status)) {
      this.toolsByStatus.set(tool.status, new Set());
    }
    this.toolsByStatus.get(tool.status)!.add(tool.id);
  }

  private removeFromIndexes(tool: ITool): void {
    // Remove from type index
    this.toolsByType.get(tool.schema.type)?.delete(tool.id);

    // Remove from category index
    this.toolsByCategory.get(tool.schema.category)?.delete(tool.id);

    // Remove from tag indexes
    for (const tag of tool.schema.tags) {
      this.toolsByTag.get(tag)?.delete(tool.id);
    }

    // Remove from status index
    this.toolsByStatus.get(tool.status)?.delete(tool.id);
  }

  private applySearchFilters(tools: ITool[], criteria: ToolSearchCriteria): ITool[] {
    return tools.filter(tool => {
      if (criteria.type && tool.schema.type !== criteria.type) {
        return false;
      }

      if (criteria.category && tool.schema.category !== criteria.category) {
        return false;
      }

      if (criteria.tags && criteria.tags.length > 0) {
        const hasAllTags = criteria.tags.every(tag =>
          tool.schema.tags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }

      if (criteria.author && tool.schema.author !== criteria.author) {
        return false;
      }

      if (criteria.status && tool.status !== criteria.status) {
        return false;
      }

      if (criteria.minVersion && this.compareVersions(tool.schema.version, criteria.minVersion) < 0) {
        return false;
      }

      if (criteria.maxVersion && this.compareVersions(tool.schema.version, criteria.maxVersion) > 0) {
        return false;
      }

      return true;
    });
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  private updateStatistics(): void {
    const tools = this.listTools();
    
    // Reset statistics
    this.statistics.totalTools = tools.length;
    this.statistics.toolsByType = {} as Record<ToolType, number>;
    this.statistics.toolsByCategory = {};
    this.statistics.toolsByStatus = {} as Record<ToolStatus, number>;

    // Count by type
    for (const tool of tools) {
      this.statistics.toolsByType[tool.schema.type] = 
        (this.statistics.toolsByType[tool.schema.type] || 0) + 1;
      
      this.statistics.toolsByCategory[tool.schema.category] = 
        (this.statistics.toolsByCategory[tool.schema.category] || 0) + 1;
      
      this.statistics.toolsByStatus[tool.status] = 
        (this.statistics.toolsByStatus[tool.status] || 0) + 1;
      
      this.statistics.totalExecutions += tool.usageCount;
      this.statistics.successfulExecutions += tool.getUsageStatistics().successfulExecutions;
    }

    // Calculate average execution time
    const totalExecutionTime = tools.reduce((sum, tool) => 
      sum + tool.getUsageStatistics().averageExecutionTime * tool.usageCount, 0
    );
    
    if (this.statistics.totalExecutions > 0) {
      this.statistics.averageExecutionTime = totalExecutionTime / this.statistics.totalExecutions;
    }

    this.statistics.lastUpdated = Date.now();
  }

  private validateSchema(schema: ToolSchema): ToolValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!schema.name || schema.name.trim().length === 0) {
      errors.push({
        parameter: 'name',
        code: 'REQUIRED_FIELD',
        message: 'Schema name is required',
        severity: 'error'
      });
    }

    if (!schema.version || schema.version.trim().length === 0) {
      errors.push({
        parameter: 'version',
        code: 'REQUIRED_FIELD',
        message: 'Schema version is required',
        severity: 'error'
      });
    }

    if (!schema.description || schema.description.trim().length === 0) {
      errors.push({
        parameter: 'description',
        code: 'REQUIRED_FIELD',
        message: 'Schema description is required',
        severity: 'error'
      });
    }

    if (!schema.type || !Object.values(ToolType).includes(schema.type)) {
      errors.push({
        parameter: 'type',
        code: 'INVALID_TYPE',
        message: 'Schema type is invalid',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateConfiguration(config: ToolConfiguration): ToolValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (config.timeout <= 0) {
      errors.push({
        parameter: 'timeout',
        code: 'INVALID_VALUE',
        message: 'Timeout must be positive',
        severity: 'error'
      });
    }

    if (config.retryAttempts < 0) {
      errors.push({
        parameter: 'retryAttempts',
        code: 'INVALID_VALUE',
        message: 'Retry attempts cannot be negative',
        severity: 'error'
      });
    }

    if (config.retryDelay < 0) {
      errors.push({
        parameter: 'retryDelay',
        code: 'INVALID_VALUE',
        message: 'Retry delay cannot be negative',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  private restartCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.startCleanup();
  }

  private performCleanup(): void {
    // Clean up expired cache entries
    if (this.config.enableCaching) {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.config.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }

    // Remove error tools that have been in error state for too long
    const errorTools = this.getErrorTools();
    const errorThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const tool of errorTools) {
      const stats = tool.getUsageStatistics();
      if (stats.lastErrorTime && (Date.now() - stats.lastErrorTime) > errorThreshold) {
        this.emit('tool-cleanup-candidate', { tool, reason: 'long-term-error' });
      }
    }

    this.emit('cleanup-completed');
  }
}

/**
 * Default tool registry instance
 */
export const defaultToolRegistry = new MCPToolRegistry();