/**
 * Audit Trail Capture
 * 
 * Implements audit logging for all sensitive and governance-relevant operations.
 */

/**
 * Audit event type
 */
export enum AuditEventType {
  SDK_INITIALIZED = 'sdk_initialized',
  SDK_SHUTDOWN = 'sdk_shutdown',
  TOOL_INVOKED = 'tool_invoked',
  TOOL_INVOCATION_FAILED = 'tool_invocation_failed',
  CREDENTIAL_ACCESSED = 'credential_accessed',
  CREDENTIAL_STORED = 'credential_stored',
  CREDENTIAL_DELETED = 'credential_deleted',
  CREDENTIAL_ROTATED = 'credential_rotated',
  PLUGIN_LOADED = 'plugin_loaded',
  PLUGIN_UNLOADED = 'plugin_unloaded',
  CONFIG_CHANGED = 'config_changed',
  SCHEMA_REGISTERED = 'schema_registered',
  ADAPTER_REGISTERED = 'adapter_registered',
  SECURITY_VIOLATION = 'security_violation',
  CUSTOM = 'custom'
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  /** Event ID */
  id?: string;
  /** Event type */
  event: string | AuditEventType;
  /** Timestamp */
  timestamp: Date;
  /** User/agent identifier */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Correlation ID */
  correlationId?: string;
  /** Tool name (for tool events) */
  toolName?: string;
  /** Service name */
  service?: string;
  /** Success status */
  success?: boolean;
  /** Duration in milliseconds */
  duration?: number;
  /** Error message */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
}

/**
 * Audit storage interface
 */
export interface AuditStorage {
  store(event: AuditEvent): Promise<void>;
  query(filter: AuditFilter): Promise<AuditEvent[]>;
  export(format: 'json' | 'csv'): Promise<string>;
  shutdown(): Promise<void>;
}

/**
 * Audit filter
 */
export interface AuditFilter {
  eventTypes?: (string | AuditEventType)[];
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  toolName?: string;
  service?: string;
  startTime?: Date;
  endTime?: Date;
  success?: boolean;
  limit?: number;
}

/**
 * In-memory audit storage
 */
export class InMemoryAuditStorage implements AuditStorage {
  private events: AuditEvent[];
  private maxEvents: number;

  constructor(maxEvents: number = 10000) {
    this.events = [];
    this.maxEvents = maxEvents;
  }

  async store(event: AuditEvent): Promise<void> {
    // Generate ID if not provided
    if (!event.id) {
      event.id = this.generateId();
    }

    this.events.push(event);

    // Trim if exceeds max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  async query(filter: AuditFilter): Promise<AuditEvent[]> {
    let results = [...this.events];

    // Apply filters
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      results = results.filter(e => filter.eventTypes!.includes(e.event));
    }

    if (filter.userId) {
      results = results.filter(e => e.userId === filter.userId);
    }

    if (filter.sessionId) {
      results = results.filter(e => e.sessionId === filter.sessionId);
    }

    if (filter.correlationId) {
      results = results.filter(e => e.correlationId === filter.correlationId);
    }

    if (filter.toolName) {
      results = results.filter(e => e.toolName === filter.toolName);
    }

    if (filter.service) {
      results = results.filter(e => e.service === filter.service);
    }

    if (filter.startTime) {
      results = results.filter(e => e.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter(e => e.timestamp <= filter.endTime!);
    }

    if (filter.success !== undefined) {
      results = results.filter(e => e.success === filter.success);
    }

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  async export(format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.events, null, 2);
    }

    // CSV export
    if (this.events.length === 0) {
      return '';
    }

    const headers = Object.keys(this.events[0]).join(',');
    const rows = this.events.map(event => {
      return Object.values(event).map(v => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  async shutdown(): Promise<void> {
    // No-op for in-memory storage
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getEventCount(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * File-based audit storage
 */
export class FileAuditStorage implements AuditStorage {
  private filePath: string;
  private buffer: AuditEvent[];
  private flushInterval: NodeJS.Timeout | null;

  constructor(filePath: string, flushIntervalMs: number = 5000) {
    this.filePath = filePath;
    this.buffer = [];
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }

  async store(event: AuditEvent): Promise<void> {
    if (!event.id) {
      event.id = this.generateId();
    }

    this.buffer.push(event);

    // Auto-flush on security violations
    if (event.event === AuditEventType.SECURITY_VIOLATION) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = this.buffer.splice(0);
    const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';

    // In a real implementation, this would write to file
    // const fs = require('fs/promises');
    // await fs.appendFile(this.filePath, lines);
  }

  async query(filter: AuditFilter): Promise<AuditEvent[]> {
    // In a real implementation, this would read and parse the file
    return [];
  }

  async export(format: 'json' | 'csv'): Promise<string> {
    // In a real implementation, this would read the entire file
    return '';
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  enabled?: boolean;
  storage?: AuditStorage;
  includeMetadata?: boolean;
  sanitizeSensitiveData?: boolean;
}

/**
 * Audit logger class
 */
export class AuditLogger {
  private config: AuditLoggerConfig;
  private storage: AuditStorage;

  constructor(config: AuditLoggerConfig = {}) {
    this.config = {
      enabled: true,
      includeMetadata: true,
      sanitizeSensitiveData: true,
      ...config
    };

    this.storage = config.storage || new InMemoryAuditStorage();
  }

  async initialize(): Promise<void> {
    // Initialize audit logger
  }

  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Sanitize sensitive data if enabled
    if (this.config.sanitizeSensitiveData) {
      event = this.sanitize(event);
    }

    // Ensure timestamp
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    await this.storage.store(event);
  }

  /**
   * Query audit events
   */
  async query(filter: AuditFilter): Promise<AuditEvent[]> {
    return this.storage.query(filter);
  }

  /**
   * Export audit trail
   */
  async export(format: 'json' | 'csv' = 'json'): Promise<string> {
    return this.storage.export(format);
  }

  /**
   * Sanitize sensitive data
   */
  private sanitize(event: AuditEvent): AuditEvent {
    const sanitized = { ...event };

    // Remove sensitive fields from metadata
    if (sanitized.metadata) {
      const { password, token, apiKey, secret, ...safeMetadata } = sanitized.metadata;
      sanitized.metadata = safeMetadata;
    }

    return sanitized;
  }

  /**
   * Get audit statistics
   */
  async getStats(): Promise<any> {
    const allEvents = await this.storage.query({});

    const total = allEvents.length;
    const successful = allEvents.filter(e => e.success === true).length;
    const failed = allEvents.filter(e => e.success === false).length;

    const byEventType: Record<string, number> = {};
    for (const event of allEvents) {
      byEventType[event.event] = (byEventType[event.event] || 0) + 1;
    }

    const byUser: Record<string, number> = {};
    for (const event of allEvents) {
      if (event.userId) {
        byUser[event.userId] = (byUser[event.userId] || 0) + 1;
      }
    }

    return {
      total,
      successful,
      failed,
      byEventType,
      byUser
    };
  }

  /**
   * Shutdown audit logger
   */
  async shutdown(): Promise<void> {
    await this.storage.shutdown();
  }
}