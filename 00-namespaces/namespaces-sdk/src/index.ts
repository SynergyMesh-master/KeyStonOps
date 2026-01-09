/**
 * namespace-sdk - Main SDK Entrypoint
 * 
 * A machine-native, auditable platform integration layer for MCP tool wrapping.
 * Provides standardized interfaces for external APIs (GitHub, Cloudflare, OpenAI, Google, etc.)
 * with built-in schema validation, credential management, and audit trails.
 * 
 * @module namespace-sdk
 */

import { SDK } from './core/sdk';
import { ToolRegistry } from './core/registry';
import { CredentialManager } from './credentials/manager';
import { SchemaValidator } from './schema/validator';
import { Logger } from './observability/logger';
import { ConfigManager } from './config';

export { SDK, ToolRegistry, CredentialManager, SchemaValidator, Logger, ConfigManager };

// Export types
export * from './core/tool';
export * from './core/errors';
export * from './schema/types';
export * from './credentials/types';

/**
 * SDK Configuration Options
 */
export interface SDKConfig {
  /** Environment (development, staging, production) */
  environment?: string;
  /** Configuration file path */
  configPath?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom credential providers */
  credentialProviders?: any[];
  /** Plugin directories */
  pluginDirs?: string[];
  /** Observability settings */
  observability?: {
    logging?: boolean;
    tracing?: boolean;
    metrics?: boolean;
    audit?: boolean;
  };
}

/**
 * Initialize the SDK with configuration
 * 
 * @param config - SDK configuration options
 * @returns Initialized SDK instance
 * 
 * @example
 * ```typescript
 * const sdk = await initializeSDK({
 *   environment: 'production',
 *   debug: false,
 *   observability: {
 *     logging: true,
 *     tracing: true,
 *     audit: true
 *   }
 * });
 * 
 * // List available tools
 * const tools = await sdk.listTools();
 * 
 * // Invoke a tool
 * const result = await sdk.invokeTool('github_create_issue', {
 *   repository: 'owner/repo',
 *   title: 'Bug report',
 *   body: 'Description of the issue'
 * });
 * ```
 */
export async function initializeSDK(config: SDKConfig = {}): Promise<SDK> {
  const sdk = new SDK(config);
  await sdk.initialize();
  return sdk;
}

/**
 * Default export for convenience
 */
export default {
  initializeSDK,
  SDK,
  ToolRegistry,
  CredentialManager,
  SchemaValidator,
  Logger,
  ConfigManager
};