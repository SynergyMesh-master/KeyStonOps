/**
 * Configuration Management
 * 
 * Centralizes configuration loading, validation, and environment management.
 */

import * as path from 'path';

/**
 * Configuration schema
 */
export interface SDKConfig {
  /** Environment name */
  environment: string;
  /** SDK settings */
  sdk: {
    name: string;
    version: string;
    debug: boolean;
  };
  /** Credential settings */
  credentials: {
    providers: string[];
    cacheTTL: number;
    autoRotate: boolean;
  };
  /** Observability settings */
  observability: {
    logging: {
      enabled: boolean;
      level: string;
      format: string;
    };
    tracing: {
      enabled: boolean;
      samplingRate: number;
    };
    metrics: {
      enabled: boolean;
      exportInterval: number;
    };
    audit: {
      enabled: boolean;
      storage: string;
    };
  };
  /** Registry settings */
  registry: {
    useGlobal: boolean;
    autoLock: boolean;
  };
  /** Plugin settings */
  plugins: {
    directories: string[];
    autoLoad: boolean;
  };
  /** Adapter settings */
  adapters: {
    [key: string]: any;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SDKConfig = {
  environment: 'development',
  sdk: {
    name: 'namespace-sdk',
    version: '1.0.0',
    debug: false
  },
  credentials: {
    providers: ['env', 'file'],
    cacheTTL: 300,
    autoRotate: false
  },
  observability: {
    logging: {
      enabled: true,
      level: 'info',
      format: 'text'
    },
    tracing: {
      enabled: false,
      samplingRate: 1.0
    },
    metrics: {
      enabled: false,
      exportInterval: 60000
    },
    audit: {
      enabled: true,
      storage: 'memory'
    }
  },
  registry: {
    useGlobal: false,
    autoLock: false
  },
  plugins: {
    directories: ['./plugins'],
    autoLoad: true
  },
  adapters: {}
};

/**
 * Configuration manager class
 */
export class ConfigManager {
  private config: SDKConfig;
  private configPath?: string;
  private watchers: Map<string, (config: SDKConfig) => void>;

  constructor(configPath?: string) {
    this.config = { ...DEFAULT_CONFIG };
    this.configPath = configPath;
    this.watchers = new Map();
  }

  /**
   * Load configuration
   */
  async load(environment?: string): Promise<void> {
    // Start with default config
    this.config = { ...DEFAULT_CONFIG };

    // Override with environment
    if (environment) {
      this.config.environment = environment;
    }

    // Load from file if provided
    if (this.configPath) {
      await this.loadFromFile(this.configPath);
    }

    // Load environment-specific config
    await this.loadEnvironmentConfig(this.config.environment);

    // Override with environment variables
    this.loadFromEnv();

    // Notify watchers
    this.notifyWatchers();
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(filePath: string): Promise<void> {
    try {
      // In a real implementation, this would read and parse the file
      // const fs = require('fs/promises');
      // const content = await fs.readFile(filePath, 'utf-8');
      // const fileConfig = JSON.parse(content);
      // this.config = this.merge(this.config, fileConfig);
    } catch (error: any) {
      console.warn(`Failed to load config from ${filePath}:`, error.message);
    }
  }

  /**
   * Load environment-specific configuration
   */
  private async loadEnvironmentConfig(environment: string): Promise<void> {
    const envConfigPath = path.join(
      process.cwd(),
      'config',
      'environments',
      `${environment}.json`
    );

    try {
      await this.loadFromFile(envConfigPath);
    } catch (error) {
      // Environment config is optional
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnv(): void {
    const env = process.env;

    // SDK settings
    if (env.SDK_DEBUG) {
      this.config.sdk.debug = env.SDK_DEBUG === 'true';
    }

    // Credential settings
    if (env.SDK_CREDENTIALS_CACHE_TTL) {
      this.config.credentials.cacheTTL = parseInt(env.SDK_CREDENTIALS_CACHE_TTL, 10);
    }

    if (env.SDK_CREDENTIALS_AUTO_ROTATE) {
      this.config.credentials.autoRotate = env.SDK_CREDENTIALS_AUTO_ROTATE === 'true';
    }

    // Observability settings
    if (env.SDK_LOG_LEVEL) {
      this.config.observability.logging.level = env.SDK_LOG_LEVEL;
    }

    if (env.SDK_TRACING_ENABLED) {
      this.config.observability.tracing.enabled = env.SDK_TRACING_ENABLED === 'true';
    }

    if (env.SDK_METRICS_ENABLED) {
      this.config.observability.metrics.enabled = env.SDK_METRICS_ENABLED === 'true';
    }

    if (env.SDK_AUDIT_ENABLED) {
      this.config.observability.audit.enabled = env.SDK_AUDIT_ENABLED === 'true';
    }

    // Registry settings
    if (env.SDK_REGISTRY_USE_GLOBAL) {
      this.config.registry.useGlobal = env.SDK_REGISTRY_USE_GLOBAL === 'true';
    }

    if (env.SDK_REGISTRY_AUTO_LOCK) {
      this.config.registry.autoLock = env.SDK_REGISTRY_AUTO_LOCK === 'true';
    }
  }

  /**
   * Get configuration value
   */
  get<T = any>(path: string, defaultValue?: T): T {
    const parts = path.split('.');
    let current: any = this.config;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return defaultValue as T;
      }
      current = current[part];
    }

    return current !== undefined ? current : (defaultValue as T);
  }

  /**
   * Set configuration value
   */
  set(path: string, value: any): void {
    const parts = path.split('.');
    const last = parts.pop()!;
    let current: any = this.config;

    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[last] = value;
    this.notifyWatchers();
  }

  /**
   * Get entire configuration
   */
  getAll(): SDKConfig {
    return { ...this.config };
  }

  /**
   * Merge configurations
   */
  private merge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.merge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Watch for configuration changes
   */
  watch(id: string, callback: (config: SDKConfig) => void): void {
    this.watchers.set(id, callback);
  }

  /**
   * Unwatch configuration changes
   */
  unwatch(id: string): void {
    this.watchers.delete(id);
  }

  /**
   * Notify watchers of configuration changes
   */
  private notifyWatchers(): void {
    for (const callback of this.watchers.values()) {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Config watcher error:', error);
      }
    }
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!this.config.environment) {
      errors.push('Environment is required');
    }

    if (!this.config.sdk.name) {
      errors.push('SDK name is required');
    }

    if (!this.config.sdk.version) {
      errors.push('SDK version is required');
    }

    // Validate numeric values
    if (this.config.credentials.cacheTTL < 0) {
      errors.push('Credentials cache TTL must be non-negative');
    }

    if (this.config.observability.tracing.samplingRate < 0 || 
        this.config.observability.tracing.samplingRate > 1) {
      errors.push('Tracing sampling rate must be between 0 and 1');
    }

    if (this.config.observability.metrics.exportInterval < 1000) {
      errors.push('Metrics export interval must be at least 1000ms');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configuration to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }
}