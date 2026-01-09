/**
 * Core Taxonomy class - Central taxonomy management
 */

import {
  Entity,
  TaxonomyPath,
  TaxonomyConfig,
  TaxonomyDomain,
  EntityType,
  TaxonomyEntry,
  TaxonomyMetadata
} from './types';

export class Taxonomy {
  private static instance: Taxonomy;
  private config: TaxonomyConfig;
  private registry: Map<string, TaxonomyEntry> = new Map();

  private constructor(config?: Partial<TaxonomyConfig>) {
    this.config = this.initializeConfig(config);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<TaxonomyConfig>): Taxonomy {
    if (!Taxonomy.instance) {
      Taxonomy.instance = new Taxonomy(config);
    }
    return Taxonomy.instance;
  }

  /**
   * Initialize taxonomy configuration
   */
  private initializeConfig(config?: Partial<TaxonomyConfig>): TaxonomyConfig {
    return {
      version: '1.0.0',
      domains: Object.values(TaxonomyDomain),
      entityTypes: Object.values(EntityType),
      validationRules: [],
      namingPatterns: {
        entity: '{domain}-{name}-{type}[-{version}][-{modifier}]',
        resource: '{environment}/{namespace}/{type}/{name}',
        component: '{project}.{layer}.{component}[.{subcomponent}]'
      },
      ...config
    };
  }

  /**
   * Map entity to taxonomy path
   */
  public static map(entity: Entity | string): TaxonomyPath {
    const instance = Taxonomy.getInstance();
    
    // If string input, parse it
    if (typeof entity === 'string') {
      entity = instance.parseEntityString(entity);
    }

    return instance.mapEntity(entity);
  }

  /**
   * Parse entity string into Entity object
   */
  private parseEntityString(input: string): Entity {
    const parts = input.split('-');
    
    if (parts.length < 3) {
      throw new Error(`Invalid entity string: ${input}. Expected format: {domain}-{name}-{type}[-{version}][-{modifier}]`);
    }

    return {
      domain: parts[0],
      name: parts[1],
      type: parts[2],
      version: parts[3],
      modifier: parts[4]
    };
  }

  /**
   * Map entity to taxonomy path
   */
  private mapEntity(entity: Entity): TaxonomyPath {
    const domain = entity.domain;
    const category = this.categorize(entity);
    const hierarchy = this.buildHierarchy(entity);
    const reference = this.generateReference(entity);
    const canonical = this.toCanonical(entity);

    return {
      domain,
      category,
      hierarchy,
      reference,
      canonical
    };
  }

  /**
   * Categorize entity
   */
  private categorize(entity: Entity): string {
    const domainCategories: Record<string, string> = {
      [TaxonomyDomain.INFRASTRUCTURE]: 'infrastructure',
      [TaxonomyDomain.GOVERNANCE]: 'governance',
      [TaxonomyDomain.OBSERVABILITY]: 'observability',
      [TaxonomyDomain.INTEGRATION]: 'integration',
      [TaxonomyDomain.PLATFORM]: 'platform',
      [TaxonomyDomain.SECURITY]: 'security',
      [TaxonomyDomain.DATA]: 'data'
    };

    return domainCategories[entity.domain] || 'general';
  }

  /**
   * Build hierarchy path
   */
  private buildHierarchy(entity: Entity): string {
    const parts = [
      entity.domain,
      this.categorize(entity),
      entity.type,
      entity.name
    ];

    if (entity.version) {
      parts.push(entity.version);
    }

    return parts.join('/');
  }

  /**
   * Generate reference path
   */
  private generateReference(entity: Entity): string {
    const version = entity.version || 'v1';
    return `ref: taxonomy/${entity.domain}/${entity.type}/${version}`;
  }

  /**
   * Convert to canonical name
   */
  private toCanonical(entity: Entity): string {
    const parts = [entity.domain, entity.name, entity.type];
    
    if (entity.version) {
      parts.push(entity.version);
    }
    
    if (entity.modifier) {
      parts.push(entity.modifier);
    }

    return parts.join('-');
  }

  /**
   * Register entity in taxonomy
   */
  public register(entity: Entity, metadata?: Partial<TaxonomyMetadata>): TaxonomyEntry {
    const path = this.mapEntity(entity);
    const now = new Date();
    
    const entry: TaxonomyEntry = {
      id: path.canonical,
      path,
      entity,
      metadata: {
        created: now,
        updated: now,
        version: this.config.version,
        ...metadata
      }
    };

    this.registry.set(entry.id, entry);
    return entry;
  }

  /**
   * Get entity from registry
   */
  public get(id: string): TaxonomyEntry | undefined {
    return this.registry.get(id);
  }

  /**
   * List all registered entities
   */
  public list(filter?: Partial<Entity>): TaxonomyEntry[] {
    const entries = Array.from(this.registry.values());
    
    if (!filter) {
      return entries;
    }

    return entries.filter(entry => {
      return Object.entries(filter).every(([key, value]) => {
        return entry.entity[key as keyof Entity] === value;
      });
    });
  }

  /**
   * Search entities by pattern
   */
  public search(pattern: string | RegExp): TaxonomyEntry[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    return Array.from(this.registry.values()).filter(entry => {
      return regex.test(entry.id) || 
             regex.test(entry.path.canonical) ||
             regex.test(entry.entity.name);
    });
  }

  /**
   * Get taxonomy configuration
   */
  public getConfig(): TaxonomyConfig {
    return { ...this.config };
  }

  /**
   * Update taxonomy configuration
   */
  public updateConfig(config: Partial<TaxonomyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear registry
   */
  public clear(): void {
    this.registry.clear();
  }

  /**
   * Get registry size
   */
  public size(): number {
    return this.registry.size;
  }

  /**
   * Export registry as JSON
   */
  public export(): string {
    const entries = Array.from(this.registry.values());
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Import registry from JSON
   */
  public import(json: string): void {
    const entries = JSON.parse(json) as TaxonomyEntry[];
    entries.forEach(entry => {
      this.registry.set(entry.id, entry);
    });
  }
}