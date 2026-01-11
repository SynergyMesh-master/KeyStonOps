/**
 * MCP Level 4 Encapsulation Engine Interface
 * Self-encapsulation for modularity management
 */

import { IEngine, IEngineConfig } from './core';

export enum ModuleVisibility {
  PUBLIC = 'public',
  PROTECTED = 'protected',
  PRIVATE = 'private'
}

export interface IModule {
  id: string;
  name: string;
  version: string;
  visibility: ModuleVisibility;
  dependencies: string[];
}

export interface IBoundary {
  id: string;
  name: string;
  modules: string[];
  policies: Array<{ name: string; rules: any }>;
}

export interface IEncapsulationConfig extends IEngineConfig {
  config: {
    enableAutoBoundaryEnforcement: boolean;
    enableDependencyAnalysis: boolean;
    maxDependencyDepth: number;
  };
}

export interface IEncapsulationEngine extends IEngine {
  readonly config: IEncapsulationConfig;
  registerModule(module: Omit<IModule, 'id'>): Promise<string>;
  createBoundary(boundary: Omit<IBoundary, 'id'>): Promise<string>;
  analyzeDependencies(): Promise<{ totalModules: number; circularDependencies: string[][] }>;
}