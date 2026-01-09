/**
 * GitHub Adapter
 * 
 * Wraps GitHub API into MCP-compatible tools.
 */

import { ToolRegistry } from '../../core/registry';
import { CredentialManager } from '../../credentials/manager';
import { Logger } from '../../observability/logger';
import * as tools from './tools';

/**
 * GitHub adapter configuration
 */
export interface GitHubAdapterConfig {
  /** GitHub API base URL */
  baseUrl?: string;
  /** API version */
  apiVersion?: string;
  /** Request timeout */
  timeout?: number;
  /** Rate limit handling */
  rateLimitHandling?: 'wait' | 'error';
}

/**
 * GitHub adapter class
 */
export class GitHubAdapter {
  private config: GitHubAdapterConfig;
  private credentialManager: CredentialManager;
  private logger: Logger;

  constructor(
    credentialManager: CredentialManager,
    config: GitHubAdapterConfig = {}
  ) {
    this.config = {
      baseUrl: 'https://api.github.com',
      apiVersion: '2022-11-28',
      timeout: 30000,
      rateLimitHandling: 'wait',
      ...config
    };

    this.credentialManager = credentialManager;
    this.logger = new Logger('GitHubAdapter');
  }

  /**
   * Register GitHub tools with registry
   */
  async register(registry: ToolRegistry): Promise<void> {
    this.logger.info('Registering GitHub tools...');

    // Register all GitHub tools
    const toolList = [
      tools.createGitHubCreateIssueTool(this.credentialManager, this.config),
      tools.createGitHubListReposTool(this.credentialManager, this.config),
      tools.createGitHubCreatePRTool(this.credentialManager, this.config),
      tools.createGitHubGetFileTool(this.credentialManager, this.config),
      tools.createGitHubCommitFileTool(this.credentialManager, this.config)
    ];

    for (const toolDescriptor of toolList) {
      registry.register(toolDescriptor);
    }

    this.logger.info(`Registered ${toolList.length} GitHub tools`);
  }

  /**
   * Get GitHub API client
   */
  async getClient(): Promise<any> {
    const credential = await this.credentialManager.getCredential('github');
    
    // In a real implementation, this would create an Octokit client
    // const { Octokit } = require('@octokit/rest');
    // return new Octokit({
    //   auth: credential.token,
    //   baseUrl: this.config.baseUrl,
    //   timeZone: 'UTC',
    //   userAgent: 'namespace-sdk'
    // });

    return null;
  }
}

/**
 * Register GitHub adapter
 */
export async function registerGitHubAdapter(
  registry: ToolRegistry,
  credentialManager: CredentialManager,
  config?: GitHubAdapterConfig
): Promise<void> {
  const adapter = new GitHubAdapter(credentialManager, config);
  await adapter.register(registry);
}