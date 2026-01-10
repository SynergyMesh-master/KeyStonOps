/**
 * MCP Event Emitter - High-performance event system
 * 
 * Provides efficient event handling with:
 * - <1ms event emission (p99)
 * - Wildcard pattern matching
 * - Event filtering and transformation
 * - Memory-efficient listener management
 */

import { performance } from 'perf_hooks';

export interface EventData {
  type: string;
  data: any;
  timestamp: number;
  source?: string;
  id?: string;
  metadata?: Record<string, any>;
}

export interface EventHandler {
  (event: EventData): void | Promise<void>;
}

export interface EventSubscription {
  id: string;
  pattern: string;
  handler: EventHandler;
  filter?: (event: EventData) => boolean;
  once?: boolean;
  priority?: number;
  maxCalls?: number;
  callCount?: number;
}

export interface EventEmitterConfig {
  maxListeners?: number;
  enableMetrics?: boolean;
  enableProfiling?: boolean;
  maxEventHistory?: number;
  enableThrottling?: boolean;
  throttleRate?: number;
}

export interface EventEmitterMetrics {
  eventsEmitted: number;
  eventsProcessed: number;
  averageEmissionTime: number;
  listenerCount: number;
  errorCount: number;
  throughputPerSecond: number;
}

/**
 * High-performance event emitter for MCP communication
 */
export class MCPEventEmitter {
  private subscriptions = new Map<string, EventSubscription[]>();
  private listeners = new Map<string, Set<EventHandler>>();
  private metrics: EventEmitterMetrics = {
    eventsEmitted: 0,
    eventsProcessed: 0,
    averageEmissionTime: 0,
    listenerCount: 0,
    errorCount: 0,
    throughputPerSecond: 0
  };
  private emissionTimes: number[] = [];
  private lastMetricsTime = Date.now();
  private eventHistory: EventData[] = [];
  private throttleMap = new Map<string, number>();

  constructor(private config: EventEmitterConfig = {}) {
    this.config = {
      maxListeners: 1000,
      enableMetrics: true,
      enableProfiling: false,
      maxEventHistory: 1000,
      enableThrottling: false,
      throttleRate: 100,
      ...config
    };

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Emit an event
   */
  async emit(eventType: string, data: any, options: {
    source?: string;
    metadata?: Record<string, any>;
  } = {}): Promise<string> {
    const startTime = performance.now();
    
    const event: EventData = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source: options.source,
      id: this.generateEventId(),
      metadata: options.metadata
    };

    try {
      // Check throttling
      if (this.config.enableThrottling && this.isThrottled(eventType)) {
        return event.id;
      }

      // Store event in history
      if (this.config.maxEventHistory && this.config.maxEventHistory > 0) {
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.config.maxEventHistory) {
          this.eventHistory.shift();
        }
      }

      // Process subscriptions
      await this.processSubscriptions(event);
      
      // Process direct listeners
      await this.processListeners(event);

      // Update metrics
      const emissionTime = performance.now() - startTime;
      this.updateMetrics(emissionTime);
      
      return event.id;
      
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  /**
   * Subscribe to events using pattern matching
   */
  on(pattern: string, handler: EventHandler, options: {
    filter?: (event: EventData) => boolean;
    priority?: number;
    maxCalls?: number;
  } = {}): string {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      pattern,
      handler,
      filter: options.filter,
      priority: options.priority || 0,
      maxCalls: options.maxCalls,
      callCount: 0,
      once: false
    };

    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, []);
    }
    
    this.subscriptions.get(pattern)!.push(subscription);
    this.metrics.listenerCount++;
    
    return subscription.id;
  }

  /**
   * Subscribe to events once (auto-unsubscribe after first call)
   */
  once(pattern: string, handler: EventHandler, options: {
    filter?: (event: EventData) => boolean;
    priority?: number;
  } = {}): string {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      pattern,
      handler,
      filter: options.filter,
      priority: options.priority || 0,
      callCount: 0,
      once: true
    };

    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, []);
    }
    
    this.subscriptions.get(pattern)!.push(subscription);
    this.metrics.listenerCount++;
    
    return subscription.id;
  }

  /**
   * Subscribe to exact event type (more performant than pattern matching)
   */
  addListener(eventType: string, handler: EventHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    const listeners = this.listeners.get(eventType)!;
    
    // Check max listeners limit
    if (listeners.size >= (this.config.maxListeners || 1000)) {
      throw new Error(`Maximum listeners (${this.config.maxListeners}) exceeded for event: ${eventType}`);
    }
    
    listeners.add(handler);
    this.metrics.listenerCount++;
  }

  /**
   * Remove listener
   */
  removeListener(eventType: string, handler: EventHandler): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
      this.metrics.listenerCount = Math.max(0, this.metrics.listenerCount - 1);
    }
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        this.metrics.listenerCount = Math.max(0, this.metrics.listenerCount - listeners.size);
        this.listeners.delete(eventType);
      }
    } else {
      this.metrics.listenerCount = 0;
      this.listeners.clear();
      this.subscriptions.clear();
    }
  }

  /**
   * Unsubscribe by subscription ID
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [pattern, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(pattern);
        }
        this.metrics.listenerCount = Math.max(0, this.metrics.listenerCount - 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Get event history
   */
  getEventHistory(eventType?: string, limit?: number): EventData[] {
    let history = this.eventHistory;
    
    if (eventType) {
      history = history.filter(event => event.type === eventType);
    }
    
    if (limit && limit > 0) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Get current metrics
   */
  getMetrics(): EventEmitterMetrics {
    return { ...this.metrics };
  }

  /**
   * Get listener count for specific event type
   */
  getListenerCount(eventType?: string): number {
    if (eventType) {
      const directListeners = this.listeners.get(eventType)?.size || 0;
      const patternListeners = Array.from(this.subscriptions.values())
        .flat()
        .filter(sub => this.matchesPattern(eventType, sub.pattern)).length;
      return directListeners + patternListeners;
    }
    return this.metrics.listenerCount;
  }

  /**
   * Check if event type has listeners
   */
  hasListeners(eventType: string): boolean {
    return this.getListenerCount(eventType) > 0;
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): Array<{ pattern: string; count: number }> {
    return Array.from(this.subscriptions.entries()).map(([pattern, subs]) => ({
      pattern,
      count: subs.length
    }));
  }

  /**
   * Clear all data and reset metrics
   */
  reset(): void {
    this.subscriptions.clear();
    this.listeners.clear();
    this.eventHistory = [];
    this.throttleMap.clear();
    this.metrics = {
      eventsEmitted: 0,
      eventsProcessed: 0,
      averageEmissionTime: 0,
      listenerCount: 0,
      errorCount: 0,
      throughputPerSecond: 0
    };
    this.emissionTimes = [];
  }

  private async processSubscriptions(event: EventData): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [pattern, subscriptions] of this.subscriptions.entries()) {
      if (this.matchesPattern(event.type, pattern)) {
        for (const subscription of subscriptions) {
          // Apply filter
          if (subscription.filter && !subscription.filter(event)) {
            continue;
          }
          
          // Check max calls
          if (subscription.maxCalls && 
              subscription.callCount && 
              subscription.callCount >= subscription.maxCalls) {
            continue;
          }
          
          promises.push(this.executeSubscription(subscription, event));
        }
      }
    }
    
    await Promise.allSettled(promises);
  }

  private async processListeners(event: EventData): Promise<void> {
    const listeners = this.listeners.get(event.type);
    if (!listeners) return;
    
    const promises: Promise<void>[] = [];
    
    for (const handler of listeners) {
      promises.push(this.executeHandler(handler, event));
    }
    
    await Promise.allSettled(promises);
  }

  private async executeSubscription(subscription: EventSubscription, event: EventData): Promise<void> {
    try {
      await subscription.handler(event);
      
      subscription.callCount = (subscription.callCount || 0) + 1;
      this.metrics.eventsProcessed++;
      
      // Remove once subscriptions
      if (subscription.once) {
        this.unsubscribe(subscription.id);
      }
      
      // Remove max call subscriptions
      if (subscription.maxCalls && 
          subscription.callCount >= subscription.maxCalls) {
        this.unsubscribe(subscription.id);
      }
      
    } catch (error) {
      this.metrics.errorCount++;
      console.error(`Error in event subscription ${subscription.id}:`, error);
    }
  }

  private async executeHandler(handler: EventHandler, event: EventData): Promise<void> {
    try {
      await handler(event);
      this.metrics.eventsProcessed++;
    } catch (error) {
      this.metrics.errorCount++;
      console.error(`Error in event handler for ${event.type}:`, error);
    }
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;
    
    // Support wildcard patterns like "user.*" or "*.created"
    const patternParts = pattern.split('.');
    const eventParts = eventType.split('.');
    
    if (patternParts.length !== eventParts.length) {
      // Handle patterns like "*" or "*.*"
      if (pattern === '**' || pattern === '*.*') return true;
      return false;
    }
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '*' && patternParts[i] !== eventParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  private isThrottled(eventType: string): boolean {
    const now = Date.now();
    const lastTime = this.throttleMap.get(eventType) || 0;
    const throttleRate = this.config.throttleRate || 100;
    
    if (now - lastTime < (1000 / throttleRate)) {
      return true;
    }
    
    this.throttleMap.set(eventType, now);
    return false;
  }

  private updateMetrics(emissionTime: number): void {
    this.emissionTimes.push(emissionTime);
    
    // Keep only last 1000 measurements
    if (this.emissionTimes.length > 1000) {
      this.emissionTimes.shift();
    }
    
    this.metrics.averageEmissionTime = 
      this.emissionTimes.reduce((a, b) => a + b, 0) / this.emissionTimes.length;
    
    this.metrics.eventsEmitted++;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - this.lastMetricsTime) / 1000;
      
      this.metrics.throughputPerSecond = this.metrics.eventsEmitted / timeDiff;
      this.lastMetricsTime = now;
    }, 5000);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}