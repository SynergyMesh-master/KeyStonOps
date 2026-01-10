/**
 * MCP Message Handler
 * 
 * Advanced message processing with routing, filtering, transformation,
 * and comprehensive error handling for MCP protocol messages.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { MCPMessage, MCPRequestMessage, MCPResponseMessage, MCPNotificationMessage, MCPMessageType } from './mcp-protocol';

/**
 * Message Handler Configuration
 */
export interface MessageHandlerConfig {
  maxConcurrentMessages: number;
  messageTimeout: number;
  enableRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  enablePrioritization: boolean;
  enableFiltering: boolean;
  enableTransformation: boolean;
}

/**
 * Message Filter Function
 */
export type MessageFilter = (message: MCPMessage) => boolean;

/**
 * Message Transformer Function
 */
export type MessageTransformer = (message: MCPMessage) => MCPMessage | Promise<MCPMessage>;

/**
 * Message Handler Function
 */
export type MessageHandlerFunction = (message: MCPMessage) => Promise<void | MCPMessage>;

/**
 * Message Priority
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Handler Statistics
 */
export interface HandlerStatistics {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageProcessingTime: number;
  messagesPerSecond: number;
  activeHandlers: number;
  queuedMessages: number;
}

/**
 * Enhanced Message Handler
 */
export class MCPMessageHandler extends EventEmitter {
  private config: MessageHandlerConfig;
  private handlers: Map<string, MessageHandlerFunction[]> = new Map();
  private filters: MessageFilter[] = [];
  private transformers: MessageTransformer[] = [];
  private messageQueue: MCPMessage[] = [];
  private activeHandlers: Set<string> = new Set();
  private statistics: HandlerStatistics = {
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    averageProcessingTime: 0,
    messagesPerSecond: 0,
    activeHandlers: 0,
    queuedMessages: 0
  };
  private processingTimes: number[] = [];
  private lastSecondMessages: number[] = [];
  private isProcessing: boolean = false;

  constructor(config?: Partial<MessageHandlerConfig>) {
    super();
    
    this.config = {
      maxConcurrentMessages: 100,
      messageTimeout: 30000,
      enableRetry: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      enablePrioritization: true,
      enableFiltering: true,
      enableTransformation: true,
      ...config
    };

    // Start processing loop
    this.startProcessingLoop();
    this.startStatisticsCollection();
  }

  /**
   * Register a message handler
   */
  public registerHandler(type: string | MCPMessageType, handler: MessageHandlerFunction): void {
    const key = typeof type === 'string' ? type : type;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key)!.push(handler);
    this.emit('handler-registered', { type: key, handler });
  }

  /**
   * Unregister a message handler
   */
  public unregisterHandler(type: string | MCPMessageType, handler: MessageHandlerFunction): void {
    const key = typeof type === 'string' ? type : type;
    const handlers = this.handlers.get(key);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.emit('handler-unregistered', { type: key, handler });
      }
    }
  }

  /**
   * Add message filter
   */
  public addFilter(filter: MessageFilter): void {
    if (this.config.enableFiltering) {
      this.filters.push(filter);
      this.emit('filter-added', filter);
    }
  }

  /**
   * Remove message filter
   */
  public removeFilter(filter: MessageFilter): void {
    const index = this.filters.indexOf(filter);
    if (index > -1) {
      this.filters.splice(index, 1);
      this.emit('filter-removed', filter);
    }
  }

  /**
   * Add message transformer
   */
  public addTransformer(transformer: MessageTransformer): void {
    if (this.config.enableTransformation) {
      this.transformers.push(transformer);
      this.emit('transformer-added', transformer);
    }
  }

  /**
   * Remove message transformer
   */
  public removeTransformer(transformer: MessageTransformer): void {
    const index = this.transformers.indexOf(transformer);
    if (index > -1) {
      this.transformers.splice(index, 1);
      this.emit('transformer-removed', transformer);
    }
  }

  /**
   * Handle incoming message
   */
  public async handleMessage(message: MCPMessage): Promise<void> {
    // Update statistics
    this.statistics.totalMessages++;
    this.updateMessagesPerSecond();

    try {
      // Apply filters
      if (!this.applyFilters(message)) {
        this.emit('message-filtered', message);
        return;
      }

      // Apply transformations
      const transformedMessage = await this.applyTransformations(message);

      // Add to queue for processing
      this.enqueueMessage(transformedMessage);

    } catch (error) {
      this.statistics.failedMessages++;
      this.emit('message-error', { message, error });
    }
  }

  /**
   * Get handler statistics
   */
  public getStatistics(): HandlerStatistics {
    return {
      ...this.statistics,
      activeHandlers: this.activeHandlers.size,
      queuedMessages: this.messageQueue.length
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): MessageHandlerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<MessageHandlerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config-updated', this.config);
  }

  /**
   * Clear all handlers
   */
  public clearHandlers(): void {
    this.handlers.clear();
    this.emit('handlers-cleared');
  }

  /**
   * Clear all filters
   */
  public clearFilters(): void {
    this.filters = [];
    this.emit('filters-cleared');
  }

  /**
   * Clear all transformers
   */
  public clearTransformers(): void {
    this.transformers = [];
    this.emit('transformers-cleared');
  }

  /**
   * Destroy message handler
   */
  public destroy(): void {
    this.isProcessing = false;
    this.handlers.clear();
    this.filters = [];
    this.transformers = [];
    this.messageQueue = [];
    this.activeHandlers.clear();
    this.removeAllListeners();
  }

  // Private methods

  private enqueueMessage(message: MCPMessage): void {
    if (this.config.enablePrioritization) {
      this.insertByPriority(message);
    } else {
      this.messageQueue.push(message);
    }
    
    this.statistics.queuedMessages = this.messageQueue.length;
    this.emit('message-queued', message);
  }

  private insertByPriority(message: MCPMessage): void {
    const priority = this.getMessagePriority(message);
    let inserted = false;

    for (let i = 0; i < this.messageQueue.length; i++) {
      if (priority > this.getMessagePriority(this.messageQueue[i])) {
        this.messageQueue.splice(i, 0, message);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.messageQueue.push(message);
    }
  }

  private getMessagePriority(message: MCPMessage): MessagePriority {
    if (message.type === MCPMessageType.ERROR) {
      return MessagePriority.CRITICAL;
    }
    
    if (message.type === MCPMessageType.REQUEST) {
      const request = message as MCPRequestMessage;
      return request.priority || MessagePriority.NORMAL;
    }

    return MessagePriority.NORMAL;
  }

  private applyFilters(message: MCPMessage): boolean {
    for (const filter of this.filters) {
      try {
        if (!filter(message)) {
          return false;
        }
      } catch (error) {
        this.emit('filter-error', { filter, error });
        return false;
      }
    }
    return true;
  }

  private async applyTransformations(message: MCPMessage): Promise<MCPMessage> {
    let transformedMessage = message;

    for (const transformer of this.transformers) {
      try {
        transformedMessage = await transformer(transformedMessage);
      } catch (error) {
        this.emit('transformer-error', { transformer, error });
        throw error;
      }
    }

    return transformedMessage;
  }

  private async startProcessingLoop(): Promise<void> {
    this.isProcessing = true;

    while (this.isProcessing) {
      if (this.messageQueue.length > 0 && this.activeHandlers.size < this.config.maxConcurrentMessages) {
        const message = this.messageQueue.shift()!;
        this.processMessage(message);
      }

      await new Promise(resolve => setTimeout(resolve, 1)); // Small delay to prevent busy waiting
    }
  }

  private async processMessage(message: MCPMessage): Promise<void> {
    const startTime = Date.now();
    const messageId = message.id;
    
    this.activeHandlers.add(messageId);
    this.statistics.activeHandlers = this.activeHandlers.size;

    try {
      const handlers = this.handlers.get(message.type) || [];
      
      for (const handler of handlers) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Message processing timeout')), this.config.messageTimeout);
        });

        await Promise.race([
          handler(message),
          timeoutPromise
        ]);
      }

      this.statistics.successfulMessages++;
      this.emit('message-processed', message);

    } catch (error) {
      this.statistics.failedMessages++;
      
      if (this.config.enableRetry) {
        await this.retryMessage(message, error);
      } else {
        this.emit('message-processing-failed', { message, error });
      }
    } finally {
      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);
      
      this.activeHandlers.delete(messageId);
      this.statistics.activeHandlers = this.activeHandlers.size;
      this.statistics.queuedMessages = this.messageQueue.length;
    }
  }

  private async retryMessage(message: MCPMessage, originalError: Error): Promise<void> {
    let retryCount = 0;
    
    while (retryCount < this.config.maxRetryAttempts) {
      retryCount++;
      
      try {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * retryCount));
        
        const handlers = this.handlers.get(message.type) || [];
        for (const handler of handlers) {
          await handler(message);
        }
        
        this.statistics.successfulMessages++;
        this.emit('message-retry-success', { message, retryCount });
        return;
        
      } catch (error) {
        if (retryCount >= this.config.maxRetryAttempts) {
          this.emit('message-retry-failed', { message, retryCount, originalError });
          break;
        }
      }
    }
    
    this.statistics.failedMessages++;
  }

  private updateProcessingTime(time: number): void {
    this.processingTimes.push(time);
    
    // Keep only last 100 processing times for average calculation
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    this.statistics.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  private updateMessagesPerSecond(): void {
    const now = Math.floor(Date.now() / 1000);
    this.lastSecondMessages.push(now);
    
    // Remove messages older than 1 second
    const cutoff = now - 1;
    while (this.lastSecondMessages.length > 0 && this.lastSecondMessages[0] <= cutoff) {
      this.lastSecondMessages.shift();
    }
    
    this.statistics.messagesPerSecond = this.lastSecondMessages.length;
  }

  private startStatisticsCollection(): void {
    setInterval(() => {
      this.emit('statistics-updated', this.getStatistics());
    }, 1000);
  }
}

/**
 * Default message handler instance
 */
export const defaultMessageHandler = new MCPMessageHandler();