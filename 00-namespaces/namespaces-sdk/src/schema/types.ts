/**
 * Schema Type System and Definitions
 * 
 * Defines TypeScript types for schemas, tool metadata, and validation results.
 */

/**
 * JSON Schema type
 */
export interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema | JSONSchema[];
  additionalProperties?: boolean | JSONSchema;
  enum?: any[];
  const?: any;
  default?: any;
  examples?: any[];
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  definitions?: Record<string, JSONSchema>;
  $ref?: string;
}

/**
 * Schema validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params?: Record<string, any>;
  schemaPath?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * Schema metadata
 */
export interface SchemaMetadata {
  id: string;
  version: string;
  title?: string;
  description?: string;
  author?: string;
  created?: Date;
  modified?: Date;
  tags?: string[];
}

/**
 * Versioned schema
 */
export interface VersionedSchema {
  metadata: SchemaMetadata;
  schema: JSONSchema;
  deprecated?: boolean;
  deprecationMessage?: string;
  replacedBy?: string;
}

/**
 * Schema compatibility result
 */
export interface CompatibilityResult {
  compatible: boolean;
  breakingChanges?: BreakingChange[];
  warnings?: string[];
}

/**
 * Breaking change
 */
export interface BreakingChange {
  type: 'removed_field' | 'changed_type' | 'added_required' | 'removed_enum_value' | 'other';
  path: string;
  description: string;
  oldValue?: any;
  newValue?: any;
}

/**
 * Schema format validators
 */
export type FormatValidator = (value: any) => boolean;

/**
 * Custom validation function
 */
export type CustomValidator = (data: any, schema: JSONSchema) => ValidationResult;

/**
 * Schema registry entry
 */
export interface SchemaRegistryEntry {
  id: string;
  versions: Map<string, VersionedSchema>;
  latestVersion: string;
}

/**
 * Type guards
 */
export class SchemaTypeGuards {
  static isJSONSchema(obj: any): obj is JSONSchema {
    return obj && typeof obj === 'object' && ('type' in obj || 'properties' in obj || '$ref' in obj);
  }

  static isValidationResult(obj: any): obj is ValidationResult {
    return obj && typeof obj === 'object' && 'valid' in obj && typeof obj.valid === 'boolean';
  }

  static isVersionedSchema(obj: any): obj is VersionedSchema {
    return obj && typeof obj === 'object' && 'metadata' in obj && 'schema' in obj;
  }
}

/**
 * Schema utilities
 */
export class SchemaUtils {
  /**
   * Deep clone a schema
   */
  static clone(schema: JSONSchema): JSONSchema {
    return JSON.parse(JSON.stringify(schema));
  }

  /**
   * Merge schemas
   */
  static merge(base: JSONSchema, override: JSONSchema): JSONSchema {
    return {
      ...base,
      ...override,
      properties: {
        ...base.properties,
        ...override.properties
      },
      required: Array.from(new Set([
        ...(base.required || []),
        ...(override.required || [])
      ]))
    };
  }

  /**
   * Extract schema version from $id or $schema
   */
  static extractVersion(schema: JSONSchema): string | undefined {
    if (schema.$id) {
      const match = schema.$id.match(/v(\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  }

  /**
   * Generate schema hash for caching
   */
  static hash(schema: JSONSchema): string {
    const str = JSON.stringify(schema);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Validate schema structure
   */
  static validateStructure(schema: JSONSchema): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for required fields in object schemas
    if (schema.type === 'object' && schema.properties) {
      if (!schema.required || schema.required.length === 0) {
        errors.push({
          path: '',
          message: 'Object schema should specify required fields',
          keyword: 'required'
        });
      }
    }

    // Check for missing descriptions
    if (!schema.description) {
      errors.push({
        path: '',
        message: 'Schema should have a description',
        keyword: 'description'
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}