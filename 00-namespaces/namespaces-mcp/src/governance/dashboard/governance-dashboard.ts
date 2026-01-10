/**
 * Governance Dashboard - Governance visualization and reporting
 * 
 * Provides dashboard UI components, real-time governance metrics,
 * policy compliance visualization, and audit trail viewer.
 * 
 * @module governance/dashboard/governance-dashboard
 */

import { EventEmitter } from 'events';
import type { Policy, PolicyEvaluationResult } from '../policy/policy-engine';
import type { ComplianceScanResult, ComplianceViolation } from '../compliance/compliance-checker';
import type { AuditEvent, AuditReport } from '../audit/audit-manager';

/**
 * Dashboard widget types
 */
export enum WidgetType {
  METRIC = 'metric',
  CHART = 'chart',
  TABLE = 'table',
  TIMELINE = 'timeline',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
  LIST = 'list'
}

/**
 * Chart types
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  DONUT = 'donut'
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, unknown>;
  data?: unknown;
  refreshInterval?: number;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Governance metrics
 */
export interface GovernanceMetrics {
  timestamp: Date;
  policies: {
    total: number;
    enabled: number;
    evaluations: number;
    violations: number;
  };
  compliance: {
    score: number;
    totalRules: number;
    passedRules: number;
    failedRules: number;
    violations: number;
  };
  audit: {
    totalEvents: number;
    criticalEvents: number;
    securityEvents: number;
    recentEvents: number;
  };
}

/**
 * Dashboard data source
 */
export interface DashboardDataSource {
  id: string;
  name: string;
  type: 'policy' | 'compliance' | 'audit' | 'custom';
  query: () => Promise<unknown>;
  refreshInterval?: number;
}

/**
 * Dashboard alert
 */
export interface DashboardAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Dashboard configuration
 */
export interface GovernanceDashboardConfig {
  enableRealTimeUpdates?: boolean;
  refreshInterval?: number;
  maxAlerts?: number;
  enableNotifications?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * Governance Dashboard
 * 
 * Manages dashboard layouts, widgets, and real-time updates
 */
export class GovernanceDashboard extends EventEmitter {
  private layouts: Map<string, DashboardLayout> = new Map();
  private dataSources: Map<string, DashboardDataSource> = new Map();
  private alerts: Map<string, DashboardAlert> = new Map();
  private metrics: GovernanceMetrics[] = [];
  private config: Required<GovernanceDashboardConfig>;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: GovernanceDashboardConfig = {}) {
    super();
    this.config = {
      enableRealTimeUpdates: config.enableRealTimeUpdates ?? true,
      refreshInterval: config.refreshInterval ?? 30000, // 30 seconds
      maxAlerts: config.maxAlerts ?? 100,
      enableNotifications: config.enableNotifications ?? true,
      theme: config.theme ?? 'light'
    };

    if (this.config.enableRealTimeUpdates) {
      this.startRealTimeUpdates();
    }
  }

  /**
   * Create a new dashboard layout
   */
  async createLayout(layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>): Promise<DashboardLayout> {
    const dashboardLayout: DashboardLayout = {
      ...layout,
      id: this.generateLayoutId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.layouts.set(dashboardLayout.id, dashboardLayout);
    this.emit('layout:created', { layout: dashboardLayout });

    return dashboardLayout;
  }

  /**
   * Update a dashboard layout
   */
  async updateLayout(layoutId: string, updates: Partial<DashboardLayout>): Promise<DashboardLayout> {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Layout not found: ${layoutId}`);
    }

    const updatedLayout: DashboardLayout = {
      ...layout,
      ...updates,
      updatedAt: new Date()
    };

    this.layouts.set(layoutId, updatedLayout);
    this.emit('layout:updated', { layout: updatedLayout });

    return updatedLayout;
  }

  /**
   * Delete a dashboard layout
   */
  async deleteLayout(layoutId: string): Promise<void> {
    this.layouts.delete(layoutId);
    this.emit('layout:deleted', { layoutId });
  }

  /**
   * Get a dashboard layout
   */
  getLayout(layoutId: string): DashboardLayout | undefined {
    return this.layouts.get(layoutId);
  }

  /**
   * Get all dashboard layouts
   */
  getAllLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values());
  }

  /**
   * Add a widget to a layout
   */
  async addWidget(layoutId: string, widget: Omit<DashboardWidget, 'id'>): Promise<DashboardWidget> {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Layout not found: ${layoutId}`);
    }

    const dashboardWidget: DashboardWidget = {
      ...widget,
      id: this.generateWidgetId()
    };

    layout.widgets.push(dashboardWidget);
    layout.updatedAt = new Date();

    // Start refresh timer if needed
    if (dashboardWidget.refreshInterval) {
      this.startWidgetRefresh(dashboardWidget);
    }

    this.emit('widget:added', { layoutId, widget: dashboardWidget });

    return dashboardWidget;
  }

  /**
   * Remove a widget from a layout
   */
  async removeWidget(layoutId: string, widgetId: string): Promise<void> {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Layout not found: ${layoutId}`);
    }

    layout.widgets = layout.widgets.filter(w => w.id !== widgetId);
    layout.updatedAt = new Date();

    // Stop refresh timer
    this.stopWidgetRefresh(widgetId);

    this.emit('widget:removed', { layoutId, widgetId });
  }

  /**
   * Update widget data
   */
  async updateWidgetData(layoutId: string, widgetId: string, data: unknown): Promise<void> {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Layout not found: ${layoutId}`);
    }

    const widget = layout.widgets.find(w => w.id === widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    widget.data = data;
    this.emit('widget:updated', { layoutId, widgetId, data });
  }

  /**
   * Register a data source
   */
  async registerDataSource(dataSource: DashboardDataSource): Promise<void> {
    this.dataSources.set(dataSource.id, dataSource);
    this.emit('datasource:registered', { dataSource });
  }

  /**
   * Unregister a data source
   */
  async unregisterDataSource(dataSourceId: string): Promise<void> {
    this.dataSources.delete(dataSourceId);
    this.emit('datasource:unregistered', { dataSourceId });
  }

  /**
   * Query a data source
   */
  async queryDataSource(dataSourceId: string): Promise<unknown> {
    const dataSource = this.dataSources.get(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    return await dataSource.query();
  }

  /**
   * Update governance metrics
   */
  async updateMetrics(metrics: GovernanceMetrics): Promise<void> {
    this.metrics.push(metrics);

    // Keep only recent metrics (last 24 hours)
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);

    this.emit('metrics:updated', { metrics });
  }

  /**
   * Get current governance metrics
   */
  getCurrentMetrics(): GovernanceMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 24): GovernanceMetrics[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);
  }

  /**
   * Create an alert
   */
  async createAlert(alert: Omit<DashboardAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<DashboardAlert> {
    const dashboardAlert: DashboardAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(dashboardAlert.id, dashboardAlert);

    // Limit alerts
    if (this.alerts.size > this.config.maxAlerts) {
      const oldestAlert = Array.from(this.alerts.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
      this.alerts.delete(oldestAlert.id);
    }

    // Send notification if enabled
    if (this.config.enableNotifications) {
      this.emit('alert:created', { alert: dashboardAlert });
    }

    return dashboardAlert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.acknowledged = true;
    this.emit('alert:acknowledged', { alertId });
  }

  /**
   * Get alerts
   */
  getAlerts(acknowledged?: boolean): DashboardAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === acknowledged);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear acknowledged alerts
   */
  async clearAcknowledgedAlerts(): Promise<number> {
    const acknowledged = Array.from(this.alerts.values())
      .filter(a => a.acknowledged);

    for (const alert of acknowledged) {
      this.alerts.delete(alert.id);
    }

    this.emit('alerts:cleared', { count: acknowledged.length });

    return acknowledged.length;
  }

  /**
   * Generate policy compliance widget
   */
  createPolicyComplianceWidget(position: DashboardWidget['position']): Omit<DashboardWidget, 'id'> {
    return {
      type: WidgetType.GAUGE,
      title: 'Policy Compliance',
      description: 'Overall policy compliance score',
      position,
      config: {
        min: 0,
        max: 100,
        thresholds: [
          { value: 0, color: 'red' },
          { value: 50, color: 'yellow' },
          { value: 80, color: 'green' }
        ]
      },
      refreshInterval: 30000
    };
  }

  /**
   * Generate compliance violations widget
   */
  createComplianceViolationsWidget(position: DashboardWidget['position']): Omit<DashboardWidget, 'id'> {
    return {
      type: WidgetType.TABLE,
      title: 'Recent Compliance Violations',
      description: 'Latest compliance violations requiring attention',
      position,
      config: {
        columns: ['Rule', 'Severity', 'Status', 'Detected'],
        sortable: true,
        filterable: true
      },
      refreshInterval: 60000
    };
  }

  /**
   * Generate audit timeline widget
   */
  createAuditTimelineWidget(position: DashboardWidget['position']): Omit<DashboardWidget, 'id'> {
    return {
      type: WidgetType.TIMELINE,
      title: 'Audit Event Timeline',
      description: 'Recent audit events and activities',
      position,
      config: {
        maxEvents: 50,
        groupBy: 'type',
        showSeverity: true
      },
      refreshInterval: 30000
    };
  }

  /**
   * Generate metrics chart widget
   */
  createMetricsChartWidget(position: DashboardWidget['position']): Omit<DashboardWidget, 'id'> {
    return {
      type: WidgetType.CHART,
      title: 'Governance Metrics Trend',
      description: 'Historical governance metrics over time',
      position,
      config: {
        chartType: ChartType.LINE,
        metrics: ['compliance_score', 'violations', 'audit_events'],
        timeRange: '24h'
      },
      refreshInterval: 60000
    };
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    setInterval(() => {
      this.emit('dashboard:refresh', { timestamp: new Date() });
    }, this.config.refreshInterval);
  }

  /**
   * Start widget refresh timer
   */
  private startWidgetRefresh(widget: DashboardWidget): void {
    if (!widget.refreshInterval) return;

    const timer = setInterval(() => {
      this.emit('widget:refresh', { widgetId: widget.id });
    }, widget.refreshInterval);

    this.refreshTimers.set(widget.id, timer);
  }

  /**
   * Stop widget refresh timer
   */
  private stopWidgetRefresh(widgetId: string): void {
    const timer = this.refreshTimers.get(widgetId);
    if (timer) {
      clearInterval(timer);
      this.refreshTimers.delete(widgetId);
    }
  }

  /**
   * Generate unique layout ID
   */
  private generateLayoutId(): string {
    return `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique widget ID
   */
  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get dashboard statistics
   */
  getStats(): {
    totalLayouts: number;
    totalWidgets: number;
    totalDataSources: number;
    totalAlerts: number;
    unacknowledgedAlerts: number;
    metricsHistory: number;
  } {
    const totalWidgets = Array.from(this.layouts.values())
      .reduce((sum, layout) => sum + layout.widgets.length, 0);

    const unacknowledgedAlerts = Array.from(this.alerts.values())
      .filter(a => !a.acknowledged).length;

    return {
      totalLayouts: this.layouts.size,
      totalWidgets,
      totalDataSources: this.dataSources.size,
      totalAlerts: this.alerts.size,
      unacknowledgedAlerts,
      metricsHistory: this.metrics.length
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Stop all refresh timers
    for (const timer of this.refreshTimers.values()) {
      clearInterval(timer);
    }
    this.refreshTimers.clear();

    this.removeAllListeners();
  }
}

/**
 * Create a governance dashboard instance
 */
export function createGovernanceDashboard(config?: GovernanceDashboardConfig): GovernanceDashboard {
  return new GovernanceDashboard(config);
}

export default GovernanceDashboard;