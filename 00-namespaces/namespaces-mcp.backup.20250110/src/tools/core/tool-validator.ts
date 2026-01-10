/**
 * MCP Tool Validator
 * 
 * Comprehensive validation system for MCP tools with parameter validation,
 * schema validation, and execution validation.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  ITool,
  ToolSchema,
  ToolParameter,
  ToolConfiguration,
  ParameterType,
  ParameterValidation,
  ToolValidationResult,
  ToolValidationError,
  ToolValidationWarning
} from './tool-interface';

/**
 * Validator Configuration
 */
export interface ValidatorConfig {
  enableSchemaValidation: boolean;
  enableParameterValidation: boolean;
  enableConfigurationValidation: boolean;
  enableCustomValidators: boolean;
  strictMode: boolean;
  allowUnknownFields: boolean;
  maxParameterDepth: number;
  maxArrayLength: number;
  maxStringLength: number;
}

/**
 * Validation Rule
 */
export interface ValidationRule {
  name: string;
  type: ParameterType;
  validate: (value: any, validation?: ParameterValidation) => boolean;
  errorMessage: string;
}

/**
 * Custom Validator
 */
export interface CustomValidator {
  name: string;
  description: string;
  validate: (value: any, params?: any) => { isValid: boolean; message?: string };
}

/**
 * MCP Tool Validator
 */
export class MCPToolValidator {
  private config: ValidatorConfig;
  private ajv: Ajv;
  private validationRules: Map<string, ValidationRule> = new Map();
  private customValidators: Map<string, CustomValidator> = new Map();

  constructor(config?: Partial<ValidatorConfig>) {
    this.config = {
      enableSchemaValidation: true,
      enableParameterValidation: true,
      enableConfigurationValidation: true,
      enableCustomValidators: true,
      strictMode: false,
      allowUnknownFields: true,
      maxParameterDepth: 10,
      maxArrayLength: 1000,
      maxStringLength: 10000,
      ...config
    };

    this.initializeAjv();
    this.initializeValidationRules();
  }

  /**
   * Validate tool
   */
  public validateTool(tool: ITool): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    try {
      // Validate schema
      if (this.config.enableSchemaValidation) {
        const schemaValidation = this.validateSchema(tool.schema);
        errors.push(...schemaValidation.errors);
        warnings.push(...schemaValidation.warnings);
      }

      // Validate configuration
      if (this.config.enableConfigurationValidation) {
        const configValidation = this.validateConfiguration(tool.configuration);
        errors.push(...configValidation.errors);
        warnings.push(...configValidation.warnings);
      }

      // Validate implementation
      const implementationValidation = this.validateImplementation(tool);
      errors.push(...implementationValidation.errors);
      warnings.push(...implementationValidation.warnings);

    } catch (error) {
      errors.push({
        parameter: 'root',
        code: 'VALIDATION_EXCEPTION',
        message: `Validation exception: ${error.message}`,
        severity: 'critical'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate tool schema
   */
  public validateSchema(schema: ToolSchema): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    // Basic required fields
    this.validateRequiredFields(schema, errors);

    // Validate name format
    this.validateNameFormat(schema.name, errors);

    // Validate version format
    this.validateVersionFormat(schema.version, errors);

    // Validate parameters
    this.validateParameters(schema.parameters, errors, warnings);

    // Validate result schema
    if (schema.returns) {
      this.validateResultSchema(schema.returns, errors, warnings);
    }

    // Validate examples
    this.validateExamples(schema.examples, schema.parameters, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate tool configuration
   */
  public validateConfiguration(config: ToolConfiguration): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    // Validate timeout
    if (config.timeout <= 0) {
      errors.push({
        parameter: 'timeout',
        code: 'INVALID_TIMEOUT',
        message: 'Timeout must be positive',
        severity: 'error'
      });
    }

    if (config.timeout > 300000) { // 5 minutes
      warnings.push({
        parameter: 'timeout',
        code: 'HIGH_TIMEOUT',
        message: 'Timeout is very high, may cause performance issues'
      });
    }

    // Validate retry settings
    if (config.retryAttempts < 0) {
      errors.push({
        parameter: 'retryAttempts',
        code: 'INVALID_RETRY_ATTEMPTS',
        message: 'Retry attempts cannot be negative',
        severity: 'error'
      });
    }

    if (config.retryDelay < 0) {
      errors.push({
        parameter: 'retryDelay',
        code: 'INVALID_RETRY_DELAY',
        message: 'Retry delay cannot be negative',
        severity: 'error'
      });
    }

    // Validate resource limits
    if (config.resources.maxMemory <= 0) {
      errors.push({
        parameter: 'resources.maxMemory',
        code: 'INVALID_MEMORY_LIMIT',
        message: 'Memory limit must be positive',
        severity: 'error'
      });
    }

    if (config.resources.maxCPU < 0 || config.resources.maxCPU > 100) {
      errors.push({
        parameter: 'resources.maxCPU',
        code: 'INVALID_CPU_LIMIT',
        message: 'CPU limit must be between 0 and 100',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate parameters
   */
  public validateParameters(
    parameters: Record<string, any>,
    schema: ToolParameter[]
  ): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    if (!this.config.enableParameterValidation) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Check for required parameters
    for (const param of schema) {
      if (param.required && !(param.name in parameters)) {
        errors.push({
          parameter: param.name,
          code: 'REQUIRED_PARAMETER_MISSING',
          message: `Required parameter '${param.name}' is missing`,
          severity: 'error'
        });
      }
    }

    // Validate provided parameters
    for (const [name, value] of Object.entries(parameters)) {
      const paramSchema = schema.find(p => p.name === name);
      
      if (!paramSchema) {
        if (!this.config.allowUnknownFields) {
          errors.push({
            parameter: name,
            code: 'UNKNOWN_PARAMETER',
            message: `Unknown parameter '${name}'`,
            severity: this.config.strictMode ? 'error' : 'warning'
          });
        }
        continue;
      }

      const paramValidation = this.validateParameter(value, paramSchema);
      errors.push(...paramValidation.errors.map(e => ({ ...e, parameter: name })));
      warnings.push(...paramValidation.warnings.map(w => ({ ...w, parameter: name })));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate single parameter
   */
  public validateParameter(value: any, schema: ToolParameter): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    // Type validation
    if (!this.validateParameterType(value, schema.type)) {
      errors.push({
        parameter: schema.name,
        code: 'INVALID_TYPE',
        message: `Expected type ${schema.type}, got ${typeof value}`,
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    // Custom validation rules
    if (schema.validation) {
      const customValidation = this.validateParameterWithRules(value, schema);
      errors.push(...customValidation.errors);
      warnings.push(...customValidation.warnings);
    }

    // Depth validation for objects/arrays
    if (typeof value === 'object' && value !== null) {
      const depth = this.getObjectDepth(value);
      if (depth > this.config.maxParameterDepth) {
        errors.push({
          parameter: schema.name,
          code: 'EXCESSIVE_DEPTH',
          message: `Parameter depth (${depth}) exceeds maximum allowed (${this.config.maxParameterDepth})`,
          severity: 'error'
        });
      }
    }

    // Array length validation
    if (Array.isArray(value) && value.length > this.config.maxArrayLength) {
      errors.push({
        parameter: schema.name,
        code: 'EXCESSIVE_LENGTH',
        message: `Array length (${value.length}) exceeds maximum allowed (${this.config.maxArrayLength})`,
        severity: 'error'
      });
    }

    // String length validation
    if (typeof value === 'string' && value.length > this.config.maxStringLength) {
      errors.push({
        parameter: schema.name,
        code: 'EXCESSIVE_LENGTH',
        message: `String length (${value.length}) exceeds maximum allowed (${this.config.maxStringLength})`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Register custom validator
   */
  public registerCustomValidator(validator: CustomValidator): void {
    if (!this.config.enableCustomValidators) {
      throw new Error('Custom validators are disabled');
    }

    this.customValidators.set(validator.name, validator);
  }

  /**
   * Get custom validators
   */
  public getCustomValidators(): CustomValidator[] {
    return Array.from(this.customValidators.values());
  }

  /**
   * Get configuration
   */
  public getConfig(): ValidatorConfig {
    return { ...this.config };
  }

  // Private methods

  private initializeAjv(): void {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: this.config.strictMode,
      removeAdditional: this.config.allowUnknownFields ? false : 'all'
    });

    addFormats(this.ajv);
  }

  private initializeValidationRules(): void {
    // String validation rules
    this.validationRules.set('string-pattern', {
      name: 'string-pattern',
      type: ParameterType.STRING,
      validate: (value: string, validation?: ParameterValidation) => {
        if (!validation?.pattern) return true;
        const regex = new RegExp(validation.pattern);
        return regex.test(value);
      },
      errorMessage: 'String does not match required pattern'
    });

    this.validationRules.set('string-length', {
      name: 'string-length',
      type: ParameterType.STRING,
      validate: (value: string, validation?: ParameterValidation) => {
        if (validation?.minLength !== undefined && value.length < validation.minLength) {
          return false;
        }
        if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
          return false;
        }
        return true;
      },
      errorMessage: 'String length is outside allowed range'
    });

    // Number validation rules
    this.validationRules.set('number-range', {
      name: 'number-range',
      type: ParameterType.NUMBER,
      validate: (value: number, validation?: ParameterValidation) => {
        if (validation?.minimum !== undefined && value < validation.minimum) {
          return false;
        }
        if (validation?.maximum !== undefined && value > validation.maximum) {
          return false;
        }
        return true;
      },
      errorMessage: 'Number is outside allowed range'
    });

    // Enum validation rule
    this.validationRules.set('enum-value', {
      name: 'enum-value',
      type: ParameterType.ENUM,
      validate: (value: any, validation?: ParameterValidation) => {
        if (!validation?.enum) return false;
        return validation.enum.includes(value);
      },
      errorMessage: 'Value is not in allowed enum'
    });
  }

  private validateRequiredFields(schema: ToolSchema, errors: ToolValidationError[]): void {
    const requiredFields = ['name', 'version', 'description', 'type'];
    
    for (const field of requiredFields) {
      if (!(field in schema) || !schema[field as keyof ToolSchema]) {
        errors.push({
          parameter: field,
          code: 'REQUIRED_FIELD',
          message: `Required field '${field}' is missing`,
          severity: 'error'
        });
      }
    }
  }

  private validateNameFormat(name: string, errors: ToolValidationError[]): void {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      errors.push({
        parameter: 'name',
        code: 'INVALID_NAME_FORMAT',
        message: 'Name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens',
        severity: 'error'
      });
    }
  }

  private validateVersionFormat(version: string, errors: ToolValidationError[]): void {
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      errors.push({
        parameter: 'version',
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version must follow semantic versioning format (x.y.z)',
        severity: 'error'
      });
    }
  }

  private validateParameters(
    parameters: ToolParameter[],
    errors: ToolValidationError[],
    warnings: ToolValidationWarning[]
  ): void {
    for (const param of parameters) {
      if (!param.name || param.name.trim().length === 0) {
        errors.push({
          parameter: 'parameter',
          code: 'INVALID_PARAMETER_NAME',
          message: 'Parameter name is required',
          severity: 'error'
        });
        continue;
      }

      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(param.name)) {
        errors.push({
          parameter: param.name,
          code: 'INVALID_PARAMETER_NAME_FORMAT',
          message: 'Parameter name must start with letter and contain only letters, numbers, and underscores',
          severity: 'error'
        });
      }

      if (!param.description || param.description.trim().length === 0) {
        warnings.push({
          parameter: param.name,
          code: 'MISSING_DESCRIPTION',
          message: 'Parameter description is recommended'
        });
      }
    }
  }

  private validateResultSchema(
    resultSchema: any,
    errors: ToolValidationError[],
    warnings: ToolValidationWarning[]
  ): void {
    if (!resultSchema.type) {
      errors.push({
        parameter: 'returns.type',
        code: 'REQUIRED_FIELD',
        message: 'Result type is required',
        severity: 'error'
      });
    }

    if (!resultSchema.description) {
      warnings.push({
        parameter: 'returns.description',
        code: 'MISSING_DESCRIPTION',
        message: 'Result description is recommended'
      });
    }
  }

  private validateExamples(
    examples: any[],
    parameters: ToolParameter[],
    errors: ToolValidationError[],
    warnings: ToolValidationWarning[]
  ): void {
    if (!examples || examples.length === 0) {
      warnings.push({
        parameter: 'examples',
        code: 'MISSING_EXAMPLES',
        message: 'Examples are recommended for better documentation'
      });
      return;
    }

    for (const example of examples) {
      if (!example.name) {
        errors.push({
          parameter: 'example.name',
          code: 'REQUIRED_FIELD',
          message: 'Example name is required',
          severity: 'error'
        });
      }

      if (!example.parameters) {
        errors.push({
          parameter: 'example.parameters',
          code: 'REQUIRED_FIELD',
          message: 'Example parameters are required',
          severity: 'error'
        });
      }

      if (!example.result) {
        errors.push({
          parameter: 'example.result',
          code: 'REQUIRED_FIELD',
          message: 'Example result is required',
          severity: 'error'
        });
      }
    }
  }

  private validateImplementation(tool: ITool): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    // Check if execute method exists
    if (typeof tool.execute !== 'function') {
      errors.push({
        parameter: 'execute',
        code: 'MISSING_EXECUTE_METHOD',
        message: 'Tool must implement execute method',
        severity: 'critical'
      });
    }

    // Check if validateParameters method exists
    if (typeof tool.validateParameters !== 'function') {
      warnings.push({
        parameter: 'validateParameters',
        code: 'MISSING_VALIDATION_METHOD',
        message: 'Tool should implement validateParameters method'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateParameterType(value: any, type: ParameterType): boolean {
    switch (type) {
      case ParameterType.STRING:
        return typeof value === 'string';
      case ParameterType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case ParameterType.BOOLEAN:
        return typeof value === 'boolean';
      case ParameterType.ARRAY:
        return Array.isArray(value);
      case ParameterType.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case ParameterType.DATE:
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case ParameterType.ENUM:
        return true; // Enum validation handled separately
      case ParameterType.FILE:
      case ParameterType.BINARY:
        return true; // File/Binary validation handled separately
      default:
        return false;
    }
  }

  private validateParameterWithRules(value: any, schema: ToolParameter): ToolValidationResult {
    const errors: ToolValidationError[] = [];
    const warnings: ToolValidationWarning[] = [];

    if (!schema.validation) {
      return { isValid: true, errors, warnings };
    }

    // Pattern validation
    if (schema.validation.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          parameter: schema.name,
          code: 'PATTERN_MISMATCH',
          message: `Value does not match required pattern: ${schema.validation.pattern}`,
          severity: 'error'
        });
      }
    }

    // Length validation
    if (typeof value === 'string') {
      if (schema.validation.minLength !== undefined && value.length < schema.validation.minLength) {
        errors.push({
          parameter: schema.name,
          code: 'MIN_LENGTH_VIOLATION',
          message: `String length (${value.length}) is less than minimum (${schema.validation.minLength})`,
          severity: 'error'
        });
      }

      if (schema.validation.maxLength !== undefined && value.length > schema.validation.maxLength) {
        errors.push({
          parameter: schema.name,
          code: 'MAX_LENGTH_VIOLATION',
          message: `String length (${value.length}) exceeds maximum (${schema.validation.maxLength})`,
          severity: 'error'
        });
      }
    }

    // Range validation
    if (typeof value === 'number') {
      if (schema.validation.minimum !== undefined && value < schema.validation.minimum) {
        errors.push({
          parameter: schema.name,
          code: 'MINIMUM_VIOLATION',
          message: `Value (${value}) is less than minimum (${schema.validation.minimum})`,
          severity: 'error'
        });
      }

      if (schema.validation.maximum !== undefined && value > schema.validation.maximum) {
        errors.push({
          parameter: schema.name,
          code: 'MAXIMUM_VIOLATION',
          message: `Value (${value}) exceeds maximum (${schema.validation.maximum})`,
          severity: 'error'
        });
      }
    }

    // Enum validation
    if (schema.validation.enum && !schema.validation.enum.includes(value)) {
      errors.push({
        parameter: schema.name,
        code: 'ENUM_VIOLATION',
        message: `Value must be one of: ${schema.validation.enum.join(', ')}`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private getObjectDepth(obj: any, currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    if (currentDepth > this.config.maxParameterDepth) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      const depth = this.getObjectDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }
}