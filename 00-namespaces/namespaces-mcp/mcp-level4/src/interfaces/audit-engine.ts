/**
 * MCP Level 4 Audit Engine Interface
 * Self-audit capabilities through compliance and logging
 */

import { IEngine, IEngineConfig } from './core';

export enum ComplianceFramework {
  SOC2 = 'soc2',
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
  PCI_DSS = 'pci_dss',
  ISO27001 = 'iso27001'
}

export interface IAuditEvent {
  id: string;
  type: string;
  timestamp: Date;
  actor: { id: string; type: string; name: string };
  action: string;
  result: 'success' | 'failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface IComplianceReport {
  id: string;
  framework: ComplianceFramework;
  generatedAt: Date;
  complianceScore: number;
  violations: string[];
}

export interface IAuditConfig extends IEngineConfig {
  config: {
    eventRetentionDays: number;
    enableRealTimeLogging: boolean;
    complianceFrameworks: ComplianceFramework[];
  };
}

export interface IAuditEngine extends IEngine {
  readonly config: IAuditConfig;
  logEvent(event: Omit<IAuditEvent, 'id' | 'timestamp'>): Promise<string>;
  generateComplianceReport(framework: ComplianceFramework): Promise<string>;
  getAuditTrail(filters?: any): Promise<IAuditEvent[]>;
}