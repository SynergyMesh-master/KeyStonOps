/**
 * MCP Metadata Management
 * 
 * Comprehensive metadata management for MCP services with versioning,
 * schema validation, and dynamic updates.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { ServiceRegistration } from './registry-core';

/**
 * Metadata Schema Version
 */
export interface MetadataSchemaVersion {
  version: string;
  schema: any;
  migrations: MetadataMigration[];
  deprecatedFields: string[];
  requiredFields: string[];
}

/**
 * Metadata Migration
 */
export interface MetadataMigration {
  fromVersion: string;
  toVersion: string;
  migrationFunction: (metadata: any) => any;
  description: string;
  breaking: boolean;
}

/**
 * Metadata Validation Result
 */
export interface MetadataValidationResult {
  isValid: boolean;
  errors: MetadataValidationError[];
  warnings: MetadataValidationWarning[];
  metadata: any;
}

/**
 * Metadata Validation Error
 */
export interface MetadataValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'critical';
}

/**
 * Metadata Validation Warning
 */
export interface MetadataValidationWarning {
  field: string;
  code: string;
  message: string;
}

/**
 * Metadata Template
 */
export interface MetadataTemplate {
  name: string;
  version: string;
  description: string;
  schema: any;
  defaults: Record<string, any>;
  validation: Record<string, any>;
  examples: Record<string, any>;
}

/**
 * Metadata Configuration
 */
export interface MetadataConfig {
  enableValidation: boolean;
  enableVersioning: boolean;
  enableMigration: boolean;
  defaultSchemaVersion: string;
  strictValidation: boolean;
  allowCustomFields: boolean;
  maxMetadataSize: number;
  enableCaching: boolean;
  cacheTimeout: number;
}

/**
 * MCP Metadata Manager
 */
export class MCPMetadataManager extends EventEmitter {
  private config: MetadataConfig;
  private schemas: Map<string, MetadataSchemaVersion> = new Map();
  private templates: Map<string, MetadataTemplate> = new Map();
  private cache: Map<string, any> = new Map();
  private validationRules: Map<string, Function> = new Map();

  constructor(config?: Partial<MetadataConfig>) {
    super();
    
    this.config = {
      enableValidation: true,
      enableVersioning: true,
      enableMigration: true,
      defaultSchemaVersion: '1.0.0',
      strictValidation: false,
      allowCustomFields: true,
      maxMetadataSize: 1024 * 1024, // 1MB
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      ...config
    };

    this.initializeSchemas();
    this.initializeTemplates();
    this.initializeValidationRules();
  }

  /**
   * Validate metadata
   */
  public validateMetadata(metadata: any, schemaVersion?: string): MetadataValidationResult {
    const version = schemaVersion || this.config.defaultSchemaVersion;
    const errors: MetadataValidationError[] = [];
    const warnings: MetadataValidationWarning[] = [];

    try {
      // Check metadata size
      const metadataSize = JSON.stringify(metadata).length;
      if (metadataSize > this.config.maxMetadataSize) {
        errors.push({
          field: 'root',
          code: 'METADATA_TOO_LARGE',
          message: `Metadata size exceeds maximum allowed size`,
          severity: 'error'
        });
      }

      // Basic structure validation
      if (!metadata || typeof metadata !== 'object') {
        errors.push({
          field: 'root',
          code: 'INVALID_METADATA_TYPE',
          message: 'Metadata must be an object',
          severity: 'critical'
        });
        return {
          isValid: false,
          errors,
          warnings,
          metadata
        };
      }

      // Schema validation
      if (this.config.enableValidation) {
        this.performSchemaValidation(metadata, version, errors, warnings);
      }

      // Custom validation rules
      this.performCustomValidation(metadata, errors, warnings);

      // Field validation
      this.performFieldValidation(metadata, errors, warnings);

    } catch (error) {
      errors.push({
        field: 'root',
        code: 'VALIDATION_EXCEPTION',
        message: `Validation exception: ${error.message}`,
        severity: 'critical'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  /**
   * Migrate metadata to new version
   */
  public migrateMetadata(metadata: any, fromVersion: string, toVersion: string): any {
    if (!this.config.enableMigration) {
      throw new Error('Migration is disabled');
    }

    let currentMetadata = { ...metadata };
    let currentVersion = fromVersion;

    // Find migration path
    const migrationPath = this.findMigrationPath(currentVersion, toVersion);
    
    if (!migrationPath) {
      throw new Error(`No migration path found from ${fromVersion} to ${toVersion}`);
    }

    // Apply migrations
    for (const migration of migrationPath) {
      try {
        currentMetadata = migration.migrationFunction(currentMetadata);
        currentVersion = migration.toVersion;
        
        this.emit('metadata-migrated', {
          fromVersion: migration.fromVersion,
          toVersion: migration.toVersion,
          metadata: currentMetadata
        });
      } catch (error) {
        throw new Error(`Migration failed from ${migration.fromVersion} to ${migration.toVersion}: ${error.message}`);
      }
    }

    return currentMetadata;
  }

  /**
   * Create metadata from template
   */
  public createFromTemplate(
    templateName: string,
    overrides: Record<string, any> = {}
  ): any {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Start with template defaults
    let metadata = { ...template.defaults };

    // Apply version information
    metadata.templateVersion = template.version;
    metadata.templateName = template.name;

    // Apply overrides
    metadata = { ...metadata, ...overrides };

    // Validate the created metadata
    const validation = this.validateMetadata(metadata, template.version);
    
    if (!validation.isValid) {
      throw new Error(`Created metadata is invalid: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return metadata;
  }

  /**
   * Register metadata schema
   */
  public registerSchema(schema: MetadataSchemaVersion): void {
    this.schemas.set(schema.version, schema);
    this.emit('schema-registered', { version: schema.version });
  }

  /**
   * Register metadata template
   */
  public registerTemplate(template: MetadataTemplate): void {
    this.templates.set(template.name, template);
    this.emit('template-registered', { name: template.name });
  }

  /**
   * Register validation rule
   */
  public registerValidationRule(name: string, rule: Function): void {
    this.validationRules.set(name, rule);
    this.emit('validation-rule-registered', { name });
  }

  /**
   * Get available schemas
   */
  public getAvailableSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get schema by version
   */
  public getSchema(version: string): MetadataSchemaVersion | null {
    return this.schemas.get(version) || null;
  }

  /**
   * Get template by name
   */
  public getTemplate(name: string): MetadataTemplate | null {
    return this.templates.get(name) || null;
  }

  /**
   * Merge metadata objects
   */
  public mergeMetadata(base: any, ...updates: any[]): any {
    let result = { ...base };

    for (const update of updates) {
      result = this.deepMerge(result, update);
    }

    return result;
  }

  /**
   * Extract specific fields from metadata
   */
  public extractFields(metadata: any, fields: string[]): any {
    const result: any = {};

    for (const field of fields) {
      if (field in metadata) {
        result[field] = metadata[field];
      }
    }

    return result;
  }

  /**
   * Remove fields from metadata
   */
  public removeFields(metadata: any, fields: string[]): any {
    const result = { ...metadata };

    for (const field of fields) {
      delete result[field];
    }

    return result;
  }

  /**
   * Sanitize metadata
   */
  public sanitizeMetadata(metadata: any): any {
    const result = { ...metadata };

    // Remove potentially dangerous fields
    const dangerousFields = ['__proto__', 'constructor', 'prototype'];
    for (const field of dangerousFields) {
      delete result[field];
    }

    // Sanitize string fields
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string') {
        result[key] = this.sanitizeString(value);
      }
    }

    return result;
  }

  /**
   * Get metadata diff
   */
  public getMetadataDiff(oldMetadata: any, newMetadata: any): {
    added: Record<string, any>;
    removed: Record<string, any>;
    modified: Record<string, { old: any; new: any }>;
  } {
    const added: Record<string, any> = {};
    const removed: Record<string, any> = {};
    const modified: Record<string, { old: any; new: any }> = {};

    const allKeys = new Set([
      ...Object.keys(oldMetadata),
      ...Object.keys(newMetadata)
    ]);

    for (const key of allKeys) {
      const oldValue = oldMetadata[key];
      const newValue = newMetadata[key];

      if (!(key in oldMetadata)) {
        added[key] = newValue;
      } else if (!(key in newMetadata)) {
        removed[key] = oldValue;
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        modified[key] = { old: oldValue, new: newValue };
      }
    }

    return { added, removed, modified };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): MetadataConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<MetadataConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config-updated', this.config);
  }

  /**
   * Destroy metadata manager
   */
  public destroy(): void {
    this.schemas.clear();
    this.templates.clear();
    this.cache.clear();
    this.validationRules.clear();
    this.removeAllListeners();
  }

  // Private methods

  private initializeSchemas(): void {
    // Register default schemas
    this.registerSchema({
      version: '1.0.0',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          description: { type: 'string', maxLength: 500 },
          author: { type: 'string', maxLength: 100 },
          tags: { type: 'array', items: { type: 'string' } },
          category: { type: 'string' },
          license: { type: 'string' }
        },
        required: ['name', 'version', 'description', 'author']
      },
      migrations: [],
      deprecatedFields: [],
      requiredFields: ['name', 'version', 'description', 'author']
    });
  }

  private initializeTemplates(): void {
    // Register common templates
    this.registerTemplate({
      name: 'basic-service',
      version: '1.0.0',
      description: 'Basic service metadata template',
      schema: {},
      defaults: {
        name: '',
        version: '1.0.0',
        description: '',
        author: '',
        tags: [],
        category: 'general',
        license: 'MIT',
        keywords: [],
        dependencies: [],
        capabilities: [],
        limitations: []
      },
      validation: {},
      examples: {
        'web-service': {
          name: 'example-web-service',
          version: '1.0.0',
          description: 'An example web service',
          author: 'Example Team',
          tags: ['web', 'api', 'service'],
          category: 'web'
        }
      }
    });
  }

  private initializeValidationRules(): void {
    // Register common validation rules
    this.registerValidationRule('version-format', (value: string) => {
      return /^\d+\.\d+\.\d+$/.test(value);
    });

    this.registerValidationRule('name-format', (value: string) => {
      return /^[a-z][a-z0-9-]*$/.test(value);
    });

    this.registerValidationRule('tags-format', (value: string[]) => {
      return Array.isArray(value) && value.every(tag => /^[a-z][a-z0-9-]*$/.test(tag));
    });
  }

  private performSchemaValidation(
    metadata: any,
    version: string,
    errors: MetadataValidationError[],
    warnings: MetadataValidationWarning[]
  ): void {
    const schema = this.schemas.get(version);
    
    if (!schema) {
      errors.push({
        field: 'root',
        code: 'SCHEMA_NOT_FOUND',
        message: `Schema version ${version} not found`,
        severity: 'error'
      });
      return;
    }

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!(field in metadata)) {
        errors.push({
          field,
          code: 'REQUIRED_FIELD_MISSING',
          message: `Required field '${field}' is missing`,
          severity: 'error'
        });
      }
    }

    // Check deprecated fields
    for (const field of schema.deprecatedFields) {
      if (field in metadata) {
        warnings.push({
          field,
          code: 'DEPRECATED_FIELD',
          message: `Field '${field}' is deprecated`
        });
      }
    }
  }

  private performCustomValidation(
    metadata: any,
    errors: MetadataValidationError[],
    warnings: MetadataValidationWarning[]
  ): void {
    for (const [name, rule] of this.validationRules) {
      try {
        if (typeof rule === 'function') {
          // Apply rule to appropriate fields
          for (const [field, value] of Object.entries(metadata)) {
            if (this.shouldApplyRule(field, name, value)) {
              if (!rule(value)) {
                errors.push({
                  field,
                  code: `CUSTOM_VALIDATION_FAILED_${name.toUpperCase()}`,
                  message: `Custom validation rule '${name}' failed for field '${field}'`,
                  severity: 'error'
                });
              }
            }
          }
        }
      } catch (error) {
        warnings.push({
          field: 'root',
          code: 'CUSTOM_VALIDATION_ERROR',
          message: `Custom validation rule '${name}' failed: ${error.message}`
        });
      }
    }
  }

  private performFieldValidation(
    metadata: any,
    errors: MetadataValidationError[],
    warnings: MetadataValidationWarning[]
  ): void {
    for (const [field, value] of Object.entries(metadata)) {
      // Validate field names
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(field)) {
        errors.push({
          field,
          code: 'INVALID_FIELD_NAME',
          message: `Field name '${field}' contains invalid characters`,
          severity: 'error'
        });
      }

      // Validate field values
      if (value === null || value === undefined) {
        if (this.config.strictValidation) {
          errors.push({
            field,
            code: 'NULL_OR_UNDEFINED_VALUE',
            message: `Field '${field}' has null or undefined value`,
            severity: 'error'
          });
        }
      }
    }
  }

  private shouldApplyRule(field: string, ruleName: string, value: any): boolean {
    // Determine if a validation rule should be applied to a field
    switch (ruleName) {
      case 'version-format':
        return field === 'version';
      case 'name-format':
        return field === 'name';
      case 'tags-format':
        return field === 'tags';
      default:
        return false;
    }
  }

  private findMigrationPath(fromVersion: string, toVersion: string): MetadataMigration[] {
    const path: MetadataMigration[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const schema = this.schemas.get(currentVersion);
      
      if (!schema) {
        return null;
      }

      // Find next migration
      const nextMigration = schema.migrations.find(m => 
        m.fromVersion === currentVersion
      );

      if (!nextMigration) {
        return null;
      }

      path.push(nextMigration);
      currentVersion = nextMigration.toVersion;
    }

    return path;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private sanitizeString(str: string): string {
    // Remove potentially dangerous characters
    return str
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control characters
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script tags
      .replace(/javascript:/gi, '') // JavaScript protocol
      .trim();
  }
}

/**
 * Default metadata manager instance
 */
export const defaultMetadataManager = new MCPMetadataManager();