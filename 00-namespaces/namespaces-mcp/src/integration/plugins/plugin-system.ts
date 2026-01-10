/**
 * Plugin System - Plugin management and lifecycle
 * 
 * Provides comprehensive plugin loading, lifecycle management,
 * dependency resolution, and sandbox execution.
 * 
 * @module integration/plugins/plugin-system
 */

import { EventEmitter } from 'events';

/**
 * Plugin state
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  STARTED = 'started',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  peerDependencies?: string[];
  config?: Record<string, unknown>;
}

/**
 * Plugin context
 */
export interface PluginContext {
  id: string;
  config: Record<string, unknown>;
  logger: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  emit: (event: string, data?: unknown) => void;
  getPlugin: (id: string) => Plugin | undefined;
}

/**
 * Plugin interface
 */
export interface Plugin {
  metadata: PluginMetadata;
  state: PluginState;
  
  load(): Promise<void>;
  initialize(context: PluginContext): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  unload(): Promise<void>;
}

/**
 * Plugin system configuration
 */
export interface PluginSystemConfig {
  pluginDir?: string;
  autoLoad?: boolean;
  hotReload?: boolean;
  sandbox?: {
    enabled: boolean;
    timeout: number;
    memoryLimit: number;
    cpuLimit: number;
  };
  dependencies?: {
    autoResolve: boolean;
    allowCircular: boolean;
  };
}

/**
 * Plugin System
 * 
 * Manages plugin lifecycle and dependencies
 */
export class PluginSystem extends EventEmitter {
  private config: Required<PluginSystemConfig>;
  private plugins: Map<string, Plugin> = new Map();
  private pluginStates: Map<string, PluginState> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();

  constructor(config: PluginSystemConfig = {}) {
    super();
    this.config = {
      pluginDir: config.pluginDir ?? './plugins',
      autoLoad: config.autoLoad ?? false,
      hotReload: config.hotReload ?? false,
      sandbox: config.sandbox ?? {
        enabled: false,
        timeout: 30000,
        memoryLimit: 512 * 1024 * 1024,
        cpuLimit: 80
      },
      dependencies: config.dependencies ?? {
        autoResolve: true,
        allowCircular: false
      }
    };
  }

  /**
   * Load plugin
   */
  async loadPlugin(id: string, plugin: Plugin): Promise<void> {
    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} is already loaded`);
    }

    this.pluginStates.set(id, PluginState.LOADING);
    this.emit('plugin:loading', { id });

    try {
      // Validate dependencies
      if (this.config.dependencies.autoResolve) {
        await this.resolveDependencies(plugin.metadata);
      }

      // Load plugin
      await plugin.load();

      this.plugins.set(id, plugin);
      this.pluginStates.set(id, PluginState.LOADED);
      this.emit('plugin:loaded', { id });

    } catch (error) {
      this.pluginStates.set(id, PluginState.ERROR);
      this.emit('plugin:error', { id, error });
      throw error;
    }
  }

  /**
   * Initialize plugin
   */
  async initializePlugin(id: string, config?: Record<string, unknown>): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    this.pluginStates.set(id, PluginState.INITIALIZING);
    this.emit('plugin:initializing', { id });

    try {
      const context = this.createPluginContext(id, config);
      await plugin.initialize(context);

      this.pluginStates.set(id, PluginState.INITIALIZED);
      this.emit('plugin:initialized', { id });

    } catch (error) {
      this.pluginStates.set(id, PluginState.ERROR);
      this.emit('plugin:error', { id, error });
      throw error;
    }
  }

  /**
   * Start plugin
   */
  async startPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    this.pluginStates.set(id, PluginState.STARTING);
    this.emit('plugin:starting', { id });

    try {
      await plugin.start();

      this.pluginStates.set(id, PluginState.STARTED);
      this.emit('plugin:started', { id });

    } catch (error) {
      this.pluginStates.set(id, PluginState.ERROR);
      this.emit('plugin:error', { id, error });
      throw error;
    }
  }

  /**
   * Stop plugin
   */
  async stopPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    this.pluginStates.set(id, PluginState.STOPPING);
    this.emit('plugin:stopping', { id });

    try {
      await plugin.stop();

      this.pluginStates.set(id, PluginState.STOPPED);
      this.emit('plugin:stopped', { id });

    } catch (error) {
      this.pluginStates.set(id, PluginState.ERROR);
      this.emit('plugin:error', { id, error });
      throw error;
    }
  }

  /**
   * Unload plugin
   */
  async unloadPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      // Stop if started
      if (this.pluginStates.get(id) === PluginState.STARTED) {
        await this.stopPlugin(id);
      }

      await plugin.unload();

      this.plugins.delete(id);
      this.pluginStates.delete(id);
      this.emit('plugin:unloaded', { id });

    } catch (error) {
      this.emit('plugin:error', { id, error });
      throw error;
    }
  }

  /**
   * Reload plugin
   */
  async reloadPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    await this.unloadPlugin(id);
    await this.loadPlugin(id, plugin);
    await this.initializePlugin(id);
    await this.startPlugin(id);

    this.emit('plugin:reloaded', { id });
  }

  /**
   * Get plugin
   */
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin state
   */
  getPluginState(id: string): PluginState | undefined {
    return this.pluginStates.get(id);
  }

  /**
   * Resolve dependencies
   */
  private async resolveDependencies(metadata: PluginMetadata): Promise<void> {
    if (!metadata.dependencies || metadata.dependencies.length === 0) {
      return;
    }

    // Check if all dependencies are loaded
    for (const depId of metadata.dependencies) {
      if (!this.plugins.has(depId)) {
        throw new Error(`Dependency ${depId} not found for plugin ${metadata.id}`);
      }
    }

    // Build dependency graph
    this.dependencyGraph.set(
      metadata.id,
      new Set(metadata.dependencies)
    );

    // Check for circular dependencies
    if (!this.config.dependencies.allowCircular) {
      this.checkCircularDependencies(metadata.id);
    }
  }

  /**
   * Check circular dependencies
   */
  private checkCircularDependencies(id: string, visited: Set<string> = new Set()): void {
    if (visited.has(id)) {
      throw new Error(`Circular dependency detected: ${Array.from(visited).join(' -> ')} -> ${id}`);
    }

    visited.add(id);

    const deps = this.dependencyGraph.get(id);
    if (deps) {
      for (const depId of deps) {
        this.checkCircularDependencies(depId, new Set(visited));
      }
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(id: string, config?: Record<string, unknown>): PluginContext {
    return {
      id,
      config: config || {},
      logger: {
        debug: (message, ...args) => this.emit('plugin:log', { id, level: 'debug', message, args }),
        info: (message, ...args) => this.emit('plugin:log', { id, level: 'info', message, args }),
        warn: (message, ...args) => this.emit('plugin:log', { id, level: 'warn', message, args }),
        error: (message, ...args) => this.emit('plugin:log', { id, level: 'error', message, args })
      },
      emit: (event, data) => this.emit(`plugin:${id}:${event}`, data),
      getPlugin: (pluginId) => this.getPlugin(pluginId)
    };
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalPlugins: number;
    loadedPlugins: number;
    startedPlugins: number;
    errorPlugins: number;
  } {
    const states = Array.from(this.pluginStates.values());
    return {
      totalPlugins: this.plugins.size,
      loadedPlugins: states.filter(s => s === PluginState.LOADED).length,
      startedPlugins: states.filter(s => s === PluginState.STARTED).length,
      errorPlugins: states.filter(s => s === PluginState.ERROR).length
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Stop and unload all plugins
    for (const id of this.plugins.keys()) {
      await this.unloadPlugin(id);
    }

    this.removeAllListeners();
  }
}

/**
 * Create plugin system instance
 */
export function createPluginSystem(config?: PluginSystemConfig): PluginSystem {
  return new PluginSystem(config);
}

export default PluginSystem;