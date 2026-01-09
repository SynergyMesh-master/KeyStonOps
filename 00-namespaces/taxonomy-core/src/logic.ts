/**
 * UnifiedNamingLogic - Unified naming resolution and transformation
 */

import {
  Entity,
  ResolvedName,
  NamingCase,
  TransformationRule
} from './types';
import { TaxonomyMapper } from './mapper';

export class UnifiedNamingLogic {
  private static transformationRules: TransformationRule[] = [
    {
      from: NamingCase.KEBAB,
      to: NamingCase.PASCAL,
      transform: (input: string) => 
        input.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
    },
    {
      from: NamingCase.KEBAB,
      to: NamingCase.CAMEL,
      transform: (input: string) => {
        const pascal = input.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
      }
    },
    {
      from: NamingCase.KEBAB,
      to: NamingCase.SNAKE,
      transform: (input: string) => input.replace(/-/g, '_')
    },
    {
      from: NamingCase.KEBAB,
      to: NamingCase.CONSTANT,
      transform: (input: string) => input.replace(/-/g, '_').toUpperCase()
    }
  ];

  /**
   * Resolve entity to all naming formats
   */
  public static resolve(entity: Entity | string): ResolvedName {
    const path = TaxonomyMapper.map(entity);
    const canonical = path.canonical;

    return {
      canonical,
      kebab: canonical,
      pascal: this.transform(canonical, NamingCase.KEBAB, NamingCase.PASCAL),
      camel: this.transform(canonical, NamingCase.KEBAB, NamingCase.CAMEL),
      snake: this.transform(canonical, NamingCase.KEBAB, NamingCase.SNAKE),
      constant: this.transform(canonical, NamingCase.KEBAB, NamingCase.CONSTANT)
    };
  }

  /**
   * Transform name from one case to another
   */
  public static transform(input: string, from: NamingCase, to: NamingCase): string {
    if (from === to) {
      return input;
    }

    const rule = this.transformationRules.find(r => r.from === from && r.to === to);
    
    if (!rule) {
      throw new Error(`No transformation rule found for ${from} to ${to}`);
    }

    return rule.transform(input);
  }

  /**
   * Detect naming case style
   */
  public static detectCase(input: string): NamingCase {
    if (/^[a-z]+(-[a-z]+)*$/.test(input)) {
      return NamingCase.KEBAB;
    }
    if (/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
      return NamingCase.PASCAL;
    }
    if (/^[a-z][a-zA-Z0-9]*$/.test(input)) {
      return NamingCase.CAMEL;
    }
    if (/^[a-z]+(_[a-z]+)*$/.test(input)) {
      return NamingCase.SNAKE;
    }
    if (/^[A-Z]+(_[A-Z]+)*$/.test(input)) {
      return NamingCase.CONSTANT;
    }
    
    throw new Error(`Unable to detect case style for: ${input}`);
  }

  /**
   * Normalize name to canonical format (kebab-case)
   */
  public static normalize(input: string): string {
    const caseStyle = this.detectCase(input);
    
    switch (caseStyle) {
      case NamingCase.KEBAB:
        return input;
      case NamingCase.PASCAL:
        return this.pascalToKebab(input);
      case NamingCase.CAMEL:
        return this.camelToKebab(input);
      case NamingCase.SNAKE:
        return input.replace(/_/g, '-');
      case NamingCase.CONSTANT:
        return input.toLowerCase().replace(/_/g, '-');
      default:
        return input;
    }
  }

  /**
   * Convert PascalCase to kebab-case
   */
  private static pascalToKebab(input: string): string {
    return input
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Convert camelCase to kebab-case
   */
  private static camelToKebab(input: string): string {
    return input
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase();
  }

  /**
   * Validate naming consistency
   */
  public static validateConsistency(names: string[]): boolean {
    if (names.length === 0) {
      return true;
    }

    const firstCase = this.detectCase(names[0]);
    
    return names.every(name => {
      try {
        return this.detectCase(name) === firstCase;
      } catch {
        return false;
      }
    });
  }

  /**
   * Suggest naming improvements
   */
  public static suggest(input: string): string[] {
    const suggestions: string[] = [];
    
    try {
      const normalized = this.normalize(input);
      const resolved = this.resolve(normalized);
      
      suggestions.push(`Canonical: ${resolved.canonical}`);
      suggestions.push(`PascalCase: ${resolved.pascal}`);
      suggestions.push(`camelCase: ${resolved.camel}`);
      suggestions.push(`snake_case: ${resolved.snake}`);
      suggestions.push(`CONSTANT_CASE: ${resolved.constant}`);
    } catch (error) {
      suggestions.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return suggestions;
  }

  /**
   * Batch resolve multiple entities
   */
  public static resolveMany(entities: (Entity | string)[]): ResolvedName[] {
    return entities.map(entity => this.resolve(entity));
  }

  /**
   * Compare two names for equivalence
   */
  public static areEquivalent(name1: string, name2: string): boolean {
    try {
      const normalized1 = this.normalize(name1);
      const normalized2 = this.normalize(name2);
      return normalized1 === normalized2;
    } catch {
      return false;
    }
  }

  /**
   * Generate variations of a name
   */
  public static generateVariations(input: string): Record<string, string> {
    const normalized = this.normalize(input);
    const resolved = this.resolve(normalized);
    
    return {
      ...resolved,
      'dot.notation': normalized.replace(/-/g, '.'),
      'slash/notation': normalized.replace(/-/g, '/'),
      'colon:notation': normalized.replace(/-/g, ':')
    };
  }

  /**
   * Add custom transformation rule
   */
  public static addTransformationRule(rule: TransformationRule): void {
    this.transformationRules.push(rule);
  }

  /**
   * Get all transformation rules
   */
  public static getTransformationRules(): TransformationRule[] {
    return [...this.transformationRules];
  }
}