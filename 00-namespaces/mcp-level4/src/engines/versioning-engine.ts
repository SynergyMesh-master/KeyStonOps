/**
 * MCP Level 4 - Versioning Engine
 * 
 * Implements self-versioning capabilities for autonomous version management.
 * Handles semantic versioning, compatibility checking, and version lifecycle.
 * 
 * @module VersioningEngine
 * @version 1.0.0
 */

import {
  IVersioningEngine,
  IVersioningConfig,
  IVersioningMetrics,
  IVersion,
  IVersionCompatibility,
  IVersionMigration,
  VersionType,
  CompatibilityLevel
} from '../interfaces/versioning-engine';
import { IEngine, IEngineConfig, IEngineMetrics } from '../interfaces/core';

/**
 * VersioningEngine - Autonomous version management
 * 
 * Features:
 * - Semantic versioning (MAJOR.MINOR.PATCH)
 * - Automatic version bumping based on changes
 * - Compatibility checking between versions
 * - Version migration planning
 * - Deprecation management
 * - Version lifecycle tracking
 * 
 * Performance Targets:
 * - Version creation: <100ms
 * - Compatibility check: <50ms
 * - Migration plan generation: <500ms
 * - Success rate: >99.9%
 */
export class VersioningEngine implements IVersioningEngine, IEngine {
  private config: IVersioningConfig;
  private metrics: IVersioningMetrics;
  private versions: Map<string, IVersion>;
  private compatibilityMatrix: Map<string, Map<string, IVersionCompatibility>>;
  private migrations: Map<string, IVersionMigration[]>;

  constructor(config: IVersioningConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
    this.versions = new Map();
    this.compatibilityMatrix = new Map();
    this.migrations = new Map();
  }

  /**
   * Initialize versioning metrics
   */
  private initializeMetrics(): IVersioningMetrics {
    return {
      totalVersions: 0,
      activeVersions: 0,
      deprecatedVersions: 0,
      retiredVersions: 0,
      compatibilityChecks: 0,
      compatibilityFailures: 0,
      migrationsExecuted: 0,
      migrationFailures: 0,
      versionsByType: {
        major: 0,
        minor: 0,
        patch: 0,
        prerelease: 0
      }
    };
  }

  /**
   * Create a new version
   */
  async createVersion(
    artifactId: string,
    versionType: VersionType,
    changes: string[],
    metadata?: Record<string, any>
  ): Promise<IVersion> {
    const currentVersion = this.getCurrentVersion(artifactId);
    const newVersionNumber = this.calculateNextVersion(currentVersion, versionType);

    const version: IVersion = {
      id: `${artifactId}@${newVersionNumber}`,
      artifactId,
      version: newVersionNumber,
      type: versionType,
      changes,
      metadata: metadata || {},
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.versions.set(version.id, version);
    this.metrics.totalVersions++;
    this.metrics.activeVersions++;
    this.metrics.versionsByType[versionType]++;

    // Initialize compatibility matrix for new version
    this.initializeCompatibility(version);

    return version;
  }

  /**
   * Check compatibility between versions
   */
  async checkCompatibility(
    sourceVersion: string,
    targetVersion: string
  ): Promise<IVersionCompatibility> {
    this.metrics.compatibilityChecks++;

    const source = this.parseVersion(sourceVersion);
    const target = this.parseVersion(targetVersion);

    const compatibility: IVersionCompatibility = {
      sourceVersion,
      targetVersion,
      level: this.determineCompatibilityLevel(source, target),
      breakingChanges: [],
      warnings: [],
      recommendations: [],
      migrationRequired: false
    };

    // Check for breaking changes
    if (target.major > source.major) {
      compatibility.breakingChanges.push('Major version change detected');
      compatibility.migrationRequired = true;
    }

    // Check for deprecations
    if (target.minor > source.minor) {
      compatibility.warnings.push('Minor version change may include deprecations');
    }

    // Add recommendations
    if (compatibility.migrationRequired) {
      compatibility.recommendations.push('Review migration guide before upgrading');
      compatibility.recommendations.push('Test in staging environment first');
    }

    // Store in compatibility matrix
    if (!this.compatibilityMatrix.has(sourceVersion)) {
      this.compatibilityMatrix.set(sourceVersion, new Map());
    }
    this.compatibilityMatrix.get(sourceVersion)!.set(targetVersion, compatibility);

    if (compatibility.level === 'incompatible') {
      this.metrics.compatibilityFailures++;
    }

    return compatibility;
  }

  /**
   * Generate migration plan
   */
  async generateMigrationPlan(
    sourceVersion: string,
    targetVersion: string
  ): Promise<IVersionMigration> {
    const compatibility = await this.checkCompatibility(sourceVersion, targetVersion);

    const migration: IVersionMigration = {
      id: `migration-${sourceVersion}-to-${targetVersion}`,
      sourceVersion,
      targetVersion,
      steps: [],
      estimatedDuration: 0,
      risks: [],
      rollbackPlan: {
        steps: []
      },
      status: 'pending',
      createdAt: new Date()
    };

    // Generate migration steps based on compatibility
    if (compatibility.level === 'incompatible') {
      migration.steps.push({
        order: 1,
        action: 'backup_current_state',
        description: 'Create backup of current version',
        estimatedDuration: 300000 // 5 min
      });
      migration.steps.push({
        order: 2,
        action: 'apply_breaking_changes',
        description: 'Apply breaking changes from target version',
        estimatedDuration: 600000 // 10 min
      });
      migration.risks.push('Breaking changes may cause service disruption');
    }

    if (compatibility.level === 'partial') {
      migration.steps.push({
        order: 1,
        action: 'update_deprecated_apis',
        description: 'Update deprecated API calls',
        estimatedDuration: 300000 // 5 min
      });
    }

    migration.steps.push({
      order: migration.steps.length + 1,
      action: 'update_version',
      description: 'Update to target version',
      estimatedDuration: 180000 // 3 min
    });

    migration.steps.push({
      order: migration.steps.length + 1,
      action: 'run_tests',
      description: 'Run compatibility tests',
      estimatedDuration: 300000 // 5 min
    });

    migration.steps.push({
      order: migration.steps.length + 1,
      action: 'verify_migration',
      description: 'Verify migration success',
      estimatedDuration: 120000 // 2 min
    });

    // Calculate total estimated duration
    migration.estimatedDuration = migration.steps.reduce(
      (total, step) => total + (step.estimatedDuration || 0),
      0
    );

    // Generate rollback plan
    migration.rollbackPlan.steps = [
      {
        order: 1,
        action: 'restore_backup',
        description: 'Restore from backup'
      },
      {
        order: 2,
        action: 'verify_rollback',
        description: 'Verify rollback success'
      }
    ];

    // Store migration plan
    if (!this.migrations.has(sourceVersion)) {
      this.migrations.set(sourceVersion, []);
    }
    this.migrations.get(sourceVersion)!.push(migration);

    return migration;
  }

  /**
   * Execute migration
   */
  async executeMigration(migrationId: string): Promise<boolean> {
    const migration = this.findMigration(migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    migration.status = 'in_progress';
    migration.startedAt = new Date();

    try {
      // Execute each migration step
      for (const step of migration.steps) {
        await this.executeMigrationStep(migration, step);
      }

      migration.status = 'completed';
      migration.completedAt = new Date();
      this.metrics.migrationsExecuted++;

      return true;

    } catch (error) {
      migration.status = 'failed';
      migration.error = error instanceof Error ? error.message : String(error);
      this.metrics.migrationFailures++;

      // Execute rollback
      await this.rollbackMigration(migration);

      return false;
    }
  }

  /**
   * Deprecate a version
   */
  async deprecateVersion(
    versionId: string,
    reason: string,
    sunsetDate?: Date
  ): Promise<boolean> {
    const version = this.versions.get(versionId);
    if (!version) {
      return false;
    }

    version.status = 'deprecated';
    version.deprecatedAt = new Date();
    version.deprecationReason = reason;
    version.sunsetDate = sunsetDate;
    version.updatedAt = new Date();

    this.metrics.activeVersions--;
    this.metrics.deprecatedVersions++;

    return true;
  }

  /**
   * Retire a version
   */
  async retireVersion(versionId: string): Promise<boolean> {
    const version = this.versions.get(versionId);
    if (!version) {
      return false;
    }

    version.status = 'retired';
    version.retiredAt = new Date();
    version.updatedAt = new Date();

    this.metrics.deprecatedVersions--;
    this.metrics.retiredVersions++;

    return true;
  }

  /**
   * Get version information
   */
  async getVersion(versionId: string): Promise<IVersion | undefined> {
    return this.versions.get(versionId);
  }

  /**
   * List all versions for an artifact
   */
  async listVersions(artifactId: string): Promise<IVersion[]> {
    return Array.from(this.versions.values())
      .filter(v => v.artifactId === artifactId)
      .sort((a, b) => this.compareVersions(b.version, a.version));
  }

  /**
   * Get latest version
   */
  async getLatestVersion(artifactId: string): Promise<IVersion | undefined> {
    const versions = await this.listVersions(artifactId);
    return versions.find(v => v.status === 'active');
  }

  // Helper methods

  private getCurrentVersion(artifactId: string): string {
    const versions = Array.from(this.versions.values())
      .filter(v => v.artifactId === artifactId && v.status === 'active')
      .sort((a, b) => this.compareVersions(b.version, a.version));

    return versions.length > 0 ? versions[0].version : '0.0.0';
  }

  private calculateNextVersion(currentVersion: string, type: VersionType): string {
    const parts = this.parseVersion(currentVersion);

    switch (type) {
      case 'major':
        return `${parts.major + 1}.0.0`;
      case 'minor':
        return `${parts.major}.${parts.minor + 1}.0`;
      case 'patch':
        return `${parts.major}.${parts.minor}.${parts.patch + 1}`;
      case 'prerelease':
        return `${parts.major}.${parts.minor}.${parts.patch}-${Date.now()}`;
      default:
        throw new Error(`Unknown version type: ${type}`);
    }
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number; prerelease?: string } {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4]
    };
  }

  private compareVersions(a: string, b: string): number {
    const aParts = this.parseVersion(a);
    const bParts = this.parseVersion(b);

    if (aParts.major !== bParts.major) {
      return aParts.major - bParts.major;
    }
    if (aParts.minor !== bParts.minor) {
      return aParts.minor - bParts.minor;
    }
    if (aParts.patch !== bParts.patch) {
      return aParts.patch - bParts.patch;
    }

    // Handle prerelease versions
    if (aParts.prerelease && !bParts.prerelease) return -1;
    if (!aParts.prerelease && bParts.prerelease) return 1;
    if (aParts.prerelease && bParts.prerelease) {
      return aParts.prerelease.localeCompare(bParts.prerelease);
    }

    return 0;
  }

  private determineCompatibilityLevel(
    source: ReturnType<typeof this.parseVersion>,
    target: ReturnType<typeof this.parseVersion>
  ): CompatibilityLevel {
    // Major version change = incompatible
    if (target.major > source.major) {
      return 'incompatible';
    }

    // Same major, higher minor = backward compatible
    if (target.major === source.major && target.minor > source.minor) {
      return 'backward';
    }

    // Same major and minor, higher patch = fully compatible
    if (target.major === source.major && target.minor === source.minor && target.patch > source.patch) {
      return 'full';
    }

    // Downgrade = partial compatibility
    if (this.compareVersions(target.major + '.' + target.minor + '.' + target.patch, 
                            source.major + '.' + source.minor + '.' + source.patch) < 0) {
      return 'partial';
    }

    return 'full';
  }

  private initializeCompatibility(version: IVersion): void {
    if (!this.compatibilityMatrix.has(version.version)) {
      this.compatibilityMatrix.set(version.version, new Map());
    }
  }

  private findMigration(migrationId: string): IVersionMigration | undefined {
    for (const migrations of this.migrations.values()) {
      const migration = migrations.find(m => m.id === migrationId);
      if (migration) {
        return migration;
      }
    }
    return undefined;
  }

  private async executeMigrationStep(migration: IVersionMigration, step: any): Promise<void> {
    // Implementation would execute migration step
    await this.sleep(step.estimatedDuration || 1000);
  }

  private async rollbackMigration(migration: IVersionMigration): Promise<void> {
    // Implementation would rollback migration
    for (const step of migration.rollbackPlan.steps) {
      await this.sleep(1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // IEngine implementation

  async initialize(): Promise<void> {
    // Initialize versioning engine
  }

  async start(): Promise<void> {
    // Start versioning engine
  }

  async stop(): Promise<void> {
    // Stop versioning engine
  }

  async getConfig(): Promise<IEngineConfig> {
    return this.config;
  }

  async getMetrics(): Promise<IEngineMetrics> {
    return this.metrics;
  }

  async healthCheck(): Promise<boolean> {
    return this.versions.size < 10000; // Healthy if not overloaded
  }
}