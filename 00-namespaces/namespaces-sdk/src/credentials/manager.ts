/**
 * Credential Manager
 * 
 * Centralizes credential storage, retrieval, rotation, and usage tracking.
 */

import {
  AnyCredential,
  CredentialProvider,
  CredentialUsage,
  CredentialManagerConfig,
  RotationPolicy,
  CredentialUtils,
  ValidationResult
} from './types';
import { CredentialError } from '../core/errors';
import { Logger } from '../observability/logger';

/**
 * Credential cache entry
 */
interface CacheEntry {
  credential: AnyCredential;
  timestamp: Date;
}

/**
 * Credential Manager class
 */
export class CredentialManager {
  private providers: CredentialProvider[];
  private cache: Map<string, CacheEntry>;
  private usageLog: CredentialUsage[];
  private config: CredentialManagerConfig;
  private logger: Logger;
  private rotationTimers: Map<string, NodeJS.Timeout>;

  constructor(config: CredentialManagerConfig = {}) {
    this.providers = [];
    this.cache = new Map();
    this.usageLog = [];
    this.config = {
      trackUsage: true,
      autoRotate: false,
      cacheTTL: 300, // 5 minutes default
      encryptAtRest: false,
      ...config
    };
    this.logger = new Logger('CredentialManager');
    this.rotationTimers = new Map();
  }

  /**
   * Initialize credential manager
   */
  async initialize(providers?: CredentialProvider[]): Promise<void> {
    this.logger.info('Initializing credential manager...');

    // Add provided providers
    if (providers) {
      for (const provider of providers) {
        await this.addProvider(provider);
      }
    }

    // Add default providers from config
    if (this.config.providers) {
      for (const provider of this.config.providers) {
        await this.addProvider(provider);
      }
    }

    // Sort providers by priority
    this.providers.sort((a, b) => b.priority - a.priority);

    // Setup rotation if enabled
    if (this.config.autoRotate) {
      await this.setupRotation();
    }

    this.logger.info(`Credential manager initialized with ${this.providers.length} providers`);
  }

  /**
   * Add a credential provider
   */
  async addProvider(provider: CredentialProvider): Promise<void> {
    await provider.initialize();
    this.providers.push(provider);
    this.logger.info(`Added credential provider: ${provider.name}`);
  }

  /**
   * Get credential for a service
   */
  async getCredential(service: string, scope?: string[]): Promise<AnyCredential> {
    const cacheKey = this.getCacheKey(service, scope);

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      this.logger.debug(`Credential cache hit for ${service}`);
      
      // Track usage
      if (this.config.trackUsage) {
        await this.trackUsage(cached.credential, 'cache_hit', true);
      }
      
      return cached.credential;
    }

    // Try each provider in priority order
    for (const provider of this.providers) {
      try {
        const credential = await provider.getCredential(service, scope);
        
        if (credential) {
          // Validate credential
          const validation = CredentialUtils.validate(credential);
          if (!validation.valid) {
            this.logger.warn(`Invalid credential from ${provider.name}:`, validation.errors);
            continue;
          }

          // Cache credential
          this.cache.set(cacheKey, {
            credential,
            timestamp: new Date()
          });

          // Track usage
          if (this.config.trackUsage) {
            await this.trackUsage(credential, 'retrieved', true);
          }

          this.logger.info(`Retrieved credential for ${service} from ${provider.name}`);
          return credential;
        }
      } catch (error: any) {
        this.logger.warn(`Provider ${provider.name} failed:`, error.message);
      }
    }

    throw new CredentialError(`No credential found for service: ${service}`);
  }

  /**
   * Store a credential
   */
  async storeCredential(credential: AnyCredential): Promise<void> {
    // Validate credential
    const validation = CredentialUtils.validate(credential);
    if (!validation.valid) {
      throw new CredentialError(
        `Invalid credential: ${validation.errors?.join(', ')}`,
        credential.type
      );
    }

    // Store in first available provider
    for (const provider of this.providers) {
      try {
        await provider.storeCredential(credential);
        
        // Invalidate cache
        const cacheKey = this.getCacheKey(credential.service, credential.scope);
        this.cache.delete(cacheKey);

        this.logger.info(`Stored credential for ${credential.service} in ${provider.name}`);
        return;
      } catch (error: any) {
        this.logger.warn(`Failed to store in ${provider.name}:`, error.message);
      }
    }

    throw new CredentialError('Failed to store credential in any provider');
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<boolean> {
    let deleted = false;

    for (const provider of this.providers) {
      try {
        if (await provider.deleteCredential(id)) {
          deleted = true;
          this.logger.info(`Deleted credential ${id} from ${provider.name}`);
        }
      } catch (error: any) {
        this.logger.warn(`Failed to delete from ${provider.name}:`, error.message);
      }
    }

    // Clear cache
    this.clearCache();

    return deleted;
  }

  /**
   * Check if credential exists
   */
  async hasCredential(service: string, scope?: string[]): Promise<boolean> {
    for (const provider of this.providers) {
      try {
        if (await provider.hasCredential(service, scope)) {
          return true;
        }
      } catch (error: any) {
        this.logger.warn(`Provider ${provider.name} check failed:`, error.message);
      }
    }

    return false;
  }

  /**
   * List all credentials
   */
  async listCredentials(): Promise<AnyCredential[]> {
    const credentials: AnyCredential[] = [];
    const seen = new Set<string>();

    for (const provider of this.providers) {
      try {
        const providerCreds = await provider.listCredentials();
        
        for (const cred of providerCreds) {
          if (!seen.has(cred.id)) {
            credentials.push(cred as AnyCredential);
            seen.add(cred.id);
          }
        }
      } catch (error: any) {
        this.logger.warn(`Failed to list from ${provider.name}:`, error.message);
      }
    }

    return credentials;
  }

  /**
   * Rotate a credential
   */
  async rotateCredential(service: string, scope?: string[]): Promise<AnyCredential> {
    const policy = this.config.rotationPolicies?.[service];
    
    if (!policy || !policy.onRotate) {
      throw new CredentialError(`No rotation policy defined for service: ${service}`);
    }

    // Get current credential
    const current = await this.getCredential(service, scope);

    // Execute rotation callback
    const newCredential = await policy.onRotate(current);

    // Store new credential
    await this.storeCredential(newCredential);

    // Delete old credential
    await this.deleteCredential(current.id);

    this.logger.info(`Rotated credential for ${service}`);

    return newCredential;
  }

  /**
   * Setup automatic rotation
   */
  private async setupRotation(): Promise<void> {
    if (!this.config.rotationPolicies) {
      return;
    }

    for (const [service, policy] of Object.entries(this.config.rotationPolicies)) {
      if (policy.enabled && policy.onRotate) {
        const intervalMs = policy.intervalDays * 24 * 60 * 60 * 1000;
        
        const timer = setInterval(async () => {
          try {
            await this.rotateCredential(service);
          } catch (error: any) {
            this.logger.error(`Auto-rotation failed for ${service}:`, error);
          }
        }, intervalMs);

        this.rotationTimers.set(service, timer);
        this.logger.info(`Setup auto-rotation for ${service} (every ${policy.intervalDays} days)`);
      }
    }
  }

  /**
   * Track credential usage
   */
  private async trackUsage(
    credential: AnyCredential,
    operation: string,
    success: boolean
  ): Promise<void> {
    const usage: CredentialUsage = {
      credentialId: credential.id,
      service: credential.service,
      timestamp: new Date(),
      operation,
      success
    };

    this.usageLog.push(usage);

    // Update last used timestamp
    credential.lastUsedAt = new Date();

    // Limit usage log size
    if (this.usageLog.length > 10000) {
      this.usageLog = this.usageLog.slice(-5000);
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(service?: string): any {
    const filtered = service
      ? this.usageLog.filter(u => u.service === service)
      : this.usageLog;

    const total = filtered.length;
    const successful = filtered.filter(u => u.success).length;
    const failed = total - successful;

    const byService: Record<string, number> = {};
    for (const usage of filtered) {
      byService[usage.service] = (byService[usage.service] || 0) + 1;
    }

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      byService
    };
  }

  /**
   * Get cache key
   */
  private getCacheKey(service: string, scope?: string[]): string {
    const scopeStr = scope ? scope.sort().join(',') : '';
    return `${service}:${scopeStr}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const age = Date.now() - entry.timestamp.getTime();
    const maxAge = (this.config.cacheTTL || 300) * 1000;

    if (age > maxAge) {
      this.cache.delete(key);
      return false;
    }

    // Check if credential is expired
    if (CredentialUtils.isExpired(entry.credential)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Credential cache cleared');
  }

  /**
   * Shutdown credential manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down credential manager...');

    // Clear rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearInterval(timer);
    }
    this.rotationTimers.clear();

    // Shutdown providers
    for (const provider of this.providers) {
      try {
        await provider.shutdown();
      } catch (error: any) {
        this.logger.warn(`Provider ${provider.name} shutdown failed:`, error.message);
      }
    }

    // Clear cache
    this.clearCache();

    this.logger.info('Credential manager shutdown complete');
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.length;
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}