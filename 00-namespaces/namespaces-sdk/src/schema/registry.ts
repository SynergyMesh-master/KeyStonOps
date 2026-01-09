/**
 * Schema Registry and Versioning
 * 
 * Manages registration, lookup, and versioning of all schemas used in the SDK.
 */

import {
  JSONSchema,
  VersionedSchema,
  SchemaMetadata,
  SchemaRegistryEntry,
  CompatibilityResult,
  BreakingChange,
  SchemaUtils
} from './types';

/**
 * Schema Registry class
 */
export class SchemaRegistry {
  private schemas: Map<string, SchemaRegistryEntry>;
  private schemasByHash: Map<string, string>; // hash -> id mapping

  constructor() {
    this.schemas = new Map();
    this.schemasByHash = new Map();
  }

  /**
   * Register a schema
   */
  register(versionedSchema: VersionedSchema): void {
    const { metadata, schema } = versionedSchema;
    const { id, version } = metadata;

    // Get or create registry entry
    let entry = this.schemas.get(id);
    if (!entry) {
      entry = {
        id,
        versions: new Map(),
        latestVersion: version
      };
      this.schemas.set(id, entry);
    }

    // Check if version already exists
    if (entry.versions.has(version)) {
      throw new Error(`Schema ${id} version ${version} already registered`);
    }

    // Add version
    entry.versions.set(version, versionedSchema);

    // Update latest version if newer
    if (this.compareVersions(version, entry.latestVersion) > 0) {
      entry.latestVersion = version;
    }

    // Add hash mapping
    const hash = SchemaUtils.hash(schema);
    this.schemasByHash.set(hash, id);
  }

  /**
   * Get a schema by ID and version
   */
  get(id: string, version?: string): VersionedSchema | undefined {
    const entry = this.schemas.get(id);
    if (!entry) {
      return undefined;
    }

    const targetVersion = version || entry.latestVersion;
    return entry.versions.get(targetVersion);
  }

  /**
   * Get latest schema version
   */
  getLatest(id: string): VersionedSchema | undefined {
    const entry = this.schemas.get(id);
    if (!entry) {
      return undefined;
    }

    return entry.versions.get(entry.latestVersion);
  }

  /**
   * Get all versions of a schema
   */
  getVersions(id: string): string[] {
    const entry = this.schemas.get(id);
    if (!entry) {
      return [];
    }

    return Array.from(entry.versions.keys()).sort(this.compareVersions);
  }

  /**
   * Check if schema exists
   */
  has(id: string, version?: string): boolean {
    const entry = this.schemas.get(id);
    if (!entry) {
      return false;
    }

    if (!version) {
      return true;
    }

    return entry.versions.has(version);
  }

  /**
   * List all schema IDs
   */
  list(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Find schema by hash
   */
  findByHash(hash: string): VersionedSchema | undefined {
    const id = this.schemasByHash.get(hash);
    if (!id) {
      return undefined;
    }

    return this.getLatest(id);
  }

  /**
   * Check compatibility between two schema versions
   */
  checkCompatibility(
    id: string,
    oldVersion: string,
    newVersion: string
  ): CompatibilityResult {
    const oldSchema = this.get(id, oldVersion);
    const newSchema = this.get(id, newVersion);

    if (!oldSchema || !newSchema) {
      return {
        compatible: false,
        breakingChanges: [{
          type: 'other',
          path: '',
          description: 'One or both schema versions not found'
        }]
      };
    }

    return this.compareSchemas(oldSchema.schema, newSchema.schema);
  }

  /**
   * Compare two schemas for compatibility
   */
  private compareSchemas(
    oldSchema: JSONSchema,
    newSchema: JSONSchema,
    path: string = ''
  ): CompatibilityResult {
    const breakingChanges: BreakingChange[] = [];
    const warnings: string[] = [];

    // Check type changes
    if (oldSchema.type !== newSchema.type) {
      breakingChanges.push({
        type: 'changed_type',
        path,
        description: `Type changed from ${oldSchema.type} to ${newSchema.type}`,
        oldValue: oldSchema.type,
        newValue: newSchema.type
      });
    }

    // Check required fields (object schemas)
    if (oldSchema.type === 'object' && newSchema.type === 'object') {
      const oldRequired = new Set(oldSchema.required || []);
      const newRequired = new Set(newSchema.required || []);

      // New required fields are breaking
      for (const field of newRequired) {
        if (!oldRequired.has(field)) {
          breakingChanges.push({
            type: 'added_required',
            path: path ? `${path}.${field}` : field,
            description: `New required field: ${field}`
          });
        }
      }

      // Removed fields are breaking
      const oldProps = new Set(Object.keys(oldSchema.properties || {}));
      const newProps = new Set(Object.keys(newSchema.properties || {}));

      for (const field of oldProps) {
        if (!newProps.has(field)) {
          breakingChanges.push({
            type: 'removed_field',
            path: path ? `${path}.${field}` : field,
            description: `Removed field: ${field}`
          });
        }
      }

      // Check nested properties
      if (oldSchema.properties && newSchema.properties) {
        for (const [key, oldProp] of Object.entries(oldSchema.properties)) {
          const newProp = newSchema.properties[key];
          if (newProp) {
            const propPath = path ? `${path}.${key}` : key;
            const result = this.compareSchemas(oldProp, newProp, propPath);
            breakingChanges.push(...result.breakingChanges || []);
            warnings.push(...result.warnings || []);
          }
        }
      }
    }

    // Check enum values
    if (oldSchema.enum && newSchema.enum) {
      const oldEnums = new Set(oldSchema.enum);
      const newEnums = new Set(newSchema.enum);

      for (const value of oldEnums) {
        if (!newEnums.has(value)) {
          breakingChanges.push({
            type: 'removed_enum_value',
            path,
            description: `Removed enum value: ${value}`,
            oldValue: value
          });
        }
      }
    }

    // Check constraints (warnings for relaxed constraints)
    if (oldSchema.minLength !== undefined && newSchema.minLength !== undefined) {
      if (newSchema.minLength > oldSchema.minLength) {
        warnings.push(`Stricter minLength at ${path}: ${oldSchema.minLength} -> ${newSchema.minLength}`);
      }
    }

    if (oldSchema.maxLength !== undefined && newSchema.maxLength !== undefined) {
      if (newSchema.maxLength < oldSchema.maxLength) {
        warnings.push(`Stricter maxLength at ${path}: ${oldSchema.maxLength} -> ${newSchema.maxLength}`);
      }
    }

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges: breakingChanges.length > 0 ? breakingChanges : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Compare version strings (semver)
   */
  private compareVersions(v1: string, v2: string): number {
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

  /**
   * Get deprecated schemas
   */
  getDeprecated(): VersionedSchema[] {
    const deprecated: VersionedSchema[] = [];

    for (const entry of this.schemas.values()) {
      for (const schema of entry.versions.values()) {
        if (schema.deprecated) {
          deprecated.push(schema);
        }
      }
    }

    return deprecated;
  }

  /**
   * Mark schema as deprecated
   */
  deprecate(id: string, version: string, message?: string, replacedBy?: string): void {
    const schema = this.get(id, version);
    if (!schema) {
      throw new Error(`Schema ${id} version ${version} not found`);
    }

    schema.deprecated = true;
    schema.deprecationMessage = message;
    schema.replacedBy = replacedBy;
  }

  /**
   * Export registry to JSON
   */
  toJSON(): any {
    const result: any = {};

    for (const [id, entry] of this.schemas.entries()) {
      result[id] = {
        latestVersion: entry.latestVersion,
        versions: Array.from(entry.versions.entries()).map(([version, schema]) => ({
          version,
          metadata: schema.metadata,
          deprecated: schema.deprecated,
          deprecationMessage: schema.deprecationMessage,
          replacedBy: schema.replacedBy
        }))
      };
    }

    return result;
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.schemas.clear();
    this.schemasByHash.clear();
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.schemas.size;
  }

  /**
   * Get total version count
   */
  versionCount(): number {
    let count = 0;
    for (const entry of this.schemas.values()) {
      count += entry.versions.size;
    }
    return count;
  }
}