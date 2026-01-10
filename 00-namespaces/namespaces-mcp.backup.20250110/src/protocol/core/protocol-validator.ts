/**
 * MCP Protocol Validator
 * 
 * Comprehensive protocol validation with schema validation,
 * message integrity checks, and security validation.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { MCPMessage, MCPRequestMessage, MCPResponseMessage, MCPNotificationMessage, MCPMessageType, MCPStatusCode } from './mcp-protocol';

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}

/**
 * Validation Error
 */
export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'critical';
  details?: Record<string, any>;
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  details?: Record<string, any>;
}

/**
 * Validation Metadata
 */
export interface ValidationMetadata {
  validationTime: number;
  messageSize: number;
  schemaVersion: string;
  validatorVersion: string;
  checksPerformed: string[];
}

/**
 * Validator Configuration
 */
export interface ValidatorConfig {
  enableStrictValidation: boolean;
  enableSecurityValidation: boolean;
  enablePerformanceValidation: boolean;
  maxMessageSize: number;
  allowedMessageTypes: MCPMessageType[];
  allowedStatusCodes: MCPStatusCode[];
  enableSchemaValidation: boolean;
  enableIntegrityCheck: boolean;
  enableAuthenticationCheck: boolean;
}

/**
 * Protocol Schema Definitions
 */
const MCP_MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique message identifier'
    },
    type: {
      type: 'string',
      enum: Object.values(MCPMessageType),
      description: 'Message type'
    },
    timestamp: {
      type: 'integer',
      minimum: 0,
      description: 'Unix timestamp in milliseconds'
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol version in semver format'
    },
    source: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Message source identifier'
    },
    destination: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Message destination identifier'
    },
    metadata: {
      type: 'object',
      description: 'Additional message metadata'
    }
  },
  required: ['id', 'type', 'timestamp', 'version', 'source'],
  additionalProperties: true
};

const MCP_REQUEST_SCHEMA = {
  allOf: [
    MCP_MESSAGE_SCHEMA,
    {
      type: 'object',
      properties: {
        type: { const: MCPMessageType.REQUEST },
        method: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: '^[a-zA-Z][a-zA-Z0-9._-]*$',
          description: 'Method name'
        },
        params: {
          type: 'object',
          description: 'Method parameters'
        },
        timeout: {
          type: 'integer',
          minimum: 100,
          maximum: 300000,
          description: 'Request timeout in milliseconds'
        },
        priority: {
          type: 'integer',
          minimum: 0,
          maximum: 3,
          description: 'Message priority (0=low, 1=normal, 2=high, 3=critical)'
        }
      },
      required: ['method', 'params']
    }
  ]
};

const MCP_RESPONSE_SCHEMA = {
  allOf: [
    MCP_MESSAGE_SCHEMA,
    {
      type: 'object',
      properties: {
        type: { const: MCPMessageType.RESPONSE },
        requestId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of the original request'
        },
        status: {
          type: 'integer',
          enum: Object.values(MCPStatusCode),
          description: 'Response status code'
        },
        data: {
          description: 'Response data'
        },
        error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              enum: Object.values(MCPStatusCode),
              description: 'Error code'
            },
            message: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              description: 'Error message'
            },
            details: {
              type: 'object',
              description: 'Error details'
            },
            stack: {
              type: 'string',
              description: 'Error stack trace'
            }
          },
          required: ['code', 'message']
        }
      },
      required: ['requestId', 'status']
    }
  ]
};

const MCP_NOTIFICATION_SCHEMA = {
  allOf: [
    MCP_MESSAGE_SCHEMA,
    {
      type: 'object',
      properties: {
        type: { const: MCPMessageType.NOTIFICATION },
        event: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: '^[a-zA-Z][a-zA-Z0-9._-]*$',
          description: 'Event name'
        },
        data: {
          description: 'Event data'
        }
      },
      required: ['event', 'data']
    }
  ]
};

/**
 * MCP Protocol Validator
 */
export class MCPProtocolValidator {
  private config: ValidatorConfig;
  private ajv: Ajv;
  private schemas: Map<string, any> = new Map();
  private validators: Map<string, any> = new Map();

  constructor(config?: Partial<ValidatorConfig>) {
    this.config = {
      enableStrictValidation: true,
      enableSecurityValidation: true,
      enablePerformanceValidation: true,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      allowedMessageTypes: Object.values(MCPMessageType),
      allowedStatusCodes: Object.values(MCPStatusCode),
      enableSchemaValidation: true,
      enableIntegrityCheck: true,
      enableAuthenticationCheck: false,
      ...config
    };

    this.initializeValidator();
    this.compileSchemas();
  }

  /**
   * Validate MCP message
   */
  public validateMessage(message: MCPMessage): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const checksPerformed: string[] = [];

    try {
      // Basic structure validation
      this.performBasicValidation(message, errors, warnings, checksPerformed);

      // Schema validation
      if (this.config.enableSchemaValidation) {
        this.performSchemaValidation(message, errors, warnings, checksPerformed);
      }

      // Security validation
      if (this.config.enableSecurityValidation) {
        this.performSecurityValidation(message, errors, warnings, checksPerformed);
      }

      // Performance validation
      if (this.config.enablePerformanceValidation) {
        this.performPerformanceValidation(message, errors, warnings, checksPerformed);
      }

      // Integrity validation
      if (this.config.enableIntegrityCheck) {
        this.performIntegrityValidation(message, errors, warnings, checksPerformed);
      }

      // Type-specific validation
      this.performTypeSpecificValidation(message, errors, warnings, checksPerformed);

    } catch (error) {
      errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: `Validation exception: ${error.message}`,
        path: 'root',
        severity: 'critical',
        details: { originalError: error.message }
      });
    }

    const validationTime = Date.now() - startTime;
    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      metadata: {
        validationTime,
        messageSize: JSON.stringify(message).length,
        schemaVersion: '1.0.0',
        validatorVersion: '1.0.0',
        checksPerformed
      }
    };
  }

  /**
   * Validate message batch
   */
  public validateMessageBatch(messages: MCPMessage[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const allChecksPerformed: string[] = [];
    let totalValidationTime = 0;
    let totalMessageSize = 0;

    for (let i = 0; i < messages.length; i++) {
      const result = this.validateMessage(messages[i]);
      
      allErrors.push(...result.errors.map(error => ({
        ...error,
        path: `[${i}]${error.path}`
      })));
      
      allWarnings.push(...result.warnings.map(warning => ({
        ...warning,
        path: `[${i}]${warning.path}`
      })));
      
      allChecksPerformed.push(...result.metadata.checksPerformed);
      totalValidationTime += result.metadata.validationTime;
      totalMessageSize += result.metadata.messageSize;
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      metadata: {
        validationTime: totalValidationTime,
        messageSize: totalMessageSize,
        schemaVersion: '1.0.0',
        validatorVersion: '1.0.0',
        checksPerformed: [...new Set(allChecksPerformed)]
      }
    };
  }

  /**
   * Get validator configuration
   */
  public getConfig(): ValidatorConfig {
    return { ...this.config };
  }

  /**
   * Update validator configuration
   */
  public updateConfig(updates: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.enableSchemaValidation !== undefined) {
      this.compileSchemas();
    }
  }

  /**
   * Get available schemas
   */
  public getAvailableSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Add custom schema
   */
  public addSchema(name: string, schema: any): void {
    this.schemas.set(name, schema);
    this.validators.set(name, this.ajv.compile(schema));
  }

  /**
   * Remove custom schema
   */
  public removeSchema(name: string): void {
    this.schemas.delete(name);
    this.validators.delete(name);
  }

  // Private methods

  private initializeValidator(): void {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: this.config.enableStrictValidation,
      removeAdditional: this.config.enableStrictValidation ? 'all' : false
    });

    addFormats(this.ajv);
  }

  private compileSchemas(): void {
    this.validators.set('message', this.ajv.compile(MCP_MESSAGE_SCHEMA));
    this.validators.set('request', this.ajv.compile(MCP_REQUEST_SCHEMA));
    this.validators.set('response', this.ajv.compile(MCP_RESPONSE_SCHEMA));
    this.validators.set('notification', this.ajv.compile(MCP_NOTIFICATION_SCHEMA));
  }

  private performBasicValidation(
    message: MCPMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    checksPerformed: string[]
  ): void {
    checksPerformed.push('basic_validation');

    // Check if message is an object
    if (!message || typeof message !== 'object') {
      errors.push({
        code: 'INVALID_MESSAGE_TYPE',
        message: 'Message must be an object',
        path: 'root',
        severity: 'critical'
      });
      return;
    }

    // Check required fields
    const requiredFields = ['id', 'type', 'timestamp', 'version', 'source'];
    for (const field of requiredFields) {
      if (!(field in message)) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          path: field,
          severity: 'error'
        });
      }
    }

    // Check message type
    if (!this.config.allowedMessageTypes.includes(message.type)) {
      errors.push({
        code: 'INVALID_MESSAGE_TYPE',
        message: `Message type '${message.type}' is not allowed`,
        path: 'type',
        severity: 'error'
      });
    }
  }

  private performSchemaValidation(
    message: MCPMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    checksPerformed: string[]
  ): void {
    checksPerformed.push('schema_validation');

    let validator: any;
    let schemaName: string;

    switch (message.type) {
      case MCPMessageType.REQUEST:
        validator = this.validators.get('request');
        schemaName = 'request';
        break;
      case MCPMessageType.RESPONSE:
        validator = this.validators.get('response');
        schemaName = 'response';
        break;
      case MCPMessageType.NOTIFICATION:
        validator = this.validators.get('notification');
        schemaName = 'notification';
        break;
      default:
        validator = this.validators.get('message');
        schemaName = 'message';
        break;
    }

    if (validator) {
      const isValid = validator(message);
      
      if (!isValid) {
        for (const error of validator.errors || []) {
          errors.push({
            code: 'SCHEMA_VALIDATION_ERROR',
            message: error.message || 'Schema validation failed',
            path: error.instancePath || error.dataPath || 'root',
            severity: 'error',
            details: {
              schemaPath: error.schemaPath,
              keyword: error.keyword,
              params: error.params
            }
          });
        }
      }
    }
  }

  private performSecurityValidation(
    message: MCPMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    checksPerformed: string[]
  ): void {
    checksPerformed.push('security_validation');

    // Check for potential injection attacks
    const messageStr = JSON.stringify(message);
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(messageStr)) {
        errors.push({
          code: 'POTENTIAL_INJECTION',
          message: 'Message contains potentially malicious content',
          path: 'root',
          severity: 'critical'
        });
        break;
      }
    }

    // Check message size
    if (messageStr.length > this.config.maxMessageSize) {
      errors.push({
        code: 'MESSAGE_TOO_LARGE',
        message: `Message size exceeds maximum allowed size`,
        path: 'root',
        severity: 'error',
        details: {
          actualSize: messageStr.length,
          maxSize: this.config.maxMessageSize
        }
      });
    }

    // Check timestamp reasonableness
    const now = Date.now();
    const messageTime = message.timestamp;
    
    if (Math.abs(now - messageTime) > 300000) { // 5 minutes
      warnings.push({
        code: 'UNUSUAL_TIMESTAMP',
        message: 'Message timestamp is unusual (too far in past or future)',
        path: 'timestamp',
        details: {
          messageTime,
          currentTime: now,
          difference: Math.abs(now - messageTime)
        }
      });
    }
  }

  private performPerformanceValidation(
    message: MCPMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    checksPerformed: string[]
  ): void {
    checksPerformed.push('performance_validation');

    // Check for nested depth
    const maxDepth = 10;
    const depth = this.getObjectDepth(message);
    
    if (depth > maxDepth) {
      warnings.push({
        code: 'EXCESSIVE_NESTING',
        message: `Message nesting depth exceeds recommended limit`,
        path: 'root',
        details: {
          actualDepth: depth,
          maxDepth
        }
      });
    }

    // Check for large arrays
    const maxArraySize = 1000;
    const arraySize = this.getLargestArraySize(message);
    
    if (arraySize > maxArraySize) {
      warnings.push({
        code: 'LARGE_ARRAY',
        message: `Message contains large arrays that may impact performance`,
        path: 'root',
        details: {
          actualSize: arraySize,
          maxSize: maxArraySize
        }
      });
    }
  }

  private performIntegrityValidation(
    message: MCPMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    checksPerformed: string[]
  ): void {
    checksPerformed.push('integrity_validation');

    // Check message ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(message.id)) {
      errors.push({
        code: 'INVALID_MESSAGE_ID',
        message: 'Message ID must be a valid UUID',
        path: 'id',
        severity: 'error'
      });
    }

    // Check version format
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(message.version)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version must follow semantic versioning format (x.y.z)',
        path: 'version',
        severity: 'error'
      });
    }
  }

  private performTypeSpecificValidation(
    message: MCPMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    checksPerformed: string[]
  ): void {
    checksPerformed.push('type_specific_validation');

    switch (message.type) {
      case MCPMessageType.REQUEST:
        this.validateRequestMessage(message as MCPRequestMessage, errors, warnings);
        break;
      case MCPMessageType.RESPONSE:
        this.validateResponseMessage(message as MCPResponseMessage, errors, warnings);
        break;
      case MCPMessageType.NOTIFICATION:
        this.validateNotificationMessage(message as MCPNotificationMessage, errors, warnings);
        break;
    }
  }

  private validateRequestMessage(
    message: MCPRequestMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate method name
    if (!message.method || typeof message.method !== 'string') {
      errors.push({
        code: 'INVALID_METHOD',
        message: 'Request method is required and must be a string',
        path: 'method',
        severity: 'error'
      });
    }

    // Validate parameters
    if (!message.params || typeof message.params !== 'object') {
      errors.push({
        code: 'INVALID_PARAMS',
        message: 'Request params are required and must be an object',
        path: 'params',
        severity: 'error'
      });
    }

    // Validate timeout
    if (message.timeout && (message.timeout < 100 || message.timeout > 300000)) {
      warnings.push({
        code: 'UNUSUAL_TIMEOUT',
        message: 'Request timeout is outside recommended range (100ms - 300000ms)',
        path: 'timeout',
        details: { timeout: message.timeout }
      });
    }
  }

  private validateResponseMessage(
    message: MCPResponseMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate request ID
    if (!message.requestId) {
      errors.push({
        code: 'MISSING_REQUEST_ID',
        message: 'Response must include request ID',
        path: 'requestId',
        severity: 'error'
      });
    }

    // Validate status code
    if (!this.config.allowedStatusCodes.includes(message.status)) {
      errors.push({
        code: 'INVALID_STATUS_CODE',
        message: `Status code ${message.status} is not allowed`,
        path: 'status',
        severity: 'error'
      });
    }

    // Check for data and error coexistence
    if (message.data && message.error) {
      warnings.push({
        code: 'DATA_AND_ERROR',
        message: 'Response contains both data and error - typically only one should be present',
        path: 'root'
      });
    }
  }

  private validateNotificationMessage(
    message: MCPNotificationMessage,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate event name
    if (!message.event || typeof message.event !== 'string') {
      errors.push({
        code: 'INVALID_EVENT',
        message: 'Notification event is required and must be a string',
        path: 'event',
        severity: 'error'
      });
    }

    // Validate data presence
    if (message.data === undefined) {
      errors.push({
        code: 'MISSING_DATA',
        message: 'Notification must include data',
        path: 'data',
        severity: 'error'
      });
    }
  }

  private getObjectDepth(obj: any, currentDepth: number = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    if (currentDepth > 100) { // Prevent infinite recursion
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      const depth = this.getObjectDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  private getLargestArraySize(obj: any, currentMax: number = 0): number {
    if (Array.isArray(obj)) {
      currentMax = Math.max(currentMax, obj.length);
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        currentMax = this.getLargestArraySize(value, currentMax);
      }
    }

    return currentMax;
  }
}

/**
 * Default validator instance
 */
export const defaultMCPProtocolValidator = new MCPProtocolValidator();