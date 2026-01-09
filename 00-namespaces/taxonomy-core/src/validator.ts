/**
 * TaxonomyValidator - Naming validation and compliance checking
 */

import {
  ValidationRule,
  ValidationResult,
  ValidationViolation,
  ComplianceResult,
  TaxonomyDomain,
  EntityType
} from './types';

export class TaxonomyValidator {
  private static rules: ValidationRule[] = [
    {
      id: 'kebab-case',
      pattern: /^[a-z]+(-[a-z0-9]+)*$/,
      message: 'Names must use kebab-case (lowercase with hyphens)',
      severity: 'error'
    },
    {
      id: 'domain-prefix',
      pattern: /^(infra|gov|obs|int|platform|sec|data)-/,
      message: 'Names must start with valid domain prefix',
      severity: 'error'
    },
    {
      id: 'no-consecutive-hyphens',
      pattern: /^(?!.*--)/,
      message: 'Names must not contain consecutive hyphens',
      severity: 'error'
    },
    {
      id: 'no-leading-hyphen',
      pattern: /^[^-]/,
      message: 'Names must not start with a hyphen',
      severity: 'error'
    },
    {
      id: 'no-trailing-hyphen',
      pattern: /[^-]$/,
      message: 'Names must not end with a hyphen',
      severity: 'error'
    },
    {
      id: 'max-length',
      pattern: /^.{1,253}$/,
      message: 'Names must be between 1 and 253 characters',
      severity: 'error'
    },
    {
      id: 'min-parts',
      pattern: /^[a-z]+-[a-z]+-[a-z]+/,
      message: 'Names must have at least 3 parts: {domain}-{name}-{type}',
      severity: 'error'
    },
    {
      id: 'version-format',
      pattern: /^(?!.*-v\d+$)|.*-v\d+(\.\d+)*$/,
      message: 'Version must follow format: -v1, -v1.2, -v1.2.3',
      severity: 'warning'
    }
  ];

  /**
   * Validate a name against all rules
   */
  public static validate(name: string): ValidationResult {
    const violations: ValidationViolation[] = [];
    const warnings: ValidationViolation[] = [];
    const info: ValidationViolation[] = [];

    for (const rule of this.rules) {
      if (!rule.pattern.test(name)) {
        const violation: ValidationViolation = {
          rule: rule.id,
          message: rule.message,
          severity: rule.severity,
          suggestion: this.generateSuggestion(name, rule)
        };

        switch (rule.severity) {
          case 'error':
            violations.push(violation);
            break;
          case 'warning':
            warnings.push(violation);
            break;
          case 'info':
            info.push(violation);
            break;
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      info
    };
  }

  /**
   * Generate suggestion for fixing violation
   */
  private static generateSuggestion(name: string, rule: ValidationRule): string {
    switch (rule.id) {
      case 'kebab-case':
        return `Try: ${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
      case 'domain-prefix':
        return `Try: infra-${name}`;
      case 'no-consecutive-hyphens':
        return `Try: ${name.replace(/--+/g, '-')}`;
      case 'no-leading-hyphen':
        return `Try: ${name.replace(/^-+/, '')}`;
      case 'no-trailing-hyphen':
        return `Try: ${name.replace(/-+$/, '')}`;
      case 'max-length':
        return `Try: ${name.substring(0, 253)}`;
      default:
        return 'Please review the naming guidelines';
    }
  }

  /**
   * Validate multiple names
   */
  public static validateMany(names: string[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    
    for (const name of names) {
      results.set(name, this.validate(name));
    }
    
    return results;
  }

  /**
   * Check compliance score
   */
  public static checkCompliance(names: string[]): ComplianceResult {
    const results = this.validateMany(names);
    const totalNames = names.length;
    const validNames = Array.from(results.values()).filter(r => r.valid).length;
    const score = totalNames > 0 ? (validNames / totalNames) * 100 : 0;

    const allViolations: ValidationViolation[] = [];
    const recommendations: string[] = [];

    for (const [name, result] of results) {
      if (!result.valid) {
        allViolations.push(...result.violations);
        recommendations.push(`Fix: ${name} - ${result.violations[0]?.message}`);
      }
    }

    return {
      compliant: score >= 95,
      score,
      violations: allViolations,
      recommendations: recommendations.slice(0, 10) // Top 10 recommendations
    };
  }

  /**
   * Validate domain
   */
  public static validateDomain(domain: string): boolean {
    const validDomains = Object.values(TaxonomyDomain);
    return validDomains.includes(domain as TaxonomyDomain);
  }

  /**
   * Validate entity type
   */
  public static validateEntityType(type: string): boolean {
    const validTypes = Object.values(EntityType);
    return validTypes.includes(type as EntityType);
  }

  /**
   * Validate version format
   */
  public static validateVersion(version: string): boolean {
    return /^v\d+(\.\d+)*$/.test(version);
  }

  /**
   * Add custom validation rule
   */
  public static addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove validation rule
   */
  public static removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Get all validation rules
   */
  public static getRules(): ValidationRule[] {
    return [...this.rules];
  }

  /**
   * Get rules by severity
   */
  public static getRulesBySeverity(severity: 'error' | 'warning' | 'info'): ValidationRule[] {
    return this.rules.filter(r => r.severity === severity);
  }

  /**
   * Quick validation (only errors)
   */
  public static quickValidate(name: string): boolean {
    const result = this.validate(name);
    return result.valid;
  }

  /**
   * Validate and fix
   */
  public static validateAndFix(name: string): { fixed: string; changes: string[] } {
    const changes: string[] = [];
    let fixed = name;

    // Fix lowercase
    if (fixed !== fixed.toLowerCase()) {
      fixed = fixed.toLowerCase();
      changes.push('Converted to lowercase');
    }

    // Fix consecutive hyphens
    if (/--+/.test(fixed)) {
      fixed = fixed.replace(/--+/g, '-');
      changes.push('Removed consecutive hyphens');
    }

    // Fix leading/trailing hyphens
    if (/^-/.test(fixed)) {
      fixed = fixed.replace(/^-+/, '');
      changes.push('Removed leading hyphen');
    }
    if (/-$/.test(fixed)) {
      fixed = fixed.replace(/-+$/, '');
      changes.push('Removed trailing hyphen');
    }

    // Fix invalid characters
    if (/[^a-z0-9-]/.test(fixed)) {
      fixed = fixed.replace(/[^a-z0-9-]/g, '-');
      changes.push('Replaced invalid characters with hyphens');
    }

    // Fix length
    if (fixed.length > 253) {
      fixed = fixed.substring(0, 253);
      changes.push('Truncated to 253 characters');
    }

    return { fixed, changes };
  }

  /**
   * Batch validate and fix
   */
  public static validateAndFixMany(names: string[]): Map<string, { fixed: string; changes: string[] }> {
    const results = new Map<string, { fixed: string; changes: string[] }>();
    
    for (const name of names) {
      results.set(name, this.validateAndFix(name));
    }
    
    return results;
  }

  /**
   * Generate validation report
   */
  public static generateReport(names: string[]): string {
    const results = this.validateMany(names);
    const compliance = this.checkCompliance(names);

    let report = '# Taxonomy Validation Report\n\n';
    report += `## Summary\n`;
    report += `- Total Names: ${names.length}\n`;
    report += `- Valid Names: ${Array.from(results.values()).filter(r => r.valid).length}\n`;
    report += `- Compliance Score: ${compliance.score.toFixed(2)}%\n`;
    report += `- Status: ${compliance.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n\n`;

    report += `## Violations\n`;
    for (const [name, result] of results) {
      if (!result.valid) {
        report += `\n### ${name}\n`;
        for (const violation of result.violations) {
          report += `- ❌ ${violation.message}\n`;
          if (violation.suggestion) {
            report += `  💡 ${violation.suggestion}\n`;
          }
        }
      }
    }

    if (compliance.recommendations.length > 0) {
      report += `\n## Recommendations\n`;
      for (const rec of compliance.recommendations) {
        report += `- ${rec}\n`;
      }
    }

    return report;
  }
}