/**
 * MCP Resource Monitor
 * 
 * Real-time resource monitoring with metrics collection, alerting,
 * and comprehensive health tracking for MCP resources.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ResourceDefinition,
  ResourceAllocation,
  ResourceType,
  ResourceStatus,
  ResourceStatistics
} from './resource-manager';

/**
 * Monitoring Metric Type
 */
export enum MetricType {
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
  NETWORK_THROUGHPUT = 'network_throughput',
  ALLOCATION_RATE = 'allocation_rate',
  UTILIZATION_RATE = 'utilization_rate',
  ERROR_RATE = 'error_rate',
  RESPONSE_TIME = 'response_time',
  QUEUE_DEPTH = 'queue_depth',
  COST_PER_UNIT = 'cost_per_unit'
}

/**
 * Alert Severity
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Metric Data Point
 */
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Resource Metrics
 */
export interface ResourceMetrics {
  resourceId: string;
  resourceType: ResourceType;
  metrics: Map<MetricType, MetricDataPoint[]>;
  healthScore: number;
  lastUpdated: number;
}

/**
 * Monitoring Alert
 */
export interface MonitoringAlert {
  id: string;
  resourceId: string;
  metricType: MetricType;
  severity: AlertSeverity;
  message: string;
  threshold: number;
  actualValue: number;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
}

/**
 * Health Check Result
 */
export interface HealthCheckResult {
  resourceId: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }[];
  overallScore: number;
  timestamp: number;
}

/**
 * Monitoring Configuration
 */
export interface MonitoringConfig {
  enabledMetrics: MetricType[];
  collectionInterval: number;
  retentionPeriod: number;
  alertThresholds: Map<MetricType, {
    warning: number;
    critical: number;
  }>;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  enableAutoResolution: boolean;
  maxDataPoints: number;
  enablePrediction: boolean;
  predictionWindow: number;
}

/**
 * MCP Resource Monitor
 */
export class MCPResourceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private resourceMetrics: Map<string, ResourceMetrics> = new Map();
  private activeAlerts: Map<string, MonitoringAlert> = new Map();
  private alertHistory: MonitoringAlert[] = [];
  private healthCheckResults: Map<string, HealthCheckResult> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private predictionModels: Map<string, any> = new Map();

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    
    this.config = {
      enabledMetrics: [
        MetricType.CPU_USAGE,
        MetricType.MEMORY_USAGE,
        MetricType.UTILIZATION_RATE,
        MetricType.ALLOCATION_RATE,
        MetricType.RESPONSE_TIME
      ],
      collectionInterval: 5000, // 5 seconds
      retentionPeriod: 86400000, // 24 hours
      alertThresholds: new Map([
        [MetricType.CPU_USAGE, { warning: 80, critical: 95 }],
        [MetricType.MEMORY_USAGE, { warning: 85, critical: 95 }],
        [MetricType.UTILIZATION_RATE, { warning: 75, critical: 90 }],
        [MetricType.ERROR_RATE, { warning: 5, critical: 10 }],
        [MetricType.RESPONSE_TIME, { warning: 1000, critical: 5000 }]
      ]),
      enableHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
      enableAutoResolution: true,
      maxDataPoints: 1000,
      enablePrediction: false,
      predictionWindow: 300000, // 5 minutes
      ...config
    };

    this.startMonitoring();
    this.startHealthChecks();
  }

  /**
   * Add resource to monitoring
   */
  public addResource(resource: ResourceDefinition): void {
    const metrics: ResourceMetrics = {
      resourceId: resource.id,
      resourceType: resource.type,
      metrics: new Map(),
      healthScore: 100,
      lastUpdated: Date.now()
    };

    // Initialize metric collections
    for (const metricType of this.config.enabledMetrics) {
      metrics.metrics.set(metricType, []);
    }

    this.resourceMetrics.set(resource.id, metrics);
    this.emit('resource-added', { resourceId: resource.id });
  }

  /**
   * Remove resource from monitoring
   */
  public removeResource(resourceId: string): void {
    this.resourceMetrics.delete(resourceId);
    this.activeAlerts.delete(resourceId);
    this.healthCheckResults.delete(resourceId);
    this.predictionModels.delete(resourceId);
    this.emit('resource-removed', { resourceId });
  }

  /**
   * Record metric data point
   */
  public recordMetric(
    resourceId: string,
    metricType: MetricType,
    value: number,
    metadata?: Record<string, any>
  ): void {
    const metrics = this.resourceMetrics.get(resourceId);
    
    if (!metrics) {
      return;
    }

    const dataPoints = metrics.metrics.get(metricType) || [];
    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      value,
      metadata
    };

    dataPoints.push(dataPoint);

    // Apply retention policy
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    const filteredPoints = dataPoints.filter(dp => dp.timestamp > cutoffTime);

    // Apply data point limit
    if (filteredPoints.length > this.config.maxDataPoints) {
      filteredPoints.splice(0, filteredPoints.length - this.config.maxDataPoints);
    }

    metrics.metrics.set(metricType, filteredPoints);
    metrics.lastUpdated = Date.now();

    // Check for alerts
    this.checkAlertThresholds(resourceId, metricType, value);

    // Update health score
    this.updateHealthScore(resourceId);

    this.emit('metric-recorded', { resourceId, metricType, value, metadata });
  }

  /**
   * Get metrics for resource
   */
  public getResourceMetrics(resourceId: string): ResourceMetrics | undefined {
    return this.resourceMetrics.get(resourceId);
  }

  /**
   * Get metric data for resource
   */
  public getMetricData(
    resourceId: string,
    metricType: MetricType,
    timeRange?: { start: number; end: number }
  ): MetricDataPoint[] {
    const metrics = this.resourceMetrics.get(resourceId);
    
    if (!metrics) {
      return [];
    }

    let dataPoints = metrics.metrics.get(metricType) || [];

    if (timeRange) {
      dataPoints = dataPoints.filter(dp => 
        dp.timestamp >= timeRange.start && dp.timestamp <= timeRange.end
      );
    }

    return dataPoints;
  }

  /**
   * Get aggregated metrics
   */
  public getAggregatedMetrics(
    resourceId: string,
    metricType: MetricType,
    aggregation: 'avg' | 'min' | 'max' | 'sum',
    timeRange?: { start: number; end: number }
  ): number | null {
    const dataPoints = this.getMetricData(resourceId, metricType, timeRange);
    
    if (dataPoints.length === 0) {
      return null;
    }

    const values = dataPoints.map(dp => dp.value);

    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      default:
        return null;
    }
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): MonitoringAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alerts for resource
   */
  public getResourceAlerts(resourceId: string): MonitoringAlert[] {
    return Array.from(this.activeAlerts.values()).filter(a => a.resourceId === resourceId);
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert-acknowledged', { alert });
    }
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    
    if (alert) {
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);
      this.alertHistory.push(alert);
      this.emit('alert-resolved', { alert });
    }
  }

  /**
   * Get health check result
   */
  public getHealthCheckResult(resourceId: string): HealthCheckResult | undefined {
    return this.healthCheckResults.get(resourceId);
  }

  /**
   * Perform manual health check
   */
  public async performHealthCheck(resourceId: string): Promise<HealthCheckResult> {
    const result = await this.executeHealthCheck(resourceId);
    this.healthCheckResults.set(resourceId, result);
    this.emit('health-check-completed', { resourceId, result });
    return result;
  }

  /**
   * Get monitoring summary
   */
  public getMonitoringSummary(): {
    totalResources: number;
    activeAlerts: number;
    healthyResources: number;
    unhealthyResources: number;
    averageHealthScore: number;
    totalMetrics: number;
  } {
    const resources = Array.from(this.resourceMetrics.values());
    const alerts = Array.from(this.activeAlerts.values());
    const healthResults = Array.from(this.healthCheckResults.values());

    const healthyResources = healthResults.filter(r => r.status === 'healthy').length;
    const unhealthyResources = healthResults.filter(r => r.status === 'unhealthy').length;
    const averageHealthScore = resources.length > 0 ? 
      resources.reduce((sum, r) => sum + r.healthScore, 0) / resources.length : 0;

    const totalMetrics = resources.reduce((sum, r) => 
      sum + Array.from(r.metrics.values()).reduce((metricSum, points) => metricSum + points.length, 0), 0
    );

    return {
      totalResources: resources.length,
      activeAlerts: alerts.length,
      healthyResources,
      unhealthyResources,
      averageHealthScore,
      totalMetrics
    };
  }

  /**
   * Predict resource usage
   */
  public predictUsage(
    resourceId: string,
    metricType: MetricType,
    futureTime: number
  ): number | null {
    if (!this.config.enablePrediction) {
      return null;
    }

    const dataPoints = this.getMetricData(resourceId, metricType);
    
    if (dataPoints.length < 10) {
      return null;
    }

    // Simple linear regression prediction
    const values = dataPoints.map(dp => dp.value);
    const timePoints = dataPoints.map(dp => dp.timestamp);
    
    const prediction = this.linearRegression(timePoints, values, futureTime);
    
    return prediction;
  }

  /**
   * Destroy monitor
   */
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.resourceMetrics.clear();
    this.activeAlerts.clear();
    this.healthCheckResults.clear();
    this.alertHistory.length = 0;

    this.emit('destroyed');
  }

  // Private methods

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle();
    }, this.config.collectionInterval);
  }

  private startHealthChecks(): void {
    if (this.config.enableHealthChecks) {
      this.healthCheckInterval = setInterval(() => {
        this.performAllHealthChecks();
      }, this.config.healthCheckInterval);
    }
  }

  private performMonitoringCycle(): void {
    try {
      // Simulate metric collection for monitored resources
      for (const [resourceId, metrics] of this.resourceMetrics.entries()) {
        this.simulateMetricCollection(resourceId);
      }

      // Clean up old alerts
      this.cleanupOldAlerts();

      this.emit('monitoring-cycle-completed');

    } catch (error) {
      this.emit('monitoring-error', error);
    }
  }

  private simulateMetricCollection(resourceId: string): void {
    const metrics = this.resourceMetrics.get(resourceId);
    
    if (!metrics) {
      return;
    }

    // Simulate different metrics based on resource type
    for (const metricType of this.config.enabledMetrics) {
      let value = 0;

      switch (metricType) {
        case MetricType.CPU_USAGE:
          value = 20 + Math.random() * 60; // 20-80%
          break;
        case MetricType.MEMORY_USAGE:
          value = 30 + Math.random() * 50; // 30-80%
          break;
        case MetricType.UTILIZATION_RATE:
          value = 10 + Math.random() * 70; // 10-80%
          break;
        case MetricType.ALLOCATION_RATE:
          value = Math.random() * 10; // 0-10 per second
          break;
        case MetricType.RESPONSE_TIME:
          value = 50 + Math.random() * 200; // 50-250ms
          break;
        default:
          value = Math.random() * 100;
      }

      this.recordMetric(resourceId, metricType, value);
    }
  }

  private checkAlertThresholds(
    resourceId: string,
    metricType: MetricType,
    value: number
  ): void {
    const thresholds = this.config.alertThresholds.get(metricType);
    
    if (!thresholds) {
      return;
    }

    const alertId = `${resourceId}-${metricType}`;
    const existingAlert = this.activeAlerts.get(alertId);

    let severity: AlertSeverity | null = null;

    if (value >= thresholds.critical) {
      severity = AlertSeverity.CRITICAL;
    } else if (value >= thresholds.warning) {
      severity = AlertSeverity.WARNING;
    }

    if (severity) {
      if (!existingAlert) {
        // Create new alert
        const alert: MonitoringAlert = {
          id: alertId,
          resourceId,
          metricType,
          severity,
          message: `${metricType} threshold exceeded: ${value.toFixed(2)}%`,
          threshold: severity === AlertSeverity.CRITICAL ? thresholds.critical : thresholds.warning,
          actualValue: value,
          timestamp: Date.now(),
          acknowledged: false
        };

        this.activeAlerts.set(alertId, alert);
        this.emit('alert-triggered', { alert });

      } else if (severity !== existingAlert.severity) {
        // Update existing alert severity
        existingAlert.severity = severity;
        existingAlert.actualValue = value;
        existingAlert.timestamp = Date.now();
        this.emit('alert-updated', { alert: existingAlert });
      }
    } else if (existingAlert && this.config.enableAutoResolution) {
      // Auto-resolve alert if value returns to normal
      this.resolveAlert(alertId);
    }
  }

  private updateHealthScore(resourceId: string): void {
    const metrics = this.resourceMetrics.get(resourceId);
    
    if (!metrics) {
      return;
    }

    let healthScore = 100;
    const alerts = this.getResourceAlerts(resourceId);

    // Deduct points for active alerts
    for (const alert of alerts) {
      switch (alert.severity) {
        case AlertSeverity.CRITICAL:
          healthScore -= 30;
          break;
        case AlertSeverity.ERROR:
          healthScore -= 20;
          break;
        case AlertSeverity.WARNING:
          healthScore -= 10;
          break;
      }
    }

    // Consider recent metric trends
    for (const metricType of this.config.enabledMetrics) {
      const recentData = this.getMetricData(resourceId, metricType);
      
      if (recentData.length >= 5) {
        const recentValues = recentData.slice(-5).map(dp => dp.value);
        const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;

        // Apply metric-specific health scoring
        if (metricType === MetricType.CPU_USAGE && average > 80) {
          healthScore -= 10;
        } else if (metricType === MetricType.MEMORY_USAGE && average > 85) {
          healthScore -= 10;
        } else if (metricType === MetricType.ERROR_RATE && average > 5) {
          healthScore -= 15;
        }
      }
    }

    metrics.healthScore = Math.max(0, Math.min(100, healthScore));
  }

  private performAllHealthChecks(): void {
    for (const resourceId of this.resourceMetrics.keys()) {
      this.performHealthCheck(resourceId).catch(error => {
        this.emit('health-check-error', { resourceId, error });
      });
    }
  }

  private async executeHealthCheck(resourceId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks = [];

    // Check resource availability
    checks.push({
      name: 'resource_availability',
      status: 'pass' as const,
      message: 'Resource is available',
      duration: 5
    });

    // Check metrics collection
    const metrics = this.resourceMetrics.get(resourceId);
    const hasRecentData = metrics && (Date.now() - metrics.lastUpdated) < 60000; // 1 minute
    checks.push({
      name: 'metrics_collection',
      status: hasRecentData ? 'pass' as const : 'warn' as const,
      message: hasRecentData ? 'Metrics are up to date' : 'Metrics collection delayed',
      duration: 10
    });

    // Check for critical alerts
    const criticalAlerts = this.getResourceAlerts(resourceId).filter(a => a.severity === AlertSeverity.CRITICAL);
    checks.push({
      name: 'critical_alerts',
      status: criticalAlerts.length === 0 ? 'pass' as const : 'fail' as const,
      message: criticalAlerts.length === 0 ? 'No critical alerts' : `${criticalAlerts.length} critical alerts`,
      duration: 15
    });

    // Calculate overall score
    const overallScore = checks.reduce((score, check) => {
      if (check.status === 'fail') return score - 25;
      if (check.status === 'warn') return score - 10;
      return score;
    }, 100);

    // Determine status
    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (overallScore >= 80) {
      status = 'healthy';
    } else if (overallScore >= 50) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      resourceId,
      status,
      checks,
      overallScore,
      timestamp: Date.now()
    };
  }

  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    
    // Remove resolved alerts from history
    this.alertHistory = this.alertHistory.filter(alert => 
      !alert.resolvedAt || alert.resolvedAt > cutoffTime
    );
  }

  private linearRegression(x: number[], y: number[], futureX: number): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * futureX + intercept;
  }
}