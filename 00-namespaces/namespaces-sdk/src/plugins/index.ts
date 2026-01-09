/**
 * Plugin System and Connector Registry
 * 
 * Implements plugin discovery, loading, and registration logic.
 */

import * as path from 'path';
import { ToolRegistry } from '../core/registry';
import { ToolDescriptor } from '../core/tool';
import { PluginError } from '../core/errors';
import { Logger } from '../observability/logger';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Required SDK version */
  sdkVersion?: string;
  /** Plugin dependencies */
  dependencies?: string[];
  /** Plugin tags */
  tags?: string[];
}

/**
 * Plugin interface
 */
export interface Plugin {
  /** Plugin metadata */
  metadata: PluginMetadata;
  
  /**
   * Initialize plugin
   */
  initialize(context: PluginContext): Promise<void>;
  
  /**
   * Register tools with registry
   */
  register(registry: ToolRegistry): Promise<void>;
  
  /**
   * Shutdown plugin
   */
  shutdown(): Promise<void>;
}

/**
 * Plugin context
 */
export interface PluginContext {
  /** SDK version */
  sdkVersion: string;
  /** Configuration */
  config: any;
  /** Logger */
  logger: Logger;
}

/**
 * Plugin loader configuration
 */
export interface PluginLoaderConfig {
  /** Plugin directories */
  directories?: string[];
  /** Auto-load plugins */
  autoLoad?: boolean;
  /** Plugin whitelist */
  whitelist?: string[];
  /** Plugin blacklist */
  blacklist?: string[];
}

/**
 * Plugin descriptor
 */
interface PluginDescriptor {
  metadata: PluginMetadata;
  plugin: Plugin;
  loaded: boolean;
  error?: Error;
}

/**
 * Plugin loader class
 */
export class PluginLoader {
  private config: PluginLoaderConfig;
  private plugins: Map<string, PluginDescriptor>;
  private logger: Logger;

  constructor(directories?: string[], config?: PluginLoaderConfig) {
    this.config = {
      directories: directories || ['./plugins'],
      autoLoad: true,
      whitelist: [],
      blacklist: [],
      ...config
    };

    this.plugins = new Map();
    this.logger = new Logger('PluginLoader');
  }

  /**
   * Load all plugins
   */
  async loadPlugins(registry: ToolRegistry): Promise<void> {
    this.logger.info('Loading plugins...');

    for (const directory of this.config.directories || []) {
      await this.loadFromDirectory(directory, registry);
    }

    this.logger.info(`Loaded ${this.plugins.size} plugins`);
  }

  /**
   * Load plugins from directory
   */
  private async loadFromDirectory(directory: string, registry: ToolRegistry): Promise<void> {
    try {
      // In a real implementation, this would scan the directory
      // const fs = require('fs/promises');
      // const entries = await fs.readdir(directory, { withFileTypes: true });
      
      // for (const entry of entries) {
      //   if (entry.isDirectory()) {
      //     const pluginPath = path.join(directory, entry.name);
      //     await this.loadPlugin(pluginPath, registry);
      //   }
      // }
    } catch (error: any) {
      this.logger.warn(`Failed to load plugins from ${directory}:`, error.message);
    }
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(pluginPath: string, registry: ToolRegistry): Promise<void> {
    try {
      // In a real implementation, this would dynamically import the plugin
      // const pluginModule = await import(pluginPath);
      // const plugin: Plugin = pluginModule.default || pluginModule;

      // Placeholder for demonstration
      const plugin: Plugin = {
        metadata: {
          name: path.basename(pluginPath),
          version: '1.0.0'
        },
        initialize: async () => {},
        register: async () => {},
        shutdown: async () => {}
      };

      // Check whitelist/blacklist
      if (!this.isPluginAllowed(plugin.metadata.name)) {
        this.logger.info(`Plugin ${plugin.metadata.name} is not allowed`);
        return;
      }

      // Validate plugin
      this.validatePlugin(plugin);

      // Initialize plugin
      const context: PluginContext = {
        sdkVersion: '1.0.0',
        config: {},
        logger: this.logger.child(plugin.metadata.name)
      };

      await plugin.initialize(context);

      // Register tools
      await plugin.register(registry);

      // Store plugin descriptor
      this.plugins.set(plugin.metadata.name, {
        metadata: plugin.metadata,
        plugin,
        loaded: true
      });

      this.logger.info(`Loaded plugin: ${plugin.metadata.name} v${plugin.metadata.version}`);

    } catch (error: any) {
      this.logger.error(`Failed to load plugin from ${pluginPath}:`, error);
      
      // Store error
      this.plugins.set(path.basename(pluginPath), {
        metadata: { name: path.basename(pluginPath), version: 'unknown' },
        plugin: null as any,
        loaded: false,
        error
      });
    }
  }

  /**
   * Validate plugin
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.metadata) {
      throw new PluginError('unknown', 'Plugin metadata is required');
    }

    if (!plugin.metadata.name) {
      throw new PluginError('unknown', 'Plugin name is required');
    }

    if (!plugin.metadata.version) {
      throw new PluginError(plugin.metadata.name, 'Plugin version is required');
    }

    if (!plugin.initialize || typeof plugin.initialize !== 'function') {
      throw new PluginError(plugin.metadata.name, 'Plugin must implement initialize()');
    }

    if (!plugin.register || typeof plugin.register !== 'function') {
      throw new PluginError(plugin.metadata.name, 'Plugin must implement register()');
    }

    if (!plugin.shutdown || typeof plugin.shutdown !== 'function') {
      throw new PluginError(plugin.metadata.name, 'Plugin must implement shutdown()');
    }
  }

  /**
   * Check if plugin is allowed
   */
  private isPluginAllowed(name: string): boolean {
    // Check blacklist
    if (this.config.blacklist && this.config.blacklist.includes(name)) {
      return false;
    }

    // Check whitelist
    if (this.config.whitelist && this.config.whitelist.length > 0) {
      return this.config.whitelist.includes(name);
    }

    return true;
  }

  /**
   * Unload all plugins
   */
  async unloadPlugins(): Promise<void> {
    this.logger.info('Unloading plugins...');

    for (const [name, descriptor] of this.plugins.entries()) {
      if (descriptor.loaded) {
        try {
          await descriptor.plugin.shutdown();
          this.logger.info(`Unloaded plugin: ${name}`);
        } catch (error: any) {
          this.logger.error(`Failed to unload plugin ${name}:`, error);
        }
      }
    }

    this.plugins.clear();
  }

  /**
   * Get loaded plugins
   */
  getLoadedPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values())
      .filter(d => d.loaded)
      .map(d => d.metadata);
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    const descriptor = this.plugins.get(name);
    return descriptor?.loaded ? descriptor.plugin : undefined;
  }

  /**
   * Check if plugin is loaded
   */
  isPluginLoaded(name: string): boolean {
    const descriptor = this.plugins.get(name);
    return descriptor?.loaded || false;
  }

  /**
   * Get plugin errors
   */
  getErrors(): Array<{ plugin: string; error: Error }> {
    return Array.from(this.plugins.entries())
      .filter(([_, d]) => !d.loaded && d.error)
      .map(([name, d]) => ({ plugin: name, error: d.error! }));
  }

  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return Array.from(this.plugins.values()).filter(d => d.loaded).length;
  }
}

/**
 * Example plugin template
 */
export class ExamplePlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'example-plugin',
    version: '1.0.0',
    description: 'An example plugin',
    author: 'SDK Team'
  };

  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Example plugin initialized');
  }

  async register(registry: ToolRegistry): Promise<void> {
    // Register tools here
    // const descriptor: ToolDescriptor = { ... };
    // registry.register(descriptor);
  }

  async shutdown(): Promise<void> {
    // Cleanup resources
  }
}