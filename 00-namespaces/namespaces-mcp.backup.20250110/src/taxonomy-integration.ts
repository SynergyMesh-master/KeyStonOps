/**
 * Taxonomy Integration for Namespaces MCP
 * 
 * Integrates the Taxonomy system with MCP components for consistent naming
 */

import { Taxonomy, TaxonomyMapper, UnifiedNamingLogic, TaxonomyValidator } from '@machine-native-ops/taxonomy-core';
import type { Entity, ResolvedName, ValidationResult } from '@machine-native-ops/taxonomy-core';

/**
 * MCP Taxonomy Manager
 */
export class MCPTaxonomyManager {
  private static instance: MCPTaxonomyManager;
  private taxonomy: Taxonomy;

  private constructor() {
    this.taxonomy = Taxonomy.getInstance({
      version: '1.0.0',
      customRules: [
        {
          id: 'mcp-protocol-prefix',
          pattern: /^(platform|int|obs|gov)-.*-protocol-v\d+/,
          message: 'MCP protocols must follow pattern: {domain}-{name}-protocol-{version}',
          severity: 'error'
        }
      ]
    });

    // Register MCP itself
    this.taxonomy.register({
      domain: 'platform',
      name: 'namespaces',
      type: 'mcp',
      version: 'v1'
    }, {
      description: 'Model Context Protocol Implementation',
      tags: ['mcp', 'platform', 'protocol']
    });
  }

  public static getInstance(): MCPTaxonomyManager {
    if (!MCPTaxonomyManager.instance) {
      MCPTaxonomyManager.instance = new MCPTaxonomyManager();
    }
    return MCPTaxonomyManager.instance;
  }

  /**
   * Generate protocol names using taxonomy
   */
  public generateProtocolNames(protocolName: string, version?: string): ResolvedName {
    const entity: Entity = {
      domain: 'platform',
      name: protocolName,
      type: 'protocol',
      version: version || 'v1'
    };

    return UnifiedNamingLogic.resolve(entity);
  }

  /**
   * Validate protocol name
   */
  public validateProtocolName(name: string): ValidationResult {
    return TaxonomyValidator.validate(name);
  }

  /**
   * Register protocol in taxonomy
   */
  public registerProtocol(protocolName: string, metadata?: any): void {
    const entity: Entity = {
      domain: 'platform',
      name: protocolName,
      type: 'protocol',
      version: metadata?.version || 'v1'
    };

    this.taxonomy.register(entity, {
      description: metadata?.description,
      tags: metadata?.tags || ['protocol']
    });
  }

  /**
   * Get all registered protocols
   */
  public getRegisteredProtocols(): any[] {
    return this.taxonomy.list({ type: 'protocol' });
  }

  /**
   * Search protocols by pattern
   */
  public searchProtocols(pattern: string | RegExp): any[] {
    return this.taxonomy.search(pattern);
  }

  /**
   * Generate server names
   */
  public generateServerNames(serverName: string, version?: string): ResolvedName {
    const entity: Entity = {
      domain: 'platform',
      name: serverName,
      type: 'server',
      version: version || 'v1'
    };

    return UnifiedNamingLogic.resolve(entity);
  }

  /**
   * Generate client names
   */
  public generateClientNames(clientName: string): ResolvedName {
    const entity: Entity = {
      domain: 'platform',
      name: clientName,
      type: 'client',
      version: 'v1'
    };

    return UnifiedNamingLogic.resolve(entity);
  }

  /**
   * Generate tool names for MCP
   */
  public generateToolNames(toolName: string, version?: string): ResolvedName {
    const entity: Entity = {
      domain: 'platform',
      name: toolName,
      type: 'tool',
      version: version || 'v1'
    };

    return UnifiedNamingLogic.resolve(entity);
  }

  /**
   * Validate and fix name
   */
  public validateAndFix(name: string): { fixed: string; changes: string[] } {
    return TaxonomyValidator.validateAndFix(name);
  }

  /**
   * Export taxonomy registry
   */
  public exportRegistry(): string {
    return this.taxonomy.export();
  }

  /**
   * Import taxonomy registry
   */
  public importRegistry(json: string): void {
    this.taxonomy.import(json);
  }
}

/**
 * Helper function to get taxonomy-compliant names for MCP components
 */
export function getMCPComponentNames(componentName: string, componentType: string): ResolvedName {
  const entity: Entity = {
    domain: 'platform',
    name: componentName,
    type: componentType,
    version: 'v1'
  };

  return UnifiedNamingLogic.resolve(entity);
}

/**
 * Validate MCP component name
 */
export function validateMCPComponentName(name: string): ValidationResult {
  return TaxonomyValidator.validate(name);
}

/**
 * Export taxonomy integration
 */
export { Taxonomy, TaxonomyMapper, UnifiedNamingLogic, TaxonomyValidator };
export type { Entity, ResolvedName, ValidationResult };