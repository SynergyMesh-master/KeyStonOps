/**
 * Error Types and Handling
 * 
 * Defines standardized error types, codes, and handling logic for the SDK.
 * Aligns with MCP and JSON-RPC error conventions.
 */

/**
 * Standard error codes following JSON-RPC 2.0 specification
 */
export enum ErrorCode {
  // JSON-RPC standard errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // MCP-specific errors (range: -32000 to -32099)
  TOOL_NOT_FOUND = -32000,
  TOOL_EXECUTION_ERROR = -32001,
  SCHEMA_VALIDATION_ERROR = -32002,
  CREDENTIAL_ERROR = -32003,
  ADAPTER_ERROR = -32004,
  PLUGIN_ERROR = -32005,
  CONFIGURATION_ERROR = -32006,
  RATE_LIMIT_ERROR = -32007,
  AUTHENTICATION_ERROR = -32008,
  AUTHORIZATION_ERROR = -32009,
  TIMEOUT_ERROR = -32010,
  NETWORK_ERROR = -32011,
  
  // Application-specific errors (range: -32100 to -32199)
  AUDIT_ERROR = -32100,
  OBSERVABILITY_ERROR = -32101,
  REGISTRY_ERROR = -32102
}

/**
 * Base SDK Error class
 */
export class SDKError extends Error {
  public readonly code: ErrorCode;
  public readonly data?: any;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    data?: any,
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.data = data;
    this.timestamp = new Date();
    this.correlationId = correlationId;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON-RPC error format
   */
  toJSONRPC(): any {
    return {
      code: this.code,
      message: this.message,
      data: {
        ...this.data,
        timestamp: this.timestamp.toISOString(),
        correlationId: this.correlationId,
        stack: this.stack
      }
    };
  }

  /**
   * Convert error to audit log format
   */
  toAuditLog(): any {
    return {
      errorType: this.name,
      errorCode: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      data: this.data
    };
  }
}

/**
 * Tool-related errors
 */
export class ToolNotFoundError extends SDKError {
  constructor(toolName: string, correlationId?: string) {
    super(
      `Tool '${toolName}' not found in registry`,
      ErrorCode.TOOL_NOT_FOUND,
      { toolName },
      correlationId
    );
  }
}

export class ToolExecutionError extends SDKError {
  constructor(toolName: string, originalError: Error, correlationId?: string) {
    super(
      `Tool '${toolName}' execution failed: ${originalError.message}`,
      ErrorCode.TOOL_EXECUTION_ERROR,
      { toolName, originalError: originalError.message },
      correlationId
    );
  }
}

/**
 * Schema validation errors
 */
export class SchemaValidationError extends SDKError {
  constructor(message: string, validationErrors: any[], correlationId?: string) {
    super(
      message,
      ErrorCode.SCHEMA_VALIDATION_ERROR,
      { validationErrors },
      correlationId
    );
  }
}

/**
 * Credential-related errors
 */
export class CredentialError extends SDKError {
  constructor(message: string, credentialType?: string, correlationId?: string) {
    super(
      message,
      ErrorCode.CREDENTIAL_ERROR,
      { credentialType },
      correlationId
    );
  }
}

export class AuthenticationError extends SDKError {
  constructor(service: string, correlationId?: string) {
    super(
      `Authentication failed for service: ${service}`,
      ErrorCode.AUTHENTICATION_ERROR,
      { service },
      correlationId
    );
  }
}

export class AuthorizationError extends SDKError {
  constructor(operation: string, correlationId?: string) {
    super(
      `Authorization failed for operation: ${operation}`,
      ErrorCode.AUTHORIZATION_ERROR,
      { operation },
      correlationId
    );
  }
}

/**
 * Adapter-related errors
 */
export class AdapterError extends SDKError {
  constructor(adapterName: string, message: string, correlationId?: string) {
    super(
      `Adapter '${adapterName}' error: ${message}`,
      ErrorCode.ADAPTER_ERROR,
      { adapterName },
      correlationId
    );
  }
}

/**
 * Plugin-related errors
 */
export class PluginError extends SDKError {
  constructor(pluginName: string, message: string, correlationId?: string) {
    super(
      `Plugin '${pluginName}' error: ${message}`,
      ErrorCode.PLUGIN_ERROR,
      { pluginName },
      correlationId
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends SDKError {
  constructor(message: string, configKey?: string, correlationId?: string) {
    super(
      message,
      ErrorCode.CONFIGURATION_ERROR,
      { configKey },
      correlationId
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends SDKError {
  constructor(service: string, retryAfter?: number, correlationId?: string) {
    super(
      `Rate limit exceeded for service: ${service}`,
      ErrorCode.RATE_LIMIT_ERROR,
      { service, retryAfter },
      correlationId
    );
  }
}

/**
 * Network and timeout errors
 */
export class TimeoutError extends SDKError {
  constructor(operation: string, timeoutMs: number, correlationId?: string) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      ErrorCode.TIMEOUT_ERROR,
      { operation, timeoutMs },
      correlationId
    );
  }
}

export class NetworkError extends SDKError {
  constructor(message: string, url?: string, correlationId?: string) {
    super(
      message,
      ErrorCode.NETWORK_ERROR,
      { url },
      correlationId
    );
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Map external API errors to SDK errors
   */
  static mapExternalError(error: any, context: string, correlationId?: string): SDKError {
    // Handle common HTTP status codes
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401) {
        return new AuthenticationError(context, correlationId);
      }
      if (status === 403) {
        return new AuthorizationError(context, correlationId);
      }
      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        return new RateLimitError(context, retryAfter, correlationId);
      }
      if (status >= 500) {
        return new NetworkError(`Service error: ${status}`, error.config?.url, correlationId);
      }
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new TimeoutError(context, error.timeout || 0, correlationId);
    }
    
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new NetworkError(error.message, error.config?.url, correlationId);
    }
    
    // Default to internal error
    return new SDKError(
      error.message || 'Unknown error',
      ErrorCode.INTERNAL_ERROR,
      { originalError: error },
      correlationId
    );
  }

  /**
   * Sanitize error for logging (remove sensitive data)
   */
  static sanitizeError(error: SDKError): any {
    const sanitized = {
      name: error.name,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      correlationId: error.correlationId
    };
    
    // Remove sensitive data from error.data
    if (error.data) {
      const { password, token, apiKey, secret, ...safeData } = error.data;
      return { ...sanitized, data: safeData };
    }
    
    return sanitized;
  }
}