/**
 * Compliance Checker - Automated compliance validation
 * 
 * Provides comprehensive compliance rule definitions, automated scanning,
 * validation, reporting, and violation detection with alerting.
 * 
 * @module governance/compliance/compliance-checker
 */

import { EventEmitter } from 'events';

/**
 * Compliance framework types
 */
export enum ComplianceFramework {
  SOC2 = 'soc2',
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
  PCI_DSS = 'pci_dss',
  ISO27001 = 'iso27001',
  NIST = 'nist',
  CUSTOM = 'custom'
}

/**
 * Compliance status
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_APPLICABLE = 'not_applicable',
  PENDING = 'pending'
}

/**
 * Compliance severity
 */
export enum ComplianceSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Compliance rule definition
 */
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  category: string;
  severity: ComplianceSeverity;
  requirement: string;
  validation: (context: ComplianceContext) => Promise<ComplianceValidationResult>;
  remediation?: string;
  references?: string[];
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Compliance context for validation
 */
export interface ComplianceContext {
  resource: string;
  resourceType: string;
  attributes: Record<string, unknown>;
  timestamp: Date;
  environment?: string;
}

/**
 * Compliance validation result
 */
export interface ComplianceValidationResult {
  ruleId: string;
  status: ComplianceStatus;
  passed: boolean;
  message: string;
  evidence?: unknown;
  timestamp: Date;
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  framework: ComplianceFramework;
  severity: ComplianceSeverity;
  status: ComplianceStatus;
  message: string;
  context: ComplianceContext;
  remediation?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Compliance scan result
 */
export interface ComplianceScanResult {
  scanId: string;
  framework?: ComplianceFramework;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  skippedRules: number;
  complianceScore: number;
  status: ComplianceStatus;
  violations: ComplianceViolation[];
  validations: ComplianceValidationResult[];
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  reportId: string;
  framework?: ComplianceFramework;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalScans: number;
    averageScore: number;
    totalViolations: number;
    resolvedViolations: number;
    openViolations: number;
  };
  trends: {
    scoreHistory: Array<{ date: Date; score: number }>;
    violationHistory: Array<{ date: Date; count: number }>;
  };
  topViolations: ComplianceViolation[];
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Compliance checker configuration
 */
export interface ComplianceCheckerConfig {
  enableAutoScan?: boolean;
  scanInterval?: number;
  enableAlerts?: boolean;
  alertThreshold?: ComplianceSeverity;
  frameworks?: ComplianceFramework[];
  maxViolationHistory?: number;
}

/**
 * Compliance Checker
 * 
 * Manages compliance rules, scanning, validation, and reporting
 */
export class ComplianceChecker extends EventEmitter {
  private rules: Map<string, ComplianceRule> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();
  private scanHistory: ComplianceScanResult[] = [];
  private config: Required<ComplianceCheckerConfig>;
  private scanTimer?: NodeJS.Timeout;

  constructor(config: ComplianceCheckerConfig = {}) {
    super();
    this.config = {
      enableAutoScan: config.enableAutoScan ?? false,
      scanInterval: config.scanInterval ?? 3600000, // 1 hour
      enableAlerts: config.enableAlerts ?? true,
      alertThreshold: config.alertThreshold ?? ComplianceSeverity.HIGH,
      frameworks: config.frameworks ?? [ComplianceFramework.SOC2],
      maxViolationHistory: config.maxViolationHistory ?? 1000
    };

    if (this.config.enableAutoScan) {
      this.startAutoScan();
    }
  }

  /**
   * Register a compliance rule
   */
  async registerRule(rule: ComplianceRule): Promise<void> {
    // Validate rule
    this.validateRule(rule);

    // Store rule
    this.rules.set(rule.id, rule);

    // Emit event
    this.emit('rule:registered', { rule });
  }

  /**
   * Register multiple rules
   */
  async registerRules(rules: ComplianceRule[]): Promise<void> {
    for (const rule of rules) {
      await this.registerRule(rule);
    }
  }

  /**
   * Unregister a rule
   */
  async unregisterRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
    this.emit('rule:unregistered', { ruleId });
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): ComplianceRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(framework?: ComplianceFramework): ComplianceRule[] {
    const rules = Array.from(this.rules.values());
    if (framework) {
      return rules.filter(r => r.framework === framework);
    }
    return rules;
  }

  /**
   * Scan for compliance violations
   */
  async scan(
    context: ComplianceContext,
    framework?: ComplianceFramework
  ): Promise<ComplianceScanResult> {
    const scanId = this.generateScanId();
    const startedAt = new Date();

    // Get applicable rules
    const rules = framework 
      ? this.getAllRules(framework)
      : Array.from(this.rules.values());

    const enabledRules = rules.filter(r => r.enabled);

    // Validate each rule
    const validations: ComplianceValidationResult[] = [];
    const violations: ComplianceViolation[] = [];

    for (const rule of enabledRules) {
      try {
        const result = await rule.validation(context);
        validations.push(result);

        // Check for violations
        if (!result.passed) {
          const violation = this.createViolation(rule, result, context);
          violations.push(violation);
          this.violations.set(violation.id, violation);

          // Emit alert if threshold met
          if (this.config.enableAlerts && this.shouldAlert(rule.severity)) {
            this.emit('violation:detected', { violation });
          }
        }
      } catch (error) {
        // Log validation error
        this.emit('validation:error', { ruleId: rule.id, error });
      }
    }

    const completedAt = new Date();
    const passedRules = validations.filter(v => v.passed).length;
    const failedRules = validations.filter(v => !v.passed).length;
    const skippedRules = enabledRules.length - validations.length;

    // Calculate compliance score
    const complianceScore = enabledRules.length > 0
      ? (passedRules / enabledRules.length) * 100
      : 100;

    // Determine overall status
    const status = this.determineStatus(complianceScore, failedRules);

    const result: ComplianceScanResult = {
      scanId,
      framework,
      totalRules: enabledRules.length,
      passedRules,
      failedRules,
      skippedRules,
      complianceScore,
      status,
      violations,
      validations,
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime()
    };

    // Store scan result
    this.scanHistory.push(result);

    // Limit history
    if (this.scanHistory.length > this.config.maxViolationHistory) {
      this.scanHistory.shift();
    }

    // Emit event
    this.emit('scan:completed', { result });

    return result;
  }

  /**
   * Scan all frameworks
   */
  async scanAll(context: ComplianceContext): Promise<ComplianceScanResult[]> {
    const results: ComplianceScanResult[] = [];

    for (const framework of this.config.frameworks) {
      const result = await this.scan(context, framework);
      results.push(result);
    }

    return results;
  }

  /**
   * Get compliance violations
   */
  getViolations(
    framework?: ComplianceFramework,
    severity?: ComplianceSeverity,
    resolved?: boolean
  ): ComplianceViolation[] {
    let violations = Array.from(this.violations.values());

    if (framework) {
      violations = violations.filter(v => v.framework === framework);
    }

    if (severity) {
      violations = violations.filter(v => v.severity === severity);
    }

    if (resolved !== undefined) {
      violations = violations.filter(v => 
        resolved ? v.resolvedAt !== undefined : v.resolvedAt === undefined
      );
    }

    return violations;
  }

  /**
   * Resolve a violation
   */
  async resolveViolation(violationId: string, resolution: string): Promise<void> {
    const violation = this.violations.get(violationId);
    if (!violation) {
      throw new Error(`Violation not found: ${violationId}`);
    }

    violation.resolvedAt = new Date();
    violation.metadata = {
      ...violation.metadata,
      resolution
    };

    this.emit('violation:resolved', { violation });
  }

  /**
   * Generate compliance report
   */
  async generateReport(
    framework?: ComplianceFramework,
    period?: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    const reportId = this.generateReportId();
    const now = new Date();
    const defaultPeriod = {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: now
    };

    const reportPeriod = period || defaultPeriod;

    // Filter scans by period
    const scans = this.scanHistory.filter(s => 
      s.completedAt >= reportPeriod.start && 
      s.completedAt <= reportPeriod.end &&
      (!framework || s.framework === framework)
    );

    // Calculate summary
    const totalScans = scans.length;
    const averageScore = totalScans > 0
      ? scans.reduce((sum, s) => sum + s.complianceScore, 0) / totalScans
      : 0;

    const violations = this.getViolations(framework);
    const totalViolations = violations.length;
    const resolvedViolations = violations.filter(v => v.resolvedAt).length;
    const openViolations = totalViolations - resolvedViolations;

    // Generate trends
    const scoreHistory = scans.map(s => ({
      date: s.completedAt,
      score: s.complianceScore
    }));

    const violationHistory = scans.map(s => ({
      date: s.completedAt,
      count: s.violations.length
    }));

    // Get top violations
    const topViolations = violations
      .filter(v => !v.resolvedAt)
      .sort((a, b) => {
        const severityOrder = {
          [ComplianceSeverity.CRITICAL]: 4,
          [ComplianceSeverity.HIGH]: 3,
          [ComplianceSeverity.MEDIUM]: 2,
          [ComplianceSeverity.LOW]: 1
        };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(topViolations);

    const report: ComplianceReport = {
      reportId,
      framework,
      period: reportPeriod,
      summary: {
        totalScans,
        averageScore,
        totalViolations,
        resolvedViolations,
        openViolations
      },
      trends: {
        scoreHistory,
        violationHistory
      },
      topViolations,
      recommendations,
      generatedAt: now
    };

    this.emit('report:generated', { report });

    return report;
  }

  /**
   * Start automatic scanning
   */
  private startAutoScan(): void {
    this.scanTimer = setInterval(() => {
      this.emit('scan:auto', { timestamp: new Date() });
    }, this.config.scanInterval);
  }

  /**
   * Stop automatic scanning
   */
  stopAutoScan(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = undefined;
    }
  }

  /**
   * Validate rule structure
   */
  private validateRule(rule: ComplianceRule): void {
    if (!rule.id || !rule.name || !rule.framework) {
      throw new Error('Rule must have id, name, and framework');
    }

    if (typeof rule.validation !== 'function') {
      throw new Error('Rule must have a validation function');
    }
  }

  /**
   * Create a violation from validation result
   */
  private createViolation(
    rule: ComplianceRule,
    result: ComplianceValidationResult,
    context: ComplianceContext
  ): ComplianceViolation {
    return {
      id: this.generateViolationId(),
      ruleId: rule.id,
      ruleName: rule.name,
      framework: rule.framework,
      severity: rule.severity,
      status: result.status,
      message: result.message,
      context,
      remediation: rule.remediation,
      detectedAt: new Date()
    };
  }

  /**
   * Determine overall compliance status
   */
  private determineStatus(score: number, failedRules: number): ComplianceStatus {
    if (failedRules === 0) {
      return ComplianceStatus.COMPLIANT;
    } else if (score >= 80) {
      return ComplianceStatus.PARTIALLY_COMPLIANT;
    } else {
      return ComplianceStatus.NON_COMPLIANT;
    }
  }

  /**
   * Check if alert should be sent
   */
  private shouldAlert(severity: ComplianceSeverity): boolean {
    const severityOrder = {
      [ComplianceSeverity.LOW]: 1,
      [ComplianceSeverity.MEDIUM]: 2,
      [ComplianceSeverity.HIGH]: 3,
      [ComplianceSeverity.CRITICAL]: 4
    };

    return severityOrder[severity] >= severityOrder[this.config.alertThreshold];
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];

    // Group by framework
    const byFramework = new Map<ComplianceFramework, number>();
    for (const violation of violations) {
      byFramework.set(
        violation.framework,
        (byFramework.get(violation.framework) || 0) + 1
      );
    }

    // Generate framework-specific recommendations
    for (const [framework, count] of byFramework) {
      recommendations.push(
        `Address ${count} ${framework.toUpperCase()} compliance violations`
      );
    }

    // Add remediation recommendations
    const withRemediation = violations.filter(v => v.remediation);
    if (withRemediation.length > 0) {
      recommendations.push(
        `Review remediation steps for ${withRemediation.length} violations`
      );
    }

    return recommendations;
  }

  /**
   * Generate unique scan ID
   */
  private generateScanId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique violation ID
   */
  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get checker statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalViolations: number;
    openViolations: number;
    resolvedViolations: number;
    totalScans: number;
    averageScore: number;
  } {
    const rules = Array.from(this.rules.values());
    const violations = Array.from(this.violations.values());
    const openViolations = violations.filter(v => !v.resolvedAt);
    const resolvedViolations = violations.filter(v => v.resolvedAt);
    const averageScore = this.scanHistory.length > 0
      ? this.scanHistory.reduce((sum, s) => sum + s.complianceScore, 0) / this.scanHistory.length
      : 0;

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalViolations: violations.length,
      openViolations: openViolations.length,
      resolvedViolations: resolvedViolations.length,
      totalScans: this.scanHistory.length,
      averageScore
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoScan();
    this.removeAllListeners();
  }
}

/**
 * Create a compliance checker instance
 */
export function createComplianceChecker(config?: ComplianceCheckerConfig): ComplianceChecker {
  return new ComplianceChecker(config);
}

export default ComplianceChecker;