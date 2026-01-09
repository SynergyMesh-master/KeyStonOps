/**
 * Core type definitions for the Taxonomy system
 */

/**
 * Entity domain classification
 */
export enum TaxonomyDomain {
  INFRASTRUCTURE = 'infra',
  GOVERNANCE = 'gov',
  OBSERVABILITY = 'obs',
  INTEGRATION = 'int',
  PLATFORM = 'platform',
  SECURITY = 'sec',
  DATA = 'data'
}

/**
 * Entity type classification
 */
export enum EntityType {
  SERVICE = 'service',
  AGENT = 'agent',
  TOOL = 'tool',
  POLICY = 'policy',
  METRIC = 'metric',
  TRACE = 'trace',
  LOG = 'log',
  RULE = 'rule',
  WORKFLOW = 'workflow',
  PIPELINE = 'pipeline'
}

/**
 * Naming case styles
 */
export enum NamingCase {
  KEBAB = 'kebab',      // kebab-case
  PASCAL = 'pascal',    // PascalCase
  CAMEL = 'camel',      // camelCase
  SNAKE = 'snake',      // snake_case
  CONSTANT = 'constant' // CONSTANT_CASE
}

/**
 * Entity definition for taxonomy mapping
 */
export interface Entity {
  domain: TaxonomyDomain | string;
  name: string;
  type: EntityType | string;
  version?: string;
  modifier?: string;
  metadata?: Record<string, any>;
}

/**
 * Taxonomy path representation
 */
export interface TaxonomyPath {
  domain: string;
  category: string;
  hierarchy: string;
  reference: string;
  canonical: string;
}

/**
 * Resolved name in multiple formats
 */
export interface ResolvedName {
  canonical: string;
  kebab: string;
  pascal: string;
  camel: string;
  snake: string;
  constant: string;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  violations: ValidationViolation[];
  warnings: ValidationViolation[];
  info: ValidationViolation[];
}

/**
 * Validation violation
 */
export interface ValidationViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * Taxonomy configuration
 */
export interface TaxonomyConfig {
  version: string;
  domains: TaxonomyDomain[];
  entityTypes: EntityType[];
  validationRules: ValidationRule[];
  namingPatterns: Record<string, string>;
  customRules?: ValidationRule[];
}

/**
 * Mapping options
 */
export interface MappingOptions {
  includeVersion?: boolean;
  includeModifier?: boolean;
  separator?: string;
  caseStyle?: NamingCase;
}

/**
 * Taxonomy metadata
 */
export interface TaxonomyMetadata {
  created: Date;
  updated: Date;
  version: string;
  author?: string;
  description?: string;
  tags?: string[];
}

/**
 * Compliance check result
 */
export interface ComplianceResult {
  compliant: boolean;
  score: number;
  violations: ValidationViolation[];
  recommendations: string[];
}

/**
 * Taxonomy registry entry
 */
export interface TaxonomyEntry {
  id: string;
  path: TaxonomyPath;
  entity: Entity;
  metadata: TaxonomyMetadata;
  aliases?: string[];
}

/**
 * Pattern template
 */
export interface PatternTemplate {
  id: string;
  pattern: string;
  description: string;
  examples: string[];
  variables: string[];
}

/**
 * Transformation rule
 */
export interface TransformationRule {
  from: NamingCase;
  to: NamingCase;
  transform: (input: string) => string;
}