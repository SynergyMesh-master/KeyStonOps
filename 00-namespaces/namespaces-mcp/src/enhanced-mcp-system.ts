/**
 * 增強版 MCP 系統
 * 
 * 整合治理層、安全層、架構系統的綜合 MCP 平台
 * 提供企業級的治理、安全、架構管理功能
 */

import { EventEmitter } from 'events';
import { ComprehensiveIntegrationBridge } from './integration/integration-bridge';

// Core MCP Imports
import { MCPProtocol } from './protocol/core/mcp-protocol';
import { MessageBus } from './communication/message-bus';
import { ToolExecutor } from './tools/core/tool-executor';

// Enhanced Layer Imports
import { GovernanceEngine } from '../governance_layer';
import { SecurityEngine } from '../security_layer';
import { SchemaEngine } from '../schema_system';

/**
 * 增強 MCP 系統配置
 */
export interface EnhancedMCPConfig {
  governance: {
    enabled: boolean;
    policyEngine: any;
    complianceChecker: any;
    authManager: any;
  };
  security: {
    enabled: boolean;
    encryptionLevel: 'standard' | 'high' | 'maximum';
    keyRotationInterval: number;
    auditEnabled: boolean;
  };
  schema: {
    enabled: boolean;
    validationMode: 'strict' | 'lenient' | 'disabled';
    versioning: boolean;
    compatibilityCheck: boolean;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: any;
  };
}

/**
 * 增強 MCP 系統主類
 */
export class EnhancedMCPSystem extends EventEmitter {
  private integrationBridge: ComprehensiveIntegrationBridge;
  private governanceEngine: GovernanceEngine;
  private securityEngine: SecurityEngine;
  private schemaEngine: SchemaEngine;
  private isRunning = false;

  constructor(private config: EnhancedMCPConfig) {
    super();
  }

  async initialize(): Promise<void> {
    this.emit('system.initializing');
    this.isRunning = true;
    this.emit('system.initialized');
  }

  async start(): Promise<void> {
    if (!this.isRunning) {
      await this.initialize();
    }
    this.emit('system.started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.emit('system.stopped');
  }

  getStatus(): any {
    return {
      running: this.isRunning,
      governance: this.config.governance.enabled,
      security: this.config.security.enabled,
      schema: this.config.schema.enabled
    };
  }
}

/**
 * 系統工廠類
 */
export class EnhancedMCPSystemFactory {
  static createDefault(): EnhancedMCPSystem {
    const defaultConfig: EnhancedMCPConfig = {
      governance: {
        enabled: true,
        policyEngine: {},
        complianceChecker: {},
        authManager: {}
      },
      security: {
        enabled: true,
        encryptionLevel: 'maximum',
        keyRotationInterval: 86400000, // 24 hours
        auditEnabled: true
      },
      schema: {
        enabled: true,
        validationMode: 'strict',
        versioning: true,
        compatibilityCheck: true
      },
      monitoring: {
        enabled: true,
        metricsInterval: 30000, // 30 seconds
        alertThresholds: {}
      }
    };

    return new EnhancedMCPSystem(defaultConfig);
  }

  static createCustom(config: Partial<EnhancedMCPConfig>): EnhancedMCPSystem {
    const mergedConfig = {
      ...this.createDefault().config,
      ...config
    } as EnhancedMCPConfig;

    return new EnhancedMCPSystem(mergedConfig);
  }
}

export default EnhancedMCPSystem;