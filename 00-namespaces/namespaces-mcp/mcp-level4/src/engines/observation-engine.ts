/**
 * MCP Level 4 Observation Engine Implementation
 * 
 * Implements self-observation capabilities through continuous monitoring,
 * metrics collection, health checking, and performance profiling.
 * 
 * @module observation-engine
 * @version 1.0.0
 */

import {
  IObservationEngine,
  IObservationConfig,
  IMetric,
  IHealthCheck,
  IPerformanceProfile,
  IAnomaly,
  IAlert,
  MetricType,
  EngineStatus,
  IEngineMetrics,
  IEngineContext,
  IEngineResult,
  IEngineHealth
} from '../interfaces';

export class ObservationEngine implements IObservationEngine {
  public readonly config: IObservationConfig;
  public status: EngineStatus = EngineStatus.IDLE;
  public metrics: IEngineMetrics;
  
  private metricsStore: Map<string, IMetric> = new Map();
  private healthChecks: Map<string, IHealthCheck> = new Map();
  private profiles: Map<string, IPerformanceProfile> = new Map();
  private anomalies: Map<string, IAnomaly> = new Map();
  private alerts: Map<string, IAlert> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(config: IObservationConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }
  
  private initializeMetrics(): IEngineMetrics {
    return {
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
      minDurationMs: Infinity,
      maxDurationMs: 0,
      lastExecutionAt: new Date(),
      lastSuccessAt: new Date(),
      lastFailureAt: new Date(),
      errorRate: 0,
      resources: {
        cpuPercent: 0,
        memoryMB: 0,
        diskMB: 0,
        networkKBps: 0
      }
    };
  }
  
  async initialize(): Promise<void> {
    console.log(`Initializing Observation Engine: ${this.config.name}`);
    this.status = EngineStatus.IDLE;
    
    // Register default health checks
    await this.registerDefaultHealthChecks();
    
    // Register default metrics
    await this.registerDefaultMetrics();
  }
  
  async start(): Promise<void> {
    if (this.status === EngineStatus.RUNNING) {
      throw new Error('Observation Engine is already running');
    }
    
    console.log(`Starting Observation Engine: ${this.config.name}`);
    this.status = EngineStatus.RUNNING;
    
    // Start metrics collection
    this.metricsInterval = setInterval(
      () => this.collectMetrics(),
      this.config.config.metricsIntervalMs
    );
    
    // Start health checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.config.healthCheckIntervalMs
    );
  }
  
  async stop(): Promise<void> {
    console.log(`Stopping Observation Engine: ${this.config.name}`);
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.status = EngineStatus.TERMINATED;
  }
  
  async pause(): Promise<void> {
    console.log(`Pausing Observation Engine: ${this.config.name}`);
    this.status = EngineStatus.PAUSED;
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
  
  async resume(): Promise<void> {
    console.log(`Resuming Observation Engine: ${this.config.name}`);
    await this.start();
  }
  
  async execute(context: IEngineContext): Promise<IEngineResult> {
    const startTime = Date.now();
    this.metrics.executionCount++;
    
    try {
      // Collect current metrics
      const currentMetrics = await this.collectMetrics();
      
      // Perform health checks
      const healthResults = await this.performHealthChecks();
      
      // Detect anomalies if enabled
      let anomalies: IAnomaly[] = [];
      if (this.config.config.enableAnomalyDetection) {
        anomalies = await this.detectAllAnomalies();
      }
      
      const durationMs = Date.now() - startTime;
      this.updateMetrics(durationMs, true);
      
      return {
        success: true,
        durationMs,
        data: {
          metrics: currentMetrics,
          healthChecks: healthResults,
          anomalies
        },
        actions: [
          {
            type: 'metrics_collection',
            description: `Collected ${currentMetrics.length} metrics`,
            timestamp: new Date(),
            result: 'success'
          },
          {
            type: 'health_checks',
            description: `Performed ${healthResults.length} health checks`,
            timestamp: new Date(),
            result: 'success'
          }
        ]
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      this.updateMetrics(durationMs, false);
      
      return {
        success: false,
        durationMs,
        error: {
          code: 'OBSERVATION_ERROR',
          message: error.message,
          stack: error.stack
        },
        actions: []
      };
    }
  }
  
  async getHealth(): Promise<IEngineHealth> {
    const checks = await this.performHealthChecks();
    const passedChecks = checks.filter(c => c.status === 'pass').length;
    const score = (passedChecks / checks.length) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (score >= 90) status = 'healthy';
    else if (score >= 70) status = 'degraded';
    else status = 'unhealthy';
    
    return {
      status,
      checkedAt: new Date(),
      checks,
      score
    };
  }
  
  async updateConfig(config: Partial<IObservationConfig>): Promise<void> {
    Object.assign(this.config, config);
    console.log(`Updated Observation Engine config: ${this.config.name}`);
  }
  
  getMetrics(): IEngineMetrics {
    return { ...this.metrics };
  }
  
  async resetMetrics(): Promise<void> {
    this.metrics = this.initializeMetrics();
    console.log(`Reset metrics for Observation Engine: ${this.config.name}`);
  }
  
  // Observation-specific methods
  
  async collectMetrics(): Promise<IMetric[]> {
    const metrics: IMetric[] = [];
    
    // Collect system metrics
    const systemMetrics = await this.collectSystemMetrics();
    metrics.push(...systemMetrics);
    
    // Store metrics
    for (const metric of metrics) {
      const key = this.getMetricKey(metric.name, metric.labels);
      this.metricsStore.set(key, metric);
    }
    
    // Clean old metrics
    await this.cleanOldMetrics();
    
    return metrics;
  }
  
  async getMetric(name: string, labels?: Record<string, string>): Promise<IMetric | undefined> {
    const key = this.getMetricKey(name, labels || {});
    return this.metricsStore.get(key);
  }
  
  async getMetrics(pattern: string, labels?: Record<string, string>): Promise<IMetric[]> {
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPattern.replace(/\\\*/g, '.*'));
    const metrics: IMetric[] = [];
    
    for (const [key, metric] of this.metricsStore) {
      if (regex.test(metric.name)) {
        if (!labels || this.matchLabels(metric.labels, labels)) {
          metrics.push(metric);
        }
      }
    }
    
    return metrics;
  }
  
  async registerMetric(metric: Omit<IMetric, 'value' | 'timestamp'>): Promise<void> {
    const fullMetric: IMetric = {
      ...metric,
      value: 0,
      timestamp: new Date()
    };
    
    const key = this.getMetricKey(metric.name, metric.labels);
    this.metricsStore.set(key, fullMetric);
  }
  
  async updateMetric(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    const key = this.getMetricKey(name, labels || {});
    const existing = this.metricsStore.get(key);
    
    if (existing) {
      existing.value = value;
      existing.timestamp = new Date();
    } else {
      await this.registerMetric({
        name,
        type: MetricType.GAUGE,
        description: `Auto-registered metric: ${name}`,
        labels: labels || {}
      });
      await this.updateMetric(name, value, labels);
    }
  }
  
  async performHealthChecks(): Promise<Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    value?: any;
    threshold?: any;
  }>> {
    const results = [];
    
    for (const [name, check] of this.healthChecks) {
      try {
        const result = await Promise.race([
          check.check(),
          this.timeout(check.timeoutMs)
        ]);
        results.push({ name, ...result });
      } catch (error: any) {
        results.push({
          name,
          status: 'fail' as const,
          message: `Health check failed: ${error.message}`
        });
      }
    }
    
    return results;
  }
  
  async registerHealthCheck(check: IHealthCheck): Promise<void> {
    this.healthChecks.set(check.name, check);
    console.log(`Registered health check: ${check.name}`);
  }
  
  async startProfiling(name: string): Promise<string> {
    const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const profile: IPerformanceProfile = {
      id: profileId,
      name,
      startedAt: new Date(),
      cpuPercent: 0,
      memoryMB: 0,
      diskMB: 0,
      networkKB: 0,
      operations: {},
      bottlenecks: []
    };
    
    this.profiles.set(profileId, profile);
    console.log(`Started profiling: ${name} (${profileId})`);
    
    return profileId;
  }
  
  async stopProfiling(profileId: string): Promise<IPerformanceProfile> {
    const profile = this.profiles.get(profileId);
    
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    
    profile.endedAt = new Date();
    profile.durationMs = profile.endedAt.getTime() - profile.startedAt.getTime();
    
    // Collect final metrics
    const systemMetrics = await this.collectSystemMetrics();
    profile.cpuPercent = systemMetrics.find(m => m.name === 'cpu_percent')?.value || 0;
    profile.memoryMB = systemMetrics.find(m => m.name === 'memory_mb')?.value || 0;
    
    // Analyze bottlenecks
    profile.bottlenecks = await this.analyzeBottlenecks(profile);
    
    console.log(`Stopped profiling: ${profile.name} (${profileId})`);
    
    return profile;
  }
  
  async getProfile(profileId: string): Promise<IPerformanceProfile | undefined> {
    return this.profiles.get(profileId);
  }
  
  async getProfiles(limit?: number): Promise<IPerformanceProfile[]> {
    const profiles = Array.from(this.profiles.values());
    profiles.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return limit ? profiles.slice(0, limit) : profiles;
  }
  
  async detectAnomalies(metricName: string, timeRangeMs: number): Promise<IAnomaly[]> {
    const anomalies: IAnomaly[] = [];
    const metrics = await this.getMetrics(metricName);
    
    if (metrics.length < 2) {
      return anomalies;
    }
    
    // Simple anomaly detection based on standard deviation
    const values = metrics.map(m => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
    );
    
    const threshold = this.config.config.anomalySensitivity * stdDev;
    
    for (const metric of metrics) {
      const deviation = Math.abs(metric.value - mean);
      
      if (deviation > threshold) {
        const anomaly: IAnomaly = {
          id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: metric.value > mean ? 'spike' : 'drop',
          metricName: metric.name,
          detectedAt: new Date(),
          severity: this.calculateAnomalySeverity(deviation, threshold),
          expectedValue: mean,
          actualValue: metric.value,
          deviationPercent: (deviation / mean) * 100,
          description: `Anomaly detected in ${metric.name}`,
          recommendations: [`Investigate ${metric.name} behavior`]
        };
        
        anomalies.push(anomaly);
        this.anomalies.set(anomaly.id, anomaly);
      }
    }
    
    return anomalies;
  }
  
  async getAlerts(severity?: IAlert['severity']): Promise<IAlert[]> {
    const alerts = Array.from(this.alerts.values());
    
    if (severity) {
      return alerts.filter(a => a.severity === severity && !a.acknowledged);
    }
    
    return alerts.filter(a => !a.acknowledged);
  }
  
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }
    
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    
    console.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
  }
  
  async createAlert(alert: Omit<IAlert, 'id' | 'triggeredAt' | 'acknowledged'>): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullAlert: IAlert = {
      ...alert,
      id: alertId,
      triggeredAt: new Date(),
      acknowledged: false
    };
    
    this.alerts.set(alertId, fullAlert);
    console.log(`Alert created: ${alertId} - ${alert.message}`);
    
    return alertId;
  }
  
  async getSummary(): Promise<{
    totalMetrics: number;
    healthyChecks: number;
    unhealthyChecks: number;
    activeProfiles: number;
    activeAnomalies: number;
    activeAlerts: number;
    systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const healthResults = await this.performHealthChecks();
    const healthyChecks = healthResults.filter(r => r.status === 'pass').length;
    const unhealthyChecks = healthResults.filter(r => r.status === 'fail').length;
    
    const healthScore = (healthyChecks / healthResults.length) * 100;
    let systemHealth: 'healthy' | 'degraded' | 'unhealthy';
    if (healthScore >= 90) systemHealth = 'healthy';
    else if (healthScore >= 70) systemHealth = 'degraded';
    else systemHealth = 'unhealthy';
    
    return {
      totalMetrics: this.metricsStore.size,
      healthyChecks,
      unhealthyChecks,
      activeProfiles: Array.from(this.profiles.values()).filter(p => !p.endedAt).length,
      activeAnomalies: this.anomalies.size,
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.acknowledged).length,
      systemHealth
    };
  }
  
  // Private helper methods
  
  private async registerDefaultHealthChecks(): Promise<void> {
    await this.registerHealthCheck({
      name: 'engine_status',
      description: 'Check if engine is running',
      intervalMs: 60000,
      timeoutMs: 5000,
      check: async () => ({
        status: this.status === EngineStatus.RUNNING ? 'pass' : 'fail',
        message: `Engine status: ${this.status}`
      })
    });
  }
  
  private async registerDefaultMetrics(): Promise<void> {
    await this.registerMetric({
      name: 'cpu_percent',
      type: MetricType.GAUGE,
      description: 'CPU usage percentage',
      labels: { engine: this.config.name }
    });
    
    await this.registerMetric({
      name: 'memory_mb',
      type: MetricType.GAUGE,
      description: 'Memory usage in MB',
      labels: { engine: this.config.name }
    });
  }
  
  private async collectSystemMetrics(): Promise<IMetric[]> {
    const metrics: IMetric[] = [];
    const now = new Date();
    
    // Simulate system metrics collection
    metrics.push({
      name: 'cpu_percent',
      type: MetricType.GAUGE,
      description: 'CPU usage',
      labels: { engine: this.config.name },
      value: Math.random() * 100,
      timestamp: now
    });
    
    metrics.push({
      name: 'memory_mb',
      type: MetricType.GAUGE,
      description: 'Memory usage',
      labels: { engine: this.config.name },
      value: Math.random() * 1000,
      timestamp: now
    });
    
    return metrics;
  }
  
  private getMetricKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
  
  private matchLabels(metricLabels: Record<string, string>, filterLabels: Record<string, string>): boolean {
    for (const [key, value] of Object.entries(filterLabels)) {
      if (metricLabels[key] !== value) {
        return false;
      }
    }
    return true;
  }
  
  private async cleanOldMetrics(): Promise<void> {
    const retentionMs = this.config.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;
    
    for (const [key, metric] of this.metricsStore) {
      if (metric.timestamp.getTime() < cutoffTime) {
        this.metricsStore.delete(key);
      }
    }
  }
  
  private async analyzeBottlenecks(profile: IPerformanceProfile): Promise<Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>> {
    const bottlenecks = [];
    
    if (profile.cpuPercent > 80) {
      bottlenecks.push({
        type: 'cpu',
        description: 'High CPU usage detected',
        severity: 'high' as const,
        recommendation: 'Consider optimizing CPU-intensive operations'
      });
    }
    
    if (profile.memoryMB > 1000) {
      bottlenecks.push({
        type: 'memory',
        description: 'High memory usage detected',
        severity: 'medium' as const,
        recommendation: 'Review memory allocation and consider cleanup'
      });
    }
    
    return bottlenecks;
  }
  
  private calculateAnomalySeverity(deviation: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = deviation / threshold;
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }
  
  private async detectAllAnomalies(): Promise<IAnomaly[]> {
    const allAnomalies: IAnomaly[] = [];
    const metricNames = Array.from(new Set(Array.from(this.metricsStore.values()).map(m => m.name)));
    
    for (const metricName of metricNames) {
      const anomalies = await this.detectAnomalies(metricName, 3600000); // 1 hour
      allAnomalies.push(...anomalies);
    }
    
    return allAnomalies;
  }
  
  private updateMetrics(durationMs: number, success: boolean): void {
    if (success) {
      this.metrics.successCount++;
      this.metrics.lastSuccessAt = new Date();
    } else {
      this.metrics.failureCount++;
      this.metrics.lastFailureAt = new Date();
    }
    
    this.metrics.lastExecutionAt = new Date();
    this.metrics.avgDurationMs = 
      (this.metrics.avgDurationMs * (this.metrics.executionCount - 1) + durationMs) / 
      this.metrics.executionCount;
    this.metrics.minDurationMs = Math.min(this.metrics.minDurationMs, durationMs);
    this.metrics.maxDurationMs = Math.max(this.metrics.maxDurationMs, durationMs);
    this.metrics.errorRate = this.metrics.failureCount / this.metrics.executionCount;
  }
  
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }
}