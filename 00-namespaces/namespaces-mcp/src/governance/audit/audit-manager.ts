/**
 * Audit Manager - Comprehensive audit trail management
 * 
 * Provides audit event logging, trail storage and retrieval,
 * report generation, and compliance audit support.
 * 
 * @module governance/audit/audit-manager
 */

import { EventEmitter } from 'events';

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication & Authorization
  LOGIN = 'login',
  LOGOUT = 'logout',
  AUTH_FAILURE = 'auth_failure',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  
  // Resource Operations
  RESOURCE_CREATED = 'resource_created',
  RESOURCE_READ = 'resource_read',
  RESOURCE_UPDATED = 'resource_updated',
  RESOURCE_DELETED = 'resource_deleted',
  
  // Configuration Changes
  CONFIG_CHANGED = 'config_changed',
  POLICY_CHANGED = 'policy_changed',
  RULE_CHANGED = 'rule_changed',
  
  // Security Events
  SECURITY_VIOLATION = 'security_violation',
  ENCRYPTION_ENABLED = 'encryption_enabled',
  ENCRYPTION_DISABLED = 'encryption_disabled',
  
  // Compliance Events
  COMPLIANCE_SCAN = 'compliance_scan',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  COMPLIANCE_RESOLVED = 'compliance_resolved',
  
  // System Events
  SYSTEM_START = 'system_start',
  SYSTEM_STOP = 'system_stop',
  SYSTEM_ERROR = 'system_error',
  
  // Custom Events
  CUSTOM = 'custom'
}

/**
 * Audit event severity
 */
export enum AuditSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Audit event status
 */
export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending'
}

/**
 * Audit event
 */
export interface AuditEvent {
  id: string;
  type: AuditEventType;
  severity: AuditSeverity;
  status: AuditStatus;
  timestamp: Date;
  actor: {
    id: string;
    type: string;
    name?: string;
    ip?: string;
  };
  resource: {
    id: string;
    type: string;
    name?: string;
  };
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  changes?: {
    before?: unknown;
    after?: unknown;
  };
  context?: {
    sessionId?: string;
    requestId?: string;
    environment?: string;
    location?: string;
  };
}

/**
 * Audit trail query
 */
export interface AuditQuery {
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  statuses?: AuditStatus[];
  actorIds?: string[];
  resourceIds?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit report
 */
export interface AuditReport {
  reportId: string;
  title: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    eventsByStatus: Record<AuditStatus, number>;
    topActors: Array<{ actorId: string; count: number }>;
    topResources: Array<{ resourceId: string; count: number }>;
  };
  events: AuditEvent[];
  insights: string[];
  generatedAt: Date;
  generatedBy: string;
}

/**
 * Audit retention policy
 */
export interface AuditRetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  archiveEnabled: boolean;
  archivePath?: string;
  compressionEnabled: boolean;
}

/**
 * Audit manager configuration
 */
export interface AuditManagerConfig {
  enableEncryption?: boolean;
  enableCompression?: boolean;
  enableRealTimeAlerts?: boolean;
  retentionPolicy?: AuditRetentionPolicy;
  maxEventsInMemory?: number;
  flushInterval?: number;
}

/**
 * Audit Manager
 * 
 * Manages audit events, trails, and reporting
 */
export class AuditManager extends EventEmitter {
  private events: Map<string, AuditEvent> = new Map();
  private config: Required<AuditManagerConfig>;
  private flushTimer?: NodeJS.Timeout;
  private eventBuffer: AuditEvent[] = [];

  constructor(config: AuditManagerConfig = {}) {
    super();
    this.config = {
      enableEncryption: config.enableEncryption ?? false,
      enableCompression: config.enableCompression ?? true,
      enableRealTimeAlerts: config.enableRealTimeAlerts ?? true,
      retentionPolicy: config.retentionPolicy ?? {
        enabled: true,
        retentionDays: 90,
        archiveEnabled: true,
        compressionEnabled: true
      },
      maxEventsInMemory: config.maxEventsInMemory ?? 10000,
      flushInterval: config.flushInterval ?? 60000 // 1 minute
    };

    this.startFlushTimer();
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Validate event
    this.validateEvent(auditEvent);

    // Store event
    this.events.set(auditEvent.id, auditEvent);
    this.eventBuffer.push(auditEvent);

    // Check memory limit
    if (this.events.size > this.config.maxEventsInMemory) {
      await this.flush();
    }

    // Emit real-time alert if enabled
    if (this.config.enableRealTimeAlerts && this.shouldAlert(auditEvent)) {
      this.emit('audit:alert', { event: auditEvent });
    }

    // Emit event
    this.emit('audit:logged', { event: auditEvent });

    return auditEvent;
  }

  /**
   * Log multiple events
   */
  async logEvents(events: Array<Omit<AuditEvent, 'id' | 'timestamp'>>): Promise<AuditEvent[]> {
    const auditEvents: AuditEvent[] = [];

    for (const event of events) {
      const auditEvent = await this.logEvent(event);
      auditEvents.push(auditEvent);
    }

    return auditEvents;
  }

  /**
   * Query audit trail
   */
  async query(query: AuditQuery = {}): Promise<AuditEvent[]> {
    let events = Array.from(this.events.values());

    // Filter by event types
    if (query.eventTypes && query.eventTypes.length > 0) {
      events = events.filter(e => query.eventTypes!.includes(e.type));
    }

    // Filter by severities
    if (query.severities && query.severities.length > 0) {
      events = events.filter(e => query.severities!.includes(e.severity));
    }

    // Filter by statuses
    if (query.statuses && query.statuses.length > 0) {
      events = events.filter(e => query.statuses!.includes(e.status));
    }

    // Filter by actor IDs
    if (query.actorIds && query.actorIds.length > 0) {
      events = events.filter(e => query.actorIds!.includes(e.actor.id));
    }

    // Filter by resource IDs
    if (query.resourceIds && query.resourceIds.length > 0) {
      events = events.filter(e => query.resourceIds!.includes(e.resource.id));
    }

    // Filter by date range
    if (query.startDate) {
      events = events.filter(e => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      events = events.filter(e => e.timestamp <= query.endDate!);
    }

    // Sort events
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    events.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortBy === 'severity') {
        const severityOrder = {
          [AuditSeverity.DEBUG]: 1,
          [AuditSeverity.INFO]: 2,
          [AuditSeverity.WARNING]: 3,
          [AuditSeverity.ERROR]: 4,
          [AuditSeverity.CRITICAL]: 5
        };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || events.length;
    events = events.slice(offset, offset + limit);

    return events;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): AuditEvent | undefined {
    return this.events.get(eventId);
  }

  /**
   * Generate audit report
   */
  async generateReport(
    query: AuditQuery = {},
    generatedBy: string = 'system'
  ): Promise<AuditReport> {
    const reportId = this.generateReportId();
    const events = await this.query(query);

    // Calculate summary statistics
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const eventsByStatus: Record<string, number> = {};
    const actorCounts = new Map<string, number>();
    const resourceCounts = new Map<string, number>();

    for (const event of events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

      // Count by status
      eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1;

      // Count by actor
      actorCounts.set(event.actor.id, (actorCounts.get(event.actor.id) || 0) + 1);

      // Count by resource
      resourceCounts.set(event.resource.id, (resourceCounts.get(event.resource.id) || 0) + 1);
    }

    // Get top actors
    const topActors = Array.from(actorCounts.entries())
      .map(([actorId, count]) => ({ actorId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get top resources
    const topResources = Array.from(resourceCounts.entries())
      .map(([resourceId, count]) => ({ resourceId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate insights
    const insights = this.generateInsights(events, eventsByType, eventsBySeverity);

    const report: AuditReport = {
      reportId,
      title: `Audit Report - ${new Date().toISOString()}`,
      period: {
        start: query.startDate || new Date(0),
        end: query.endDate || new Date()
      },
      summary: {
        totalEvents: events.length,
        eventsByType: eventsByType as Record<AuditEventType, number>,
        eventsBySeverity: eventsBySeverity as Record<AuditSeverity, number>,
        eventsByStatus: eventsByStatus as Record<AuditStatus, number>,
        topActors,
        topResources
      },
      events,
      insights,
      generatedAt: new Date(),
      generatedBy
    };

    this.emit('report:generated', { report });

    return report;
  }

  /**
   * Export audit trail
   */
  async export(
    query: AuditQuery = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const events = await this.query(query);

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(events);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Archive old events
   */
  async archive(): Promise<number> {
    if (!this.config.retentionPolicy.enabled) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPolicy.retentionDays);

    const eventsToArchive = Array.from(this.events.values())
      .filter(e => e.timestamp < cutoffDate);

    // Archive events (implementation depends on storage backend)
    for (const event of eventsToArchive) {
      this.events.delete(event.id);
    }

    this.emit('audit:archived', { count: eventsToArchive.length });

    return eventsToArchive.length;
  }

  /**
   * Flush event buffer to storage
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    // Emit flush event (storage backend can listen to this)
    this.emit('audit:flush', { events: eventsToFlush });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        this.emit('error', error);
      });
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Validate audit event
   */
  private validateEvent(event: AuditEvent): void {
    if (!event.id || !event.type || !event.timestamp) {
      throw new Error('Invalid audit event: missing required fields');
    }

    if (!event.actor || !event.actor.id) {
      throw new Error('Invalid audit event: missing actor information');
    }

    if (!event.resource || !event.resource.id) {
      throw new Error('Invalid audit event: missing resource information');
    }
  }

  /**
   * Check if event should trigger alert
   */
  private shouldAlert(event: AuditEvent): boolean {
    // Alert on critical severity
    if (event.severity === AuditSeverity.CRITICAL) {
      return true;
    }

    // Alert on security violations
    if (event.type === AuditEventType.SECURITY_VIOLATION) {
      return true;
    }

    // Alert on authentication failures
    if (event.type === AuditEventType.AUTH_FAILURE) {
      return true;
    }

    return false;
  }

  /**
   * Generate insights from events
   */
  private generateInsights(
    events: AuditEvent[],
    eventsByType: Record<string, number>,
    eventsBySeverity: Record<string, number>
  ): string[] {
    const insights: string[] = [];

    // Check for high error rate
    const errorCount = (eventsBySeverity[AuditSeverity.ERROR] || 0) +
                      (eventsBySeverity[AuditSeverity.CRITICAL] || 0);
    const errorRate = events.length > 0 ? (errorCount / events.length) * 100 : 0;

    if (errorRate > 10) {
      insights.push(`High error rate detected: ${errorRate.toFixed(2)}%`);
    }

    // Check for authentication failures
    const authFailures = eventsByType[AuditEventType.AUTH_FAILURE] || 0;
    if (authFailures > 10) {
      insights.push(`Multiple authentication failures detected: ${authFailures}`);
    }

    // Check for security violations
    const securityViolations = eventsByType[AuditEventType.SECURITY_VIOLATION] || 0;
    if (securityViolations > 0) {
      insights.push(`Security violations detected: ${securityViolations}`);
    }

    return insights;
  }

  /**
   * Convert events to CSV format
   */
  private convertToCSV(events: AuditEvent[]): string {
    const headers = [
      'ID', 'Type', 'Severity', 'Status', 'Timestamp',
      'Actor ID', 'Actor Type', 'Resource ID', 'Resource Type',
      'Action', 'Description'
    ];

    const rows = events.map(e => [
      e.id,
      e.type,
      e.severity,
      e.status,
      e.timestamp.toISOString(),
      e.actor.id,
      e.actor.type,
      e.resource.id,
      e.resource.type,
      e.action,
      e.description
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get manager statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    bufferSize: number;
    memoryUsage: number;
  } {
    const events = Array.from(this.events.values());
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      bufferSize: this.eventBuffer.length,
      memoryUsage: this.events.size
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    this.removeAllListeners();
  }
}

/**
 * Create an audit manager instance
 */
export function createAuditManager(config?: AuditManagerConfig): AuditManager {
  return new AuditManager(config);
}

export default AuditManager;