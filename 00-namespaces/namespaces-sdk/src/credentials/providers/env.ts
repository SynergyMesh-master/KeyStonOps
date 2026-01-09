/**
 * Environment Variable Credential Provider
 * 
 * Loads credentials from environment variables.
 */

import {
  CredentialProvider,
  AnyCredential,
  Credential,
  CredentialType,
  APIKeyCredential,
  BearerTokenCredential,
  BasicAuthCredential,
  CredentialUtils
} from '../types';

/**
 * Environment variable credential provider
 */
export class EnvCredentialProvider implements CredentialProvider {
  name = 'env';
  priority = 100; // High priority

  private credentials: Map<string, AnyCredential>;
  private envPrefix: string;

  constructor(envPrefix: string = 'SDK_CRED_') {
    this.credentials = new Map();
    this.envPrefix = envPrefix;
  }

  async initialize(): Promise<void> {
    // Load credentials from environment variables
    this.loadFromEnv();
  }

  /**
   * Load credentials from environment variables
   */
  private loadFromEnv(): void {
    const env = process.env;

    // Pattern: SDK_CRED_<SERVICE>_<TYPE>=<value>
    for (const [key, value] of Object.entries(env)) {
      if (!key.startsWith(this.envPrefix) || !value) {
        continue;
      }

      try {
        const parts = key.substring(this.envPrefix.length).split('_');
        if (parts.length < 2) continue;

        const service = parts[0].toLowerCase();
        const field = parts.slice(1).join('_').toLowerCase();

        // Create or update credential
        this.processEnvVar(service, field, value);
      } catch (error: any) {
        console.warn(`Failed to parse credential from ${key}:`, error.message);
      }
    }
  }

  /**
   * Process environment variable
   */
  private processEnvVar(service: string, field: string, value: string): void {
    const credId = CredentialUtils.generateId(service, CredentialType.API_KEY);

    // Determine credential type and create appropriate credential
    if (field === 'api_key' || field === 'apikey') {
      const credential: APIKeyCredential = {
        id: credId,
        type: CredentialType.API_KEY,
        service,
        apiKey: value,
        createdAt: new Date()
      };
      this.credentials.set(service, credential);
    } else if (field === 'token' || field === 'bearer_token') {
      const credential: BearerTokenCredential = {
        id: credId,
        type: CredentialType.BEARER_TOKEN,
        service,
        token: value,
        createdAt: new Date()
      };
      this.credentials.set(service, credential);
    } else if (field === 'username') {
      // For basic auth, we need both username and password
      const password = process.env[`${this.envPrefix}${service.toUpperCase()}_PASSWORD`];
      if (password) {
        const credential: BasicAuthCredential = {
          id: credId,
          type: CredentialType.BASIC_AUTH,
          service,
          username: value,
          password,
          createdAt: new Date()
        };
        this.credentials.set(service, credential);
      }
    }
  }

  async getCredential(service: string, scope?: string[]): Promise<AnyCredential | null> {
    return this.credentials.get(service) || null;
  }

  async hasCredential(service: string, scope?: string[]): Promise<boolean> {
    return this.credentials.has(service);
  }

  async storeCredential(credential: AnyCredential): Promise<void> {
    // Environment provider is read-only
    throw new Error('EnvCredentialProvider is read-only');
  }

  async deleteCredential(id: string): Promise<boolean> {
    // Environment provider is read-only
    throw new Error('EnvCredentialProvider is read-only');
  }

  async listCredentials(): Promise<Credential[]> {
    return Array.from(this.credentials.values()).map(cred => CredentialUtils.sanitize(cred) as Credential);
  }

  async shutdown(): Promise<void> {
    this.credentials.clear();
  }
}