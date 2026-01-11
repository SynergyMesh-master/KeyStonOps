/**
 * Audit Engine Unit Tests
 */

import { AuditEngine } from '../../src/engines/audit-engine';
import { IAuditConfig, EngineStatus, AutonomyLevel, ComplianceFramework } from '../../src/interfaces';

describe('AuditEngine', () => {
  let engine: AuditEngine;
  let config: IAuditConfig;
  
  beforeEach(() => {
    config = {
      id: 'test-audit-engine',
      name: 'Test Audit Engine',
      version: '1.0.0',
      autonomyLevel: AutonomyLevel.HIGH,
      enabled: true,
      intervalMs: 60000,
      timeoutMs: 30000,
      maxRetries: 3,
      retryBackoff: 'exponential',
      config: {
        eventRetentionDays: 90,
        enableRealTimeLogging: true,
        complianceFrameworks: [ComplianceFramework.SOC2, ComplianceFramework.GDPR]
      },
      dependencies: [],
      tags: ['audit', 'compliance']
    };
    
    engine = new AuditEngine(config);
  });
  
  afterEach(async () => {
    if (engine.status === EngineStatus.RUNNING) {
      await engine.stop();
    }
  });
  
  describe('Initialization', () => {
    it('should initialize correctly', async () => {
      await engine.initialize();
      expect(engine.status).toBe(EngineStatus.IDLE);
    });
  });
  
  describe('Lifecycle', () => {
    it('should start and stop', async () => {
      await engine.initialize();
      await engine.start();
      expect(engine.status).toBe(EngineStatus.RUNNING);
      await engine.stop();
      expect(engine.status).toBe(EngineStatus.TERMINATED);
    });
  });
  
  describe('Audit Logging', () => {
    it('should log audit event', async () => {
      await engine.initialize();
      const eventId = await engine.logEvent({
        type: 'access',
        actor: { id: 'user1', type: 'user', name: 'Test User' },
        action: 'read',
        result: 'success',
        severity: 'low'
      });
      
      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^event-/);
    });
    
    it('should get audit trail', async () => {
      await engine.initialize();
      await engine.logEvent({
        type: 'access',
        actor: { id: 'user1', type: 'user', name: 'Test User' },
        action: 'read',
        result: 'success',
        severity: 'low'
      });
      
      const trail = await engine.getAuditTrail();
      expect(trail.length).toBeGreaterThan(0);
    });
    
    it('should filter audit trail', async () => {
      await engine.initialize();
      await engine.logEvent({
        type: 'access',
        actor: { id: 'user1', type: 'user', name: 'Test User' },
        action: 'read',
        result: 'success',
        severity: 'low'
      });
      
      const trail = await engine.getAuditTrail({ type: 'access' });
      expect(trail.length).toBeGreaterThan(0);
      expect(trail[0].type).toBe('access');
    });
  });
  
  describe('Compliance Reporting', () => {
    it('should generate compliance report', async () => {
      await engine.initialize();
      const reportId = await engine.generateComplianceReport(ComplianceFramework.SOC2);
      
      expect(reportId).toBeDefined();
      expect(reportId).toMatch(/^report-/);
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
    });
  });
  
  describe('Health Check', () => {
    it('should get engine health', async () => {
      await engine.initialize();
      const health = await engine.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('score');
    });
  });
});