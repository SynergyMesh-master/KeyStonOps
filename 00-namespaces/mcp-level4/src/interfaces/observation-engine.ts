/**
 * MCP Level 4 Observation Engine Interface
 * 
 * Provides self-observation capabilities through continuous monitoring,
 * metrics collection, health checking, and performance profiling.
 * 
 * @module observation-engine
 * @version 1.0.0
 */

import { IEngine, IEngineConfig } from './core';

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export interface IMetric {
  name: string;
  type: MetricType;
  description: string;
  labels: Record<string, string>;
  value: number;
  timestamp: Date;
  unit?: string;
}

export interface IHealthCheck {
  name: string;
  description: string;
  intervalMs: number;
  timeoutMs: number;
  check: () => Promise<{
    status: 'pass' | 'warn' | 'fail';
    message: string;
    value?: any;
    threshold?: any;
  }>;
}

export interface IPerformanceProfile {
  id: string;
  name: string;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
  cpuPercent: number;
  memoryMB: number;
  diskMB: number;
  networkKB: number;
  operations: Record<string, number>;
  bottlenecks: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
}

export interface IAnomaly {
  id: string;
  type: 'spike' | 'drop' | 'trend' | 'pattern';
  metricName: string;
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedValue: number;
  actualValue: number;
  deviationPercent: number;
  description: string;
  recommendations: string[];
}

export interface IAlert {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  triggeredAt: Date;
  source: string;
  metadata: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface IObservationConfig extends IEngineConfig {
  config: {
    metricsIntervalMs: number;
    healthCheckIntervalMs: number;
    profilingIntervalMs: number;
    metricsRetentionDays: number;
    enableDetailedProfiling: boolean;
    enableAnomalyDetection: boolean;
    anomalySensitivity: number;
    alertThresholds: {
      cpuPercent: number;
      memoryMB: number;
      diskMB: number;
      errorRate: number;
      latencyMs: number;
    };
    metricsToCollect: string[];
    healthChecksToPerform: string[];
  };
}

export interface IObservationEngine extends IEngine {
  readonly config: IObservationConfig;
  
  collectMetrics(): Promise<IMetric[]>;
  getMetric(name: string, labels?: Record<string, string>): Promise<IMetric | undefined>;
  getMetrics(pattern: string, labels?: Record<string, string>): Promise<IMetric[]>;
  registerMetric(metric: Omit<IMetric, 'value' | 'timestamp'>): Promise<void>;
  updateMetric(name: string, value: number, labels?: Record<string, string>): Promise<void>;
  
  performHealthChecks(): Promise<Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    value?: any;
    threshold?: any;
  }>>;
  registerHealthCheck(check: IHealthCheck): Promise<void>;
  
  startProfiling(name: string): Promise<string>;
  stopProfiling(profileId: string): Promise<IPerformanceProfile>;
  getProfile(profileId: string): Promise<IPerformanceProfile | undefined>;
  getProfiles(limit?: number): Promise<IPerformanceProfile[]>;
  
  detectAnomalies(metricName: string, timeRangeMs: number): Promise<IAnomaly[]>;
  
  getAlerts(severity?: IAlert['severity']): Promise<IAlert[]>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
  createAlert(alert: Omit<IAlert, 'id' | 'triggeredAt' | 'acknowledged'>): Promise<string>;
  
  getSummary(): Promise<{
    totalMetrics: number;
    healthyChecks: number;
    unhealthyChecks: number;
    activeProfiles: number;
    activeAnomalies: number;
    activeAlerts: number;
    systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  }>;
}