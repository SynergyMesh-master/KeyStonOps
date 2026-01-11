/**
 * MCP Level 4 - Semantic Autonomy Engines
 * 
 * Main entry point for Level 4 autonomous engines.
 * Provides self-managing, self-evolving, and self-governing capabilities.
 * 
 * @module mcp-level4
 * @version 1.0.0
 */

// Export all interfaces
export * from './interfaces';

// Export all engines
export * from './engines';

// Export integration layer
export * from './integration';

// Engine factory
import { ObservationEngine } from './engines/observation-engine';
import { EvolutionEngine } from './engines/evolution-engine';
import { ReflexEngine } from './engines/reflex-engine';
import { AuditEngine } from './engines/audit-engine';
import {
  IObservationConfig,
  IEvolutionConfig,
  IReflexConfig,
  IAuditConfig
} from './interfaces';

export class EngineFactory {
  static createObservationEngine(config: IObservationConfig): ObservationEngine {
    return new ObservationEngine(config);
  }
  
  static createEvolutionEngine(config: IEvolutionConfig): EvolutionEngine {
    return new EvolutionEngine(config);
  }
  
  static createReflexEngine(config: IReflexConfig): ReflexEngine {
    return new ReflexEngine(config);
  }
  
  static createAuditEngine(config: IAuditConfig): AuditEngine {
    return new AuditEngine(config);
  }
}

// Version info
export const VERSION = '1.0.0';
export const LEVEL = 4;