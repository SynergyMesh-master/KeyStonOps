/**
 * Schema Validation Engine
 * 
 * Implements core schema validation logic, supporting both static and dynamic
 * validation of tool inputs and outputs.
 */

import {
  JSONSchema,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  FormatValidator,
  CustomValidator,
  SchemaUtils
} from './types';

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Strict mode (fail on warnings) */
  strict?: boolean;
  /** Allow additional properties */
  allowAdditional?: boolean;
  /** Coerce types */
  coerceTypes?: boolean;
  /** Remove additional properties */
  removeAdditional?: boolean;
  /** Custom format validators */
  formats?: Record<string, FormatValidator>;
  /** Custom validators */
  customValidators?: CustomValidator[];
}

/**
 * Schema Validator class
 */
export class SchemaValidator {
  private formatValidators: Map<string, FormatValidator>;
  private customValidators: CustomValidator[];
  private schemaCache: Map<string, any>;

  constructor() {
    this.formatValidators = new Map();
    this.customValidators = [];
    this.schemaCache = new Map();
    
    // Register default format validators
    this.registerDefaultFormats();
  }

  /**
   * Register default format validators
   */
  private registerDefaultFormats(): void {
    // Email format
    this.formatValidators.set('email', (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    });

    // URI format
    this.formatValidators.set('uri', (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });

    // Date-time format (ISO 8601)
    this.formatValidators.set('date-time', (value: string) => {
      const date = new Date(value);
      return !isNaN(date.getTime()) && value === date.toISOString();
    });

    // UUID format
    this.formatValidators.set('uuid', (value: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    });

    // IPv4 format
    this.formatValidators.set('ipv4', (value: string) => {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(value)) return false;
      return value.split('.').every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    });
  }

  /**
   * Register a custom format validator
   */
  registerFormat(name: string, validator: FormatValidator): void {
    this.formatValidators.set(name, validator);
  }

  /**
   * Register a custom validator
   */
  registerCustomValidator(validator: CustomValidator): void {
    this.customValidators.push(validator);
  }

  /**
   * Validate data against schema
   */
  async validate(
    data: any,
    schema: JSONSchema,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Validate schema structure
      this.validateValue(data, schema, '', errors, options);

      // Run custom validators
      for (const customValidator of this.customValidators) {
        const result = customValidator(data, schema);
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      }

      // Check strict mode
      if (options.strict && warnings.length > 0) {
        warnings.forEach(w => {
          errors.push({
            path: w.path,
            message: w.message,
            keyword: 'warning'
          });
        });
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error: any) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Validation error: ${error.message}`,
          keyword: 'exception'
        }]
      };
    }
  }

  /**
   * Validate a value against schema
   */
  private validateValue(
    value: any,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[],
    options: ValidationOptions
  ): void {
    // Handle $ref
    if (schema.$ref) {
      // In a real implementation, this would resolve the reference
      return;
    }

    // Type validation
    if (schema.type) {
      if (!this.validateType(value, schema.type, options.coerceTypes)) {
        errors.push({
          path,
          message: `Expected type ${schema.type}, got ${typeof value}`,
          keyword: 'type',
          params: { type: schema.type, actualType: typeof value }
        });
        return;
      }
    }

    // Const validation
    if (schema.const !== undefined && value !== schema.const) {
      errors.push({
        path,
        message: `Value must be ${JSON.stringify(schema.const)}`,
        keyword: 'const',
        params: { allowedValue: schema.const }
      });
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        keyword: 'enum',
        params: { allowedValues: schema.enum }
      });
    }

    // Type-specific validations
    if (typeof value === 'string') {
      this.validateString(value, schema, path, errors);
    } else if (typeof value === 'number') {
      this.validateNumber(value, schema, path, errors);
    } else if (Array.isArray(value)) {
      this.validateArray(value, schema, path, errors, options);
    } else if (typeof value === 'object' && value !== null) {
      this.validateObject(value, schema, path, errors, options);
    }

    // Combined schemas
    if (schema.allOf) {
      schema.allOf.forEach(subSchema => {
        this.validateValue(value, subSchema, path, errors, options);
      });
    }

    if (schema.anyOf) {
      const anyOfErrors: ValidationError[] = [];
      const valid = schema.anyOf.some(subSchema => {
        const tempErrors: ValidationError[] = [];
        this.validateValue(value, subSchema, path, tempErrors, options);
        if (tempErrors.length > 0) {
          anyOfErrors.push(...tempErrors);
        }
        return tempErrors.length === 0;
      });

      if (!valid) {
        errors.push({
          path,
          message: 'Value does not match any of the schemas',
          keyword: 'anyOf',
          params: { errors: anyOfErrors }
        });
      }
    }

    if (schema.oneOf) {
      const matches = schema.oneOf.filter(subSchema => {
        const tempErrors: ValidationError[] = [];
        this.validateValue(value, subSchema, path, tempErrors, options);
        return tempErrors.length === 0;
      });

      if (matches.length !== 1) {
        errors.push({
          path,
          message: `Value must match exactly one schema, but matched ${matches.length}`,
          keyword: 'oneOf',
          params: { matches: matches.length }
        });
      }
    }

    if (schema.not) {
      const tempErrors: ValidationError[] = [];
      this.validateValue(value, schema.not, path, tempErrors, options);
      if (tempErrors.length === 0) {
        errors.push({
          path,
          message: 'Value must not match the schema',
          keyword: 'not'
        });
      }
    }
  }

  /**
   * Validate type
   */
  private validateType(value: any, type: string | string[], coerce?: boolean): boolean {
    const types = Array.isArray(type) ? type : [type];
    const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

    return types.some(t => {
      if (t === actualType) return true;
      if (t === 'integer' && typeof value === 'number' && Number.isInteger(value)) return true;
      if (coerce) {
        // Type coercion logic could be added here
      }
      return false;
    });
  }

  /**
   * Validate string
   */
  private validateString(
    value: string,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: `String length must be >= ${schema.minLength}`,
        keyword: 'minLength',
        params: { limit: schema.minLength }
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `String length must be <= ${schema.maxLength}`,
        keyword: 'maxLength',
        params: { limit: schema.maxLength }
      });
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          path,
          message: `String does not match pattern: ${schema.pattern}`,
          keyword: 'pattern',
          params: { pattern: schema.pattern }
        });
      }
    }

    if (schema.format) {
      const validator = this.formatValidators.get(schema.format);
      if (validator && !validator(value)) {
        errors.push({
          path,
          message: `String does not match format: ${schema.format}`,
          keyword: 'format',
          params: { format: schema.format }
        });
      }
    }
  }

  /**
   * Validate number
   */
  private validateNumber(
    value: number,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        message: `Number must be >= ${schema.minimum}`,
        keyword: 'minimum',
        params: { limit: schema.minimum }
      });
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        message: `Number must be <= ${schema.maximum}`,
        keyword: 'maximum',
        params: { limit: schema.maximum }
      });
    }

    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push({
        path,
        message: `Number must be > ${schema.exclusiveMinimum}`,
        keyword: 'exclusiveMinimum',
        params: { limit: schema.exclusiveMinimum }
      });
    }

    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push({
        path,
        message: `Number must be < ${schema.exclusiveMaximum}`,
        keyword: 'exclusiveMaximum',
        params: { limit: schema.exclusiveMaximum }
      });
    }

    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      errors.push({
        path,
        message: `Number must be multiple of ${schema.multipleOf}`,
        keyword: 'multipleOf',
        params: { multipleOf: schema.multipleOf }
      });
    }
  }

  /**
   * Validate array
   */
  private validateArray(
    value: any[],
    schema: JSONSchema,
    path: string,
    errors: ValidationError[],
    options: ValidationOptions
  ): void {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        path,
        message: `Array must have at least ${schema.minItems} items`,
        keyword: 'minItems',
        params: { limit: schema.minItems }
      });
    }

    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({
        path,
        message: `Array must have at most ${schema.maxItems} items`,
        keyword: 'maxItems',
        params: { limit: schema.maxItems }
      });
    }

    if (schema.uniqueItems) {
      const seen = new Set();
      const duplicates: number[] = [];
      value.forEach((item, index) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          duplicates.push(index);
        }
        seen.add(key);
      });

      if (duplicates.length > 0) {
        errors.push({
          path,
          message: 'Array items must be unique',
          keyword: 'uniqueItems',
          params: { duplicateIndices: duplicates }
        });
      }
    }

    if (schema.items) {
      if (Array.isArray(schema.items)) {
        // Tuple validation
        value.forEach((item, index) => {
          if (index < schema.items!.length) {
            this.validateValue(
              item,
              (schema.items as JSONSchema[])[index],
              `${path}[${index}]`,
              errors,
              options
            );
          }
        });
      } else {
        // All items must match schema
        value.forEach((item, index) => {
          this.validateValue(
            item,
            schema.items as JSONSchema,
            `${path}[${index}]`,
            errors,
            options
          );
        });
      }
    }
  }

  /**
   * Validate object
   */
  private validateObject(
    value: Record<string, any>,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[],
    options: ValidationOptions
  ): void {
    // Required properties
    if (schema.required) {
      schema.required.forEach(prop => {
        if (!(prop in value)) {
          errors.push({
            path: path ? `${path}.${prop}` : prop,
            message: `Missing required property: ${prop}`,
            keyword: 'required',
            params: { missingProperty: prop }
          });
        }
      });
    }

    // Property count
    const propCount = Object.keys(value).length;
    if (schema.minProperties !== undefined && propCount < schema.minProperties) {
      errors.push({
        path,
        message: `Object must have at least ${schema.minProperties} properties`,
        keyword: 'minProperties',
        params: { limit: schema.minProperties }
      });
    }

    if (schema.maxProperties !== undefined && propCount > schema.maxProperties) {
      errors.push({
        path,
        message: `Object must have at most ${schema.maxProperties} properties`,
        keyword: 'maxProperties',
        params: { limit: schema.maxProperties }
      });
    }

    // Validate properties
    if (schema.properties) {
      Object.keys(value).forEach(key => {
        const propPath = path ? `${path}.${key}` : key;
        
        if (schema.properties![key]) {
          this.validateValue(
            value[key],
            schema.properties![key],
            propPath,
            errors,
            options
          );
        } else if (schema.additionalProperties === false && !options.allowAdditional) {
          errors.push({
            path: propPath,
            message: `Additional property not allowed: ${key}`,
            keyword: 'additionalProperties',
            params: { additionalProperty: key }
          });
        } else if (typeof schema.additionalProperties === 'object') {
          this.validateValue(
            value[key],
            schema.additionalProperties,
            propPath,
            errors,
            options
          );
        }
      });
    }
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }
}