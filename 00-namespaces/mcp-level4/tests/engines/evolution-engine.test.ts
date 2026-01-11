/**
 * Evolution Engine Unit Tests
 */

import { EvolutionEngine } from '../../src/engines/evolution-engine';
import { IEvolutionConfig, EngineStatus, AutonomyLevel, OptimizationStrategy } from '../../src/interfaces';

describe('EvolutionEngine', () => {
  let engine: EvolutionEngine;
  let config: IEvolutionConfig;
  
  beforeEach(() => {
    config = {
      id: 'test-evolution-engine',
      name: 'Test Evolution Engine',
      version: '1.0.0',
      autonomyLevel: AutonomyLevel.HIGH,
      enabled: true,
      intervalMs: 60000,
      timeoutMs: 30000,
      maxRetries: 3,
      retryBackoff: 'exponential',
      config: {
        analysisIntervalMs: 300000,
        optimizationStrategy: OptimizationStrategy.BALANCED,
        enableAutoOptimization: false,
        requireApprovalForHighRisk: true,
        maxConcurrentABTests: 3,
        minImprovementThreshold: 5,
        baselineRetentionDays: 30,
        enableMLOptimization: false
      },
      dependencies: [],
      tags: ['evolution', 'optimization']
    };
    
    engine = new EvolutionEngine(config);
  });
  
  afterEach(async () => {
    if (engine.status === EngineStatus.RUNNING) {
      await engine.stop();
    }
  });
  
  describe('Initialization', () => {
    it('should initialize with correct config', async () => {
      await engine.initialize();
      expect(engine.config.name).toBe('Test Evolution Engine');
      expect(engine.status).toBe(EngineStatus.IDLE);
    });
    
    it('should create initial baseline on initialization', async () => {
      await engine.initialize();
      const baseline = await engine.getCurrentBaseline();
      expect(baseline).toBeDefined();
      expect(baseline.name).toBe('initial_baseline');
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
    
    it('should throw error when starting already running engine', async () => {
      await engine.initialize();
      await engine.start();
      await expect(engine.start()).rejects.toThrow('already running');
    });
  });
  
  describe('Baseline Management', () => {
    it('should create baseline', async () => {
      await engine.initialize();
      const baselineId = await engine.createBaseline('test_baseline');
      expect(baselineId).toBeDefined();
      expect(baselineId).toMatch(/^baseline-/);
    });
    
    it('should get baseline by id', async () => {
      await engine.initialize();
      const baselineId = await engine.createBaseline('test_baseline');
      const baseline = await engine.getBaseline(baselineId);
      expect(baseline).toBeDefined();
      expect(baseline?.name).toBe('test_baseline');
    });
    
    it('should get current baseline', async () => {
      await engine.initialize();
      const baseline = await engine.getCurrentBaseline();
      expect(baseline).toBeDefined();
      expect(baseline.isCurrent).toBe(true);
    });
    
    it('should compare baselines', async () => {
      await engine.initialize();
      const baseline1Id = await engine.createBaseline('baseline1');
      const baseline2Id = await engine.createBaseline('baseline2');
      
      const comparison = await engine.compareBaselines(baseline1Id, baseline2Id);
      expect(comparison).toHaveProperty('improvements');
      expect(comparison).toHaveProperty('regressions');
      expect(comparison).toHaveProperty('overallScore');
    });
  });
  
  describe('Performance Analysis', () => {
    it('should analyze performance', async () => {
      await engine.initialize();
      const analysis = await engine.analyzePerformance();
      
      expect(analysis).toHaveProperty('currentBaseline');
      expect(analysis).toHaveProperty('trends');
      expect(analysis).toHaveProperty('bottlenecks');
      expect(Array.isArray(analysis.trends)).toBe(true);
    });
  });
  
  describe('Optimization Candidates', () => {
    it('should generate candidates', async () => {
      await engine.initialize();
      const candidates = await engine.generateCandidates(OptimizationStrategy.PERFORMANCE);
      
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toHaveProperty('id');
      expect(candidates[0]).toHaveProperty('name');
    });
    
    it('should evaluate candidate', async () => {
      await engine.initialize();
      const candidates = await engine.generateCandidates(OptimizationStrategy.PERFORMANCE);
      const candidateId = candidates[0].id;
      
      const evaluation = await engine.evaluateCandidate(candidateId);
      expect(evaluation).toHaveProperty('feasibility');
      expect(evaluation).toHaveProperty('expectedImpact');
      expect(evaluation).toHaveProperty('risk');
      expect(evaluation).toHaveProperty('recommendation');
    });
  });
  
  describe('Evolution Plans', () => {
    it('should create evolution plan', async () => {
      await engine.initialize();
      const candidates = await engine.generateCandidates(OptimizationStrategy.BALANCED);
      const candidateIds = candidates.map(c => c.id);
      
      const planId = await engine.createEvolutionPlan('test_plan', OptimizationStrategy.BALANCED, candidateIds);
      expect(planId).toBeDefined();
      expect(planId).toMatch(/^plan-/);
    });
    
    it('should get evolution plan', async () => {
      await engine.initialize();
      const candidates = await engine.generateCandidates(OptimizationStrategy.BALANCED);
      const planId = await engine.createEvolutionPlan('test_plan', OptimizationStrategy.BALANCED, [candidates[0].id]);
      
      const plan = await engine.getEvolutionPlan(planId);
      expect(plan).toBeDefined();
      expect(plan?.name).toBe('test_plan');
    });
    
    it('should approve evolution plan', async () => {
      await engine.initialize();
      const candidates = await engine.generateCandidates(OptimizationStrategy.BALANCED);
      const planId = await engine.createEvolutionPlan('test_plan', OptimizationStrategy.BALANCED, [candidates[0].id]);
      
      await engine.approveEvolutionPlan(planId, 'test_user');
      const plan = await engine.getEvolutionPlan(planId);
      expect(plan?.approvedBy).toBe('test_user');
    });
    
    it('should execute evolution plan', async () => {
      await engine.initialize();
      const candidates = await engine.generateCandidates(OptimizationStrategy.BALANCED);
      const planId = await engine.createEvolutionPlan('test_plan', OptimizationStrategy.BALANCED, [candidates[0].id]);
      await engine.approveEvolutionPlan(planId, 'test_user');
      
      const result = await engine.executeEvolutionPlan(planId);
      expect(result.success).toBe(true);
    });
  });
  
  describe('A/B Testing', () => {
    it('should create A/B test', async () => {
      await engine.initialize();
      const testId = await engine.createABTest({
        name: 'Test A/B',
        description: 'Test description',
        controlVariant: { name: 'control', configuration: {} },
        treatmentVariants: [{ name: 'treatment', configuration: {}, trafficPercent: 50 }],
        successMetrics: [{ name: 'latency', target: 100, operator: 'lt' }],
        durationHours: 24,
        minSampleSize: 1000,
        significanceLevel: 0.95,
        autoPromote: false
      });
      
      expect(testId).toBeDefined();
      expect(testId).toMatch(/^abtest-/);
    });
    
    it('should start A/B test', async () => {
      await engine.initialize();
      const testId = await engine.createABTest({
        name: 'Test A/B',
        description: 'Test description',
        controlVariant: { name: 'control', configuration: {} },
        treatmentVariants: [{ name: 'treatment', configuration: {}, trafficPercent: 50 }],
        successMetrics: [{ name: 'latency', target: 100, operator: 'lt' }],
        durationHours: 24,
        minSampleSize: 1000,
        significanceLevel: 0.95,
        autoPromote: false
      });
      
      await engine.startABTest(testId);
      const result = await engine.getABTestResult(testId);
      expect(result.status).toBe('running');
    });
    
    it('should stop A/B test', async () => {
      await engine.initialize();
      const testId = await engine.createABTest({
        name: 'Test A/B',
        description: 'Test description',
        controlVariant: { name: 'control', configuration: {} },
        treatmentVariants: [{ name: 'treatment', configuration: {}, trafficPercent: 50 }],
        successMetrics: [{ name: 'latency', target: 100, operator: 'lt' }],
        durationHours: 24,
        minSampleSize: 1000,
        significanceLevel: 0.95,
        autoPromote: false
      });
      
      await engine.startABTest(testId);
      await engine.stopABTest(testId);
      
      const result = await engine.getABTestResult(testId);
      expect(result.status).toBe('completed');
    });
    
    it('should get active A/B tests', async () => {
      await engine.initialize();
      const testId = await engine.createABTest({
        name: 'Test A/B',
        description: 'Test description',
        controlVariant: { name: 'control', configuration: {} },
        treatmentVariants: [{ name: 'treatment', configuration: {}, trafficPercent: 50 }],
        successMetrics: [{ name: 'latency', target: 100, operator: 'lt' }],
        durationHours: 24,
        minSampleSize: 1000,
        significanceLevel: 0.95,
        autoPromote: false
      });
      
      await engine.startABTest(testId);
      const activeTests = await engine.getActiveABTests();
      expect(activeTests.length).toBe(1);
    });
  });
  
  describe('Rollback', () => {
    it('should rollback to previous baseline', async () => {
      await engine.initialize();
      const baseline1Id = await engine.createBaseline('baseline1');
      const baseline2Id = await engine.createBaseline('baseline2');
      
      await engine.rollback(baseline1Id);
      const currentBaseline = await engine.getCurrentBaseline();
      expect(currentBaseline.id).toBe(baseline1Id);
    });
  });
  
  describe('Evolution History', () => {
    it('should get evolution history', async () => {
      await engine.initialize();
      const history = await engine.getEvolutionHistory();
      expect(Array.isArray(history)).toBe(true);
    });
    
    it('should limit evolution history', async () => {
      await engine.initialize();
      const history = await engine.getEvolutionHistory(1);
      expect(history.length).toBeLessThanOrEqual(1);
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