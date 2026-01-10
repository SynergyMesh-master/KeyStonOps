/**
 * MCP Protocol Core Definition
 * 
 * Core protocol implementation defining the fundamental MCP protocol
 * with enhanced message handling, validation, and transport abstractions.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * MCP Protocol Message Types
 */
export enum MCPMessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
  DISCOVERY = 'discovery',
  REGISTRATION = 'registration',
  UNREGISTRATION = 'unregistration'
}

/**
 * MCP Protocol Status Codes
 */
export enum MCPStatusCode {
  SUCCESS = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  VALIDATION_ERROR = 422,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
  TIMEOUT = 504
}

/**
 * Base MCP Protocol Message
 */
export interface MCPMessage {
  id: string;
  type: MCPMessageType;
  timestamp: number;
  version: string;
  source: string;
  destination?: string;
  metadata?: Record<string, any>;
}

/**
 * MCP Request Message
 */
export interface MCPRequestMessage extends MCPMessage {
  type: MCPMessageType.REQUEST;
  method: string;
  params: Record<string, any>;
  timeout?: number;
  priority?: number;
}

/**
 * MCP Response Message
 */
export interface MCPResponseMessage extends MCPMessage {
  type: MCPMessageType.RESPONSE;
  requestId: string;
  status: MCPStatusCode;
  data?: any;
  error?: MCPError;
}

/**
 * MCP Notification Message
 */
export interface MCPNotificationMessage extends MCPMessage {
  type: MCPMessageType.NOTIFICATION;
  event: string;
  data: any;
}

/**
 * MCP Error Information
 */
export interface MCPError {
  code: MCPStatusCode;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * MCP Protocol Configuration
 */
export interface MCPProtocolConfig {
  version: string;
  maxMessageSize: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  maxConnections: number;
  heartbeatInterval: number;
}

/**
 * MCP Protocol Core Class
 */
export class MCPProtocol extends EventEmitter {
  private config: MCPProtocolConfig;
  private activeMessages: Map<string, MCPRequestMessage> = new Map();
  private messageHandlers: Map<string, Function[]> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  constructor(config?: Partial<MCPProtocolConfig>) {
    super();
    
    this.config = {
      version: '1.0.0',
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      defaultTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      enableCompression: true,
      enableEncryption: true,
      maxConnections: 1000,
      heartbeatInterval: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Create a new MCP request message
   */
  public createRequest(
    method: string,
    params: Record<string, any>,
    options?: {
      timeout?: number;
      priority?: number;
      destination?: string;
      metadata?: Record<string, any>;
    }
  ): MCPRequestMessage {
    const message: MCPRequestMessage = {
      id: uuidv4(),
      type: MCPMessageType.REQUEST,
      timestamp: Date.now(),
      version: this.config.version,
      source: 'mcp-client',
      method,
      params,
      ...options
    };

    this.activeMessages.set(message.id, message);
    return message;
  }

  /**
   * Create a new MCP response message
   */
  public createResponse(
    requestId: string,
    status: MCPStatusCode,
    data?: any,
    error?: MCPError
  ): MCPResponseMessage {
    return {
      id: uuidv4(),
      type: MCPMessageType.RESPONSE,
      timestamp: Date.now(),
      version: this.config.version,
      source: 'mcp-server',
      requestId,
      status,
      data,
      error
    };
  }

  /**
   * Create a new MCP notification message
   */
  public createNotification(
    event: string,
    data: any,
    options?: {
      destination?: string;
      metadata?: Record<string, any>;
    }
  ): MCPNotificationMessage {
    return {
      id: uuidv4(),
      type: MCPMessageType.NOTIFICATION,
      timestamp: Date.now(),
      version: this.config.version,
      source: 'mcp-client',
      event,
      data,
      ...options
    };
  }

  /**
   * Validate MCP message
   */
  public validateMessage(message: MCPMessage): boolean {
    try {
      // Basic structure validation
      if (!message.id || !message.type || !message.timestamp || !message.version || !message.source) {
        return false;
      }

      // Version compatibility check
      if (!this.isVersionCompatible(message.version)) {
        return false;
      }

      // Message size validation
      const messageSize = JSON.stringify(message).length;
      if (messageSize > this.config.maxMessageSize) {
        return false;
      }

      // Type-specific validation
      switch (message.type) {
        case MCPMessageType.REQUEST:
          return this.validateRequestMessage(message as MCPRequestMessage);
        case MCPMessageType.RESPONSE:
          return this.validateResponseMessage(message as MCPResponseMessage);
        case MCPMessageType.NOTIFICATION:
          return this.validateNotificationMessage(message as MCPNotificationMessage);
        default:
          return true;
      }
    } catch (error) {
      this.emit('error', new Error(`Message validation failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Process incoming message
   */
  public async processMessage(message: MCPMessage): Promise<void> {
    if (!this.validateMessage(message)) {
      this.emit('error', new Error('Invalid message received'));
      return;
    }

    this.emit('message', message);

    switch (message.type) {
      case MCPMessageType.REQUEST:
        await this.handleRequest(message as MCPRequestMessage);
        break;
      case MCPMessageType.RESPONSE:
        await this.handleResponse(message as MCPResponseMessage);
        break;
      case MCPMessageType.NOTIFICATION:
        await this.handleNotification(message as MCPNotificationMessage);
        break;
      default:
        this.emit('error', new Error(`Unknown message type: ${message.type}`));
    }
  }

  /**
   * Register message handler
   */
  public registerHandler(method: string, handler: Function): void {
    if (!this.messageHandlers.has(method)) {
      this.messageHandlers.set(method, []);
    }
    this.messageHandlers.get(method)!.push(handler);
  }

  /**
   * Unregister message handler
   */
  public unregisterHandler(method: string, handler: Function): void {
    const handlers = this.messageHandlers.get(method);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get protocol configuration
   */
  public getConfig(): MCPProtocolConfig {
    return { ...this.config };
  }

  /**
   * Get connection state
   */
  public getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Set connection state
   */
  public setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'error'): void {
    this.connectionState = state;
    this.emit('connection-state-changed', state);
  }

  /**
   * Get active message count
   */
  public getActiveMessageCount(): number {
    return this.activeMessages.size;
  }

  /**
   * Cleanup expired messages
   */
  public cleanupExpiredMessages(): void {
    const now = Date.now();
    const expiredMessages: string[] = [];

    this.activeMessages.forEach((message, id) => {
      const timeout = message.timeout || this.config.defaultTimeout;
      if (now - message.timestamp > timeout) {
        expiredMessages.push(id);
      }
    });

    expiredMessages.forEach(id => {
      this.activeMessages.delete(id);
      this.emit('message-expired', id);
    });
  }

  /**
   * Destroy protocol instance
   */
  public destroy(): void {
    this.activeMessages.clear();
    this.messageHandlers.clear();
    this.removeAllListeners();
    this.connectionState = 'disconnected';
  }

  // Private methods

  private isVersionCompatible(version: string): boolean {
    // Simple version compatibility check
    return version.startsWith('1.');
  }

  private validateRequestMessage(message: MCPRequestMessage): boolean {
    return !!message.method && !!message.params;
  }

  private validateResponseMessage(message: MCPResponseMessage): boolean {
    return !!message.requestId && !!message.status;
  }

  private validateNotificationMessage(message: MCPNotificationMessage): boolean {
    return !!message.event && message.data !== undefined;
  }

  private async handleRequest(message: MCPRequestMessage): Promise<void> {
    const handlers = this.messageHandlers.get(message.method) || [];
    
    if (handlers.length === 0) {
      const errorResponse = this.createResponse(
        message.id,
        MCPStatusCode.METHOD_NOT_ALLOWED,
        undefined,
        {
          code: MCPStatusCode.METHOD_NOT_ALLOWED,
          message: `No handlers registered for method: ${message.method}`
        }
      );
      this.emit('response', errorResponse);
      return;
    }

    try {
      for (const handler of handlers) {
        await handler(message);
      }
    } catch (error) {
      const errorResponse = this.createResponse(
        message.id,
        MCPStatusCode.INTERNAL_ERROR,
        undefined,
        {
          code: MCPStatusCode.INTERNAL_ERROR,
          message: error.message,
          stack: error.stack
        }
      );
      this.emit('response', errorResponse);
    }
  }

  private async handleResponse(message: MCPResponseMessage): Promise<void> {
    // Remove request from active messages
    this.activeMessages.delete(message.requestId);
    this.emit('response', message);
  }

  private async handleNotification(message: MCPNotificationMessage): Promise<void> {
    const handlers = this.messageHandlers.get(message.event) || [];
    
    try {
      for (const handler of handlers) {
        await handler(message);
      }
    } catch (error) {
      this.emit('error', new Error(`Notification handling failed: ${error.message}`));
    }
  }
}

/**
 * Default protocol instance
 */
export const defaultMCPProtocol = new MCPProtocol();