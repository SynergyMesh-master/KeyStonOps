/**
 * Taxonomy Integration for Namespaces SDK
 * 
 * Integrates the Taxonomy system with SDK components for consistent naming
 */

import { Taxonomy, TaxonomyMapper, UnifiedNamingLogic, TaxonomyValidator } from '@machine-native-ops/taxonomy-core';
import type { Entity, ResolvedName, ValidationResult } from '@machine-native-ops/taxonomy-core';

/**
 * SDK Taxonomy Manager
 */
export class SDKTaxonomyManager {
  private static instance: SDKTaxonomyManager;
  private taxonomy: Taxonomy;

  private constructor() {
    this.taxonomy = Taxonomy.getInstance({
      version: '1.0.0',
      customRules: [
        {
          id: 'sdk-tool-prefix',
          pattern: /^(platform|int|obs|gov)-.*-tool-v\d+/,
          message: 'SDK tools must follow pattern: {domain}-{name}-tool-{version}',
          severity: 'error'
        }
      ]
    });

    // Register SDK itself
    this.taxonomy.register({
      domain: 'platform',
      name: 'namespaces',
      type: 'sdk',
      version: 'v1'
    }, {
      description: 'Machine-Native Platform Integration SDK',
      tags: ['sdk', 'platform', 'mcp']
    });
  }

  public static getInstance(): SDKTaxonomyManager {
    if (!SDKTaxonomyManager.instance) {
      SDKTaxonomyManager.instance = new SDKTaxonomyManager();
    }
    return SDKTaxonomyManager.instance;
  }

  /**
   * Generate tool names using taxonomy
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
   * Validate tool name
   */
  public validateToolName(name: string): ValidationResult {
    return TaxonomyValidator.validate(name);
  }

  /**
   * Register tool in taxonomy
   */
  public registerTool(toolName: string, metadata?: any): void {
    const entity: Entity = {
      domain: 'platform',
      name: toolName,
      type: 'tool',
      version: metadata?.version || 'v1'
    };

    this.taxonomy.register(entity, {
      description: metadata?.description,
      tags: metadata?.tags || ['tool']
    });
  }

  /**
   * Get all registered tools
   */
  public getRegisteredTools(): any[] {
    return this.taxonomy.list({ type: 'tool' });
  }

  /**
   * Search tools by pattern
   */
  public searchTools(pattern: string | RegExp): any[] {
    return this.taxonomy.search(pattern);
  }

  /**
   * Generate adapter names
   */
  public generateAdapterNames(serviceName: string, version?: string): ResolvedName {
    const entity: Entity = {
      domain: 'int',
      name: serviceName,
      type: 'adapter',
      version: version || 'v1'
    };

    return UnifiedNamingLogic.resolve(entity);
  }

  /**
   * Generate credential provider names
   */
  public generateProviderNames(providerName: string): ResolvedName {
    const entity: Entity = {
      domain: 'platform',
      name: providerName,
      type: 'provider',
      version: 'v1'
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
 * Helper function to get taxonomy-compliant names for SDK components
 */
export function getSDKComponentNames(componentName: string, componentType: string): ResolvedName {
  const entity: Entity = {
    domain: 'platform',
    name: componentName,
    type: componentType,
    version: 'v1'
  };

  return UnifiedNamingLogic.resolve(entity);
}

/**
 * Validate SDK component name
 */
export function validateSDKComponentName(name: string): ValidationResult {
  return TaxonomyValidator.validate(name);
}

/**
 * Export taxonomy integration
 */
export { Taxonomy, TaxonomyMapper, UnifiedNamingLogic, TaxonomyValidator };
export type { Entity, ResolvedName, ValidationResult };