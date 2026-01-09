/**
 * TaxonomyMapper - Entity to taxonomy path mapping
 */

import {
  Entity,
  TaxonomyPath,
  MappingOptions,
  NamingCase
} from './types';
import { Taxonomy } from './taxonomy';

export class TaxonomyMapper {
  /**
   * Map entity to taxonomy path
   */
  public static map(entity: Entity | string, options?: MappingOptions): TaxonomyPath {
    return Taxonomy.map(entity);
  }

  /**
   * Map multiple entities
   */
  public static mapMany(entities: (Entity | string)[]): TaxonomyPath[] {
    return entities.map(entity => this.map(entity));
  }

  /**
   * Reverse map - from canonical name to entity
   */
  public static reverseMap(canonical: string): Entity {
    const parts = canonical.split('-');
    
    if (parts.length < 3) {
      throw new Error(`Invalid canonical name: ${canonical}`);
    }

    return {
      domain: parts[0],
      name: parts[1],
      type: parts[2],
      version: parts[3],
      modifier: parts[4]
    };
  }

  /**
   * Map to specific case style
   */
  public static mapToCase(entity: Entity | string, caseStyle: NamingCase): string {
    const path = this.map(entity);
    
    switch (caseStyle) {
      case NamingCase.KEBAB:
        return path.canonical;
      case NamingCase.PASCAL:
        return this.toPascalCase(path.canonical);
      case NamingCase.CAMEL:
        return this.toCamelCase(path.canonical);
      case NamingCase.SNAKE:
        return this.toSnakeCase(path.canonical);
      case NamingCase.CONSTANT:
        return this.toConstantCase(path.canonical);
      default:
        return path.canonical;
    }
  }

  /**
   * Convert to PascalCase
   */
  private static toPascalCase(input: string): string {
    return input
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Convert to camelCase
   */
  private static toCamelCase(input: string): string {
    const pascal = this.toPascalCase(input);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Convert to snake_case
   */
  private static toSnakeCase(input: string): string {
    return input.replace(/-/g, '_');
  }

  /**
   * Convert to CONSTANT_CASE
   */
  private static toConstantCase(input: string): string {
    return this.toSnakeCase(input).toUpperCase();
  }

  /**
   * Map with custom separator
   */
  public static mapWithSeparator(entity: Entity | string, separator: string): string {
    const path = this.map(entity);
    return path.canonical.replace(/-/g, separator);
  }

  /**
   * Map to namespace path
   */
  public static mapToNamespace(entity: Entity | string): string {
    const path = this.map(entity);
    return path.hierarchy.replace(/\//g, '.');
  }

  /**
   * Map to file path
   */
  public static mapToFilePath(entity: Entity | string, extension?: string): string {
    const path = this.map(entity);
    const filePath = path.hierarchy.replace(/\//g, '/');
    return extension ? `${filePath}.${extension}` : filePath;
  }

  /**
   * Map to URL path
   */
  public static mapToUrlPath(entity: Entity | string): string {
    const path = this.map(entity);
    return `/${path.hierarchy}`;
  }

  /**
   * Map to package name
   */
  public static mapToPackageName(entity: Entity | string, scope?: string): string {
    const path = this.map(entity);
    const packageName = path.canonical;
    return scope ? `@${scope}/${packageName}` : packageName;
  }

  /**
   * Map to Docker image name
   */
  public static mapToDockerImage(entity: Entity | string, registry?: string): string {
    const path = this.map(entity);
    const imageName = path.canonical;
    return registry ? `${registry}/${imageName}` : imageName;
  }

  /**
   * Map to Kubernetes resource name
   */
  public static mapToK8sResource(entity: Entity | string): string {
    const path = this.map(entity);
    // Kubernetes names must be lowercase and max 253 chars
    return path.canonical.toLowerCase().substring(0, 253);
  }

  /**
   * Map to environment variable name
   */
  public static mapToEnvVar(entity: Entity | string): string {
    return this.mapToCase(entity, NamingCase.CONSTANT);
  }

  /**
   * Map to class name
   */
  public static mapToClassName(entity: Entity | string): string {
    return this.mapToCase(entity, NamingCase.PASCAL);
  }

  /**
   * Map to function name
   */
  public static mapToFunctionName(entity: Entity | string): string {
    return this.mapToCase(entity, NamingCase.CAMEL);
  }

  /**
   * Map to database table name
   */
  public static mapToTableName(entity: Entity | string): string {
    return this.mapToCase(entity, NamingCase.SNAKE);
  }

  /**
   * Batch mapping with different formats
   */
  public static mapToAllFormats(entity: Entity | string): Record<string, string> {
    const path = this.map(entity);
    
    return {
      canonical: path.canonical,
      kebab: path.canonical,
      pascal: this.toPascalCase(path.canonical),
      camel: this.toCamelCase(path.canonical),
      snake: this.toSnakeCase(path.canonical),
      constant: this.toConstantCase(path.canonical),
      namespace: this.mapToNamespace(entity),
      filePath: this.mapToFilePath(entity),
      urlPath: this.mapToUrlPath(entity),
      packageName: this.mapToPackageName(entity),
      className: this.mapToClassName(entity),
      functionName: this.mapToFunctionName(entity),
      tableName: this.mapToTableName(entity)
    };
  }
}