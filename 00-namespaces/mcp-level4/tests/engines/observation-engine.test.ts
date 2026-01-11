/**
 * Observation Engine Unit Tests
 */

import { ObservationEngine } from '../../src/engines/observation-engine';
import { IObservationConfig, EngineStatus, AutonomyLevel, MetricType } from '../../src/interfaces';

describe('ObservationEngine', () => {
  let engine: ObservationEngine;
  let config: IObservationConfig;
  
  beforeEach(() => {
    config = {
      id: 'test-observation-engine',
      name: 'Test Observation Engine',
      version: '1.0.0',
      autonomyLevel: AutonomyLevel.HIGH,
      enabled: true,
      intervalMs: 60000,
      timeoutMs: 30000,
      maxRetries: 3,
      retryBackoff: 'exponential',
      config: {
        metricsIntervalMs: 10000,
        healthCheckIntervalMs: 30000,
        profilingIntervalMs: 60000,
        metricsRetentionDays: 7,
        enableDetailedProfiling: true,
        enableAnomalyDetection: true,
        anomalySensitivity: 2,
        alertThresholds: {
          cpuPercent: 80,
          memoryMB: 1000,
          diskMB: 5000,
          errorRate: 0.05,
          latencyMs: 1000
        },
        metricsToCollect: ['cpu_percent', 'memory_mb'],
        healthChecksToPerform: ['engine_status']
      },
      dependencies: [],
      tags: ['observation', 'monitoring']
    };
    
    engine = new ObservationEngine(config);
  });
  
  afterEach(async () => {
    if (engine.status === EngineStatus.RUNNING) {
      await engine.stop();
    }
  });
  
  describe('Initialization', () => {
    it('should initialize with correct config', async () => {
      await engine.initialize();
      expect(engine.config.name).toBe('Test Observation Engine');
      expect(engine.status).toBe(EngineStatus.IDLE);
    });
    
    it('should register default health checks', async () => {
      await engine.initialize();
      const healthResults = await engine.performHealthChecks();
      expect(healthResults.length).toBeGreaterThan(0);
    });
  });
  
  describe('Lifecycle Management', () => {
    it('should start successfully', async () => {
      await engine.initialize();
      await engine.start();
      expect(engine.status).toBe(EngineStatus.RUNNING);
    });
    
    it('should stop successfully', async () => {
      await engine.initialize();
      await engine.start();
      await engine.stop();
      expect(engine.status).toBe(EngineStatus.TERMINATED);
    });
    
    it('should pause and resume', async () => {
      await engine.initialize();
      await engine.start();
      await engine.pause();
      expect(engine.status).toBe(EngineStatus.PAUSED);
      
      await engine.resume();
      expect(engine.status).toBe(EngineStatus.RUNNING);
    });
    
    it('should throw error when starting already running engine', async () => {
      await engine.initialize();
      await engine.start();
      await expect(engine.start()).rejects.toThrow('already running');
    });
  });
  
  describe('Metrics Collection', () => {
    it('should collect metrics', async () => {
      await engine.initialize();
      const metrics = await engine.collectMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });
    
    it('should register custom metric', async () => {
      await engine.initialize();
      await engine.registerMetric({
        name: 'custom_metric',
        type: MetricType.COUNTER,
        description: 'Test metric',
        labels: { test: 'true' }
      });
      
      const metric = await engine.getMetric('custom_metric', { test: 'true' });
      expect(metric).toBeDefined();
      expect(metric?.name).toBe('custom_metric');
    });
    
    it('should update metric value', async () => {
      await engine.initialize();
      await engine.registerMetric({
        name: 'test_gauge',
        type: MetricType.GAUGE,
        description: 'Test gauge',
        labels: {}
      });
      
      await engine.updateMetric('test_gauge', 42);
      const metric = await engine.getMetric('test_gauge');
      expect(metric?.value).toBe(42);
    });
    
    it('should get metrics by pattern', async () => {
      await engine.initialize();
      await engine.collectMetrics();
      
      const metrics = await engine.getMetrics('cpu_*');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });
  
  describe('Health Checks', () => {
    it('should perform health checks', async () => {
      await engine.initialize();
      const results = await engine.performHealthChecks();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('status');
    });
    
    it('should register custom health check', async () => {
      await engine.initialize();
      await engine.registerHealthCheck({
        name: 'custom_check',
        description: 'Custom health check',
        intervalMs: 60000,
        timeoutMs: 5000,
        check: async () => ({
          status: 'pass',
          message: 'All good'
        })
      });
      
      const results = await engine.performHealthChecks();
      const customCheck = results.find(r => r.name === 'custom_check');
      expect(customCheck).toBeDefined();
      expect(customCheck?.status).toBe('pass');
    });
    
    it('should get engine health', async () => {
      await engine.initialize();
      const health = await engine.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('score');
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    });
  });
  
  describe('Performance Profiling', () => {
    it('should start profiling', async () => {
      await engine.initialize();
      const profileId = await engine.startProfiling('test_profile');
      expect(profileId).toBeDefined();
      expect(profileId).toMatch(/^profile-/);
    });
    
    it('should stop profiling and return results', async () => {
      await engine.initialize();
      const profileId = await engine.startProfiling('test_profile');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const profile = await engine.stopProfiling(profileId);
      expect(profile).toBeDefined();
      expect(profile.durationMs).toBeGreaterThan(0);
      expect(profile.endedAt).toBeDefined();
    });
    
    it('should get profile by id', async () => {
      await engine.initialize();
      const profileId = await engine.startProfiling('test_profile');
      const profile = await engine.getProfile(profileId);
      expect(profile).toBeDefined();
      expect(profile?.id).toBe(profileId);
    });
    
    it('should get all profiles', async () => {
      await engine.initialize();
      await engine.startProfiling('profile1');
      await engine.startProfiling('profile2');
      
      const profiles = await engine.getProfiles();
      expect(profiles.length).toBe(2);
    });
    
    it('should limit profiles returned', async () => {
      await engine.initialize();
      await engine.startProfiling('profile1');
      await engine.startProfiling('profile2');
      await engine.startProfiling('profile3');
      
      const profiles = await engine.getProfiles(2);
      expect(profiles.length).toBe(2);
    });
  });
  
  describe('Anomaly Detection', () => {
    it('should detect anomalies', async () => {
      await engine.initialize();
      
      // Create metrics with anomaly
      await engine.updateMetric('test_metric', 10);
      await engine.updateMetric('test_metric', 12);
      await engine.updateMetric('test_metric', 11);
      await engine.updateMetric('test_metric', 100); // Anomaly
      
      const anomalies = await engine.detectAnomalies('test_metric', 3600000);
      expect(anomalies.length).toBeGreaterThan(0);
    });
  });
  
  describe('Alert Management', () => {
    it('should create alert', async () => {
      await engine.initialize();
      const alertId = await engine.createAlert({
        name: 'Test Alert',
        severity: 'warning',
        message: 'Test alert message',
        source: 'test',
        metadata: {}
      });
      
      expect(alertId).toBeDefined();
      expect(alertId).toMatch(/^alert-/);
    });
    
    it('should get alerts', async () => {
      await engine.initialize();
      await engine.createAlert({
        name: 'Test Alert',
        severity: 'warning',
        message: 'Test message',
        source: 'test',
        metadata: {}
      });
      
      const alerts = await engine.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
    
    it('should acknowledge alert', async () => {
      await engine.initialize();
      const alertId = await engine.createAlert({
        name: 'Test Alert',
        severity: 'warning',
        message: 'Test message',
        source: 'test',
        metadata: {}
      });
      
      await engine.acknowledgeAlert(alertId, 'test_user');
      const alerts = await engine.getAlerts();
      expect(alerts.length).toBe(0); // Acknowledged alerts are filtered out
    });
  });
  
  describe('Summary', () => {
    it('should get summary', async () => {
      await engine.initialize();
      await engine.collectMetrics();
      
      const summary = await engine.getSummary();
      expect(summary).toHaveProperty('totalMetrics');
      expect(summary).toHaveProperty('systemHealth');
      expect(summary.totalMetrics).toBeGreaterThan(0);
    });
  });
  
  describe('Execution', () => {
    it('should execute successfully', async () => {
      await engine.initialize();
      const context = {
        executionId: 'test-exec-1',
        startedAt: new Date(),
        trigger: 'manual' as const,
        priority: 'medium' as const,
        metadata: {}
      };
      
      const result = await engine.execute(context);
      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.actions.length).toBeGreaterThan(0);
    });
  });
  
  describe('Metrics Management', () => {
    it('should get engine metrics', () => {
      const metrics = engine.getMetrics();
      expect(metrics).toHaveProperty('executionCount');
      expect(metrics).toHaveProperty('successCount');
      expect(metrics).toHaveProperty('errorRate');
    });
    
    it('should reset metrics', async () => {
      await engine.initialize();
      const context = {
        executionId: 'test-exec-1',
        startedAt: new Date(),
        trigger: 'manual' as const,
        priority: 'medium' as const,
        metadata: {}
      };
      
      await engine.execute(context);
      expect(engine.getMetrics().executionCount).toBe(1);
      
      await engine.resetMetrics();
      expect(engine.getMetrics().executionCount).toBe(0);
    });
  });
});