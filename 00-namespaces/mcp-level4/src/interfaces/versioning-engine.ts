/**
 * MCP Level 4 Versioning Engine Interface
 * Self-versioning for semantic version control
 */

import { IEngine, IEngineConfig } from './core';

export enum VersionType {
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch'
}

export interface IVersion {
  id: string;
  version: string;
  major: number;
  minor: number;
  patch: number;
  status: 'development' | 'stable' | 'deprecated';
  releasedAt?: Date;
  changelog: {
    features: string[];
    bugFixes: string[];
    breakingChanges: string[];
  };
}

export interface IVersioningConfig extends IEngineConfig {
  config: {
    enableAutoVersioning: boolean;
    versioningScheme: 'semantic' | 'calendar';
    enableChangelogGeneration: boolean;
  };
}

export interface IVersioningEngine extends IEngine {
  readonly config: IVersioningConfig;
  createVersion(version: Omit<IVersion, 'id'>): Promise<string>;
  bumpVersion(targetId: string, bumpType: VersionType): Promise<string>;
  compareVersions(version1: string, version2: string): Promise<{ result: 'greater' | 'equal' | 'less' }>;
}