/**
 * MCP Transport Layer
 * 
 * Abstract transport layer providing multiple communication protocols
 * with automatic failover, load balancing, and connection management.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { MCPMessage } from './mcp-protocol';

/**
 * Transport Type
 */
export enum TransportType {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  GRPC = 'grpc',
  TCP = 'tcp',
  UDP = 'udp',
  MESSAGE_QUEUE = 'message_queue'
}

/**
 * Connection Status
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Transport Configuration
 */
export interface TransportConfig {
  type: TransportType;
  url: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  maxConnections: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  keepAlive: boolean;
}

/**
 * Transport Statistics
 */
export interface TransportStatistics {
  type: TransportType;
  status: ConnectionStatus;
  connectedAt?: number;
  totalConnections: number;
  activeConnections: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  averageLatency: number;
  errorCount: number;
  lastError?: string;
}

/**
 * Transport Interface
 */
export interface ITransport {
  readonly type: TransportType;
  readonly status: ConnectionStatus;
  readonly statistics: TransportStatistics;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: MCPMessage): Promise<void>;
  sendBatch(messages: MCPMessage[]): Promise<void>;
  isConnected(): boolean;
  getStatistics(): TransportStatistics;
  destroy(): void;
}

/**
 * Transport Layer Configuration
 */
export interface TransportLayerConfig {
  transports: TransportConfig[];
  enableFailover: boolean;
  enableLoadBalancing: boolean;
  failoverTimeout: number;
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Load Balancing Strategy
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  RANDOM = 'random',
  WEIGHTED = 'weighted'
}

/**
 * Transport Layer Implementation
 */
export class MCPTransportLayer extends EventEmitter {
  private config: TransportLayerConfig;
  private transports: Map<string, ITransport> = new Map();
  private activeTransport: ITransport | null = null;
  private loadBalancingStrategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN;
  private roundRobinIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: TransportLayerConfig) {
    super();
    this.config = config;
    this.initializeTransports();
    this.startHealthChecks();
  }

  /**
   * Connect all transports
   */
  public async connect(): Promise<void> {
    const connectionPromises: Promise<void>[] = [];

    for (const transportConfig of this.config.transports) {
      const transport = this.transports.get(transportConfig.url);
      if (transport) {
        connectionPromises.push(this.connectTransport(transport));
      }
    }

    await Promise.allSettled(connectionPromises);
    this.selectActiveTransport();
  }

  /**
   * Disconnect all transports
   */
  public async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const transport of this.transports.values()) {
      disconnectPromises.push(transport.disconnect());
    }

    await Promise.allSettled(disconnectPromises);
    this.activeTransport = null;
  }

  /**
   * Send message through transport layer
   */
  public async send(message: MCPMessage): Promise<void> {
    const transport = await this.selectTransport();
    
    if (!transport) {
      throw new Error('No available transport');
    }

    try {
      await transport.send(message);
      this.emit('message-sent', { message, transport: transport.type });
    } catch (error) {
      this.emit('send-error', { message, error, transport: transport.type });
      
      if (this.config.enableFailover) {
        await this.handleFailover(message, error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Send batch of messages
   */
  public async sendBatch(messages: MCPMessage[]): Promise<void> {
    const transport = await this.selectTransport();
    
    if (!transport) {
      throw new Error('No available transport');
    }

    try {
      await transport.sendBatch(messages);
      this.emit('batch-sent', { count: messages.length, transport: transport.type });
    } catch (error) {
      this.emit('batch-send-error', { messages, error, transport: transport.type });
      
      if (this.config.enableFailover) {
        await this.handleBatchFailover(messages, error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Add new transport
   */
  public async addTransport(config: TransportConfig): Promise<void> {
    const transport = this.createTransport(config);
    this.transports.set(config.url, transport);
    
    try {
      await transport.connect();
      this.selectActiveTransport();
      this.emit('transport-added', { transport: transport.type, url: config.url });
    } catch (error) {
      this.emit('transport-add-error', { config, error });
    }
  }

  /**
   * Remove transport
   */
  public async removeTransport(url: string): Promise<void> {
    const transport = this.transports.get(url);
    if (transport) {
      await transport.disconnect();
      this.transports.delete(url);
      
      if (this.activeTransport === transport) {
        this.selectActiveTransport();
      }
      
      this.emit('transport-removed', { transport: transport.type, url });
    }
  }

  /**
   * Get all transport statistics
   */
  public getStatistics(): Record<string, TransportStatistics> {
    const stats: Record<string, TransportStatistics> = {};
    
    for (const [url, transport] of this.transports) {
      stats[url] = transport.getStatistics();
    }
    
    return stats;
  }

  /**
   * Get active transport
   */
  public getActiveTransport(): ITransport | null {
    return this.activeTransport;
  }

  /**
   * Set load balancing strategy
   */
  public setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancingStrategy = strategy;
    this.emit('load-balancing-changed', strategy);
  }

  /**
   * Check if any transport is connected
   */
  public isConnected(): boolean {
    return this.activeTransport?.isConnected() || false;
  }

  /**
   * Destroy transport layer
   */
  public async destroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.disconnect();
    
    for (const transport of this.transports.values()) {
      transport.destroy();
    }
    
    this.transports.clear();
    this.removeAllListeners();
  }

  // Private methods

  private initializeTransports(): void {
    for (const transportConfig of this.config.transports) {
      const transport = this.createTransport(transportConfig);
      this.transports.set(transportConfig.url, transport);
    }
  }

  private createTransport(config: TransportConfig): ITransport {
    switch (config.type) {
      case TransportType.HTTP:
        return new HTTPTransport(config);
      case TransportType.WEBSOCKET:
        return new WebSocketTransport(config);
      case TransportType.GRPC:
        return new GRPCTransport(config);
      case TransportType.TCP:
        return new TCPTransport(config);
      case TransportType.UDP:
        return new UDPTransport(config);
      case TransportType.MESSAGE_QUEUE:
        return new MessageQueueTransport(config);
      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }
  }

  private async connectTransport(transport: ITransport): Promise<void> {
    try {
      await transport.connect();
      this.emit('transport-connected', { type: transport.type });
    } catch (error) {
      this.emit('transport-connection-error', { transport: transport.type, error });
    }
  }

  private selectActiveTransport(): void {
    const connectedTransports = Array.from(this.transports.values())
      .filter(transport => transport.isConnected());

    if (connectedTransports.length === 0) {
      this.activeTransport = null;
      return;
    }

    if (this.config.enableLoadBalancing) {
      this.activeTransport = this.selectTransportByLoadBalancing(connectedTransports);
    } else {
      this.activeTransport = connectedTransports[0];
    }

    this.emit('active-transport-changed', this.activeTransport?.type);
  }

  private selectTransportByLoadBalancing(transports: ITransport[]): ITransport {
    switch (this.loadBalancingStrategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return transports[this.roundRobinIndex++ % transports.length];
      
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return transports.reduce((min, transport) => {
          const minStats = min.getStatistics();
          const transportStats = transport.getStatistics();
          return transportStats.activeConnections < minStats.activeConnections ? transport : min;
        });
      
      case LoadBalancingStrategy.RANDOM:
        return transports[Math.floor(Math.random() * transports.length)];
      
      case LoadBalancingStrategy.WEIGHTED:
        // Implement weighted selection based on performance metrics
        return transports[0]; // Simplified for now
      
      default:
        return transports[0];
    }
  }

  private async selectTransport(): Promise<ITransport | null> {
    if (!this.activeTransport || !this.activeTransport.isConnected()) {
      this.selectActiveTransport();
    }
    
    return this.activeTransport;
  }

  private async handleFailover(message: MCPMessage, originalError: Error): Promise<void> {
    this.emit('failover-initiated', { message, originalError });
    
    // Try other available transports
    for (const transport of this.transports.values()) {
      if (transport !== this.activeTransport && transport.isConnected()) {
        try {
          await transport.send(message);
          this.activeTransport = transport;
          this.emit('failover-success', { message, newTransport: transport.type });
          return;
        } catch (error) {
          this.emit('failover-attempt-failed', { transport: transport.type, error });
        }
      }
    }
    
    this.emit('failover-failed', { message });
    throw originalError;
  }

  private async handleBatchFailover(messages: MCPMessage[], originalError: Error): Promise<void> {
    this.emit('batch-failover-initiated', { count: messages.length, originalError });
    
    // Try sending individual messages
    for (const message of messages) {
      try {
        await this.send(message);
      } catch (error) {
        this.emit('batch-failover-message-failed', { message, error });
      }
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private performHealthChecks(): void {
    let needsRebalancing = false;

    for (const transport of this.transports.values()) {
      const stats = transport.getStatistics();
      
      if (stats.status === ConnectionStatus.ERROR) {
        needsRebalancing = true;
      }
    }

    if (needsRebalancing) {
      this.selectActiveTransport();
    }
  }
}

/**
 * HTTP Transport Implementation
 */
class HTTPTransport implements ITransport {
  public readonly type = TransportType.HTTP;
  public status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private statistics: TransportStatistics;
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.statistics = {
      type: TransportType.HTTP,
      status: ConnectionStatus.DISCONNECTED,
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errorCount: 0
    };
  }

  async connect(): Promise<void> {
    this.status = ConnectionStatus.CONNECTING;
    // Implementation would go here
    this.status = ConnectionStatus.CONNECTED;
    this.statistics.connectedAt = Date.now();
    this.statistics.status = ConnectionStatus.CONNECTED;
  }

  async disconnect(): Promise<void> {
    this.status = ConnectionStatus.DISCONNECTED;
    this.statistics.status = ConnectionStatus.DISCONNECTED;
  }

  async send(message: MCPMessage): Promise<void> {
    // Implementation would go here
    this.statistics.messagesSent++;
    this.statistics.bytesTransferred += JSON.stringify(message).length;
  }

  async sendBatch(messages: MCPMessage[]): Promise<void> {
    for (const message of messages) {
      await this.send(message);
    }
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  getStatistics(): TransportStatistics {
    return { ...this.statistics };
  }

  destroy(): void {
    this.disconnect();
  }
}

/**
 * WebSocket Transport Implementation
 */
class WebSocketTransport implements ITransport {
  public readonly type = TransportType.WEBSOCKET;
  public status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private statistics: TransportStatistics;
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.statistics = {
      type: TransportType.WEBSOCKET,
      status: ConnectionStatus.DISCONNECTED,
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errorCount: 0
    };
  }

  async connect(): Promise<void> {
    this.status = ConnectionStatus.CONNECTING;
    // Implementation would go here
    this.status = ConnectionStatus.CONNECTED;
    this.statistics.connectedAt = Date.now();
    this.statistics.status = ConnectionStatus.CONNECTED;
  }

  async disconnect(): Promise<void> {
    this.status = ConnectionStatus.DISCONNECTED;
    this.statistics.status = ConnectionStatus.DISCONNECTED;
  }

  async send(message: MCPMessage): Promise<void> {
    // Implementation would go here
    this.statistics.messagesSent++;
    this.statistics.bytesTransferred += JSON.stringify(message).length;
  }

  async sendBatch(messages: MCPMessage[]): Promise<void> {
    for (const message of messages) {
      await this.send(message);
    }
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  getStatistics(): TransportStatistics {
    return { ...this.statistics };
  }

  destroy(): void {
    this.disconnect();
  }
}

/**
 * gRPC Transport Implementation
 */
class GRPCTransport implements ITransport {
  public readonly type = TransportType.GRPC;
  public status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private statistics: TransportStatistics;
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.statistics = {
      type: TransportType.GRPC,
      status: ConnectionStatus.DISCONNECTED,
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errorCount: 0
    };
  }

  async connect(): Promise<void> {
    this.status = ConnectionStatus.CONNECTING;
    // Implementation would go here
    this.status = ConnectionStatus.CONNECTED;
    this.statistics.connectedAt = Date.now();
    this.statistics.status = ConnectionStatus.CONNECTED;
  }

  async disconnect(): Promise<void> {
    this.status = ConnectionStatus.DISCONNECTED;
    this.statistics.status = ConnectionStatus.DISCONNECTED;
  }

  async send(message: MCPMessage): Promise<void> {
    // Implementation would go here
    this.statistics.messagesSent++;
    this.statistics.bytesTransferred += JSON.stringify(message).length;
  }

  async sendBatch(messages: MCPMessage[]): Promise<void> {
    for (const message of messages) {
      await this.send(message);
    }
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  getStatistics(): TransportStatistics {
    return { ...this.statistics };
  }

  destroy(): void {
    this.disconnect();
  }
}

/**
 * TCP Transport Implementation
 */
class TCPTransport implements ITransport {
  public readonly type = TransportType.TCP;
  public status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private statistics: TransportStatistics;
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.statistics = {
      type: TransportType.TCP,
      status: ConnectionStatus.DISCONNECTED,
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errorCount: 0
    };
  }

  async connect(): Promise<void> {
    this.status = ConnectionStatus.CONNECTING;
    // Implementation would go here
    this.status = ConnectionStatus.CONNECTED;
    this.statistics.connectedAt = Date.now();
    this.statistics.status = ConnectionStatus.CONNECTED;
  }

  async disconnect(): Promise<void> {
    this.status = ConnectionStatus.DISCONNECTED;
    this.statistics.status = ConnectionStatus.DISCONNECTED;
  }

  async send(message: MCPMessage): Promise<void> {
    // Implementation would go here
    this.statistics.messagesSent++;
    this.statistics.bytesTransferred += JSON.stringify(message).length;
  }

  async sendBatch(messages: MCPMessage[]): Promise<void> {
    for (const message of messages) {
      await this.send(message);
    }
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  getStatistics(): TransportStatistics {
    return { ...this.statistics };
  }

  destroy(): void {
    this.disconnect();
  }
}

/**
 * UDP Transport Implementation
 */
class UDPTransport implements ITransport {
  public readonly type = TransportType.UDP;
  public status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private statistics: TransportStatistics;
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.statistics = {
      type: TransportType.UDP,
      status: ConnectionStatus.DISCONNECTED,
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errorCount: 0
    };
  }

  async connect(): Promise<void> {
    this.status = ConnectionStatus.CONNECTING;
    // Implementation would go here
    this.status = ConnectionStatus.CONNECTED;
    this.statistics.connectedAt = Date.now();
    this.statistics.status = ConnectionStatus.CONNECTED;
  }

  async disconnect(): Promise<void> {
    this.status = ConnectionStatus.DISCONNECTED;
    this.statistics.status = ConnectionStatus.DISCONNECTED;
  }

  async send(message: MCPMessage): Promise<void> {
    // Implementation would go here
    this.statistics.messagesSent++;
    this.statistics.bytesTransferred += JSON.stringify(message).length;
  }

  async sendBatch(messages: MCPMessage[]): Promise<void> {
    for (const message of messages) {
      await this.send(message);
    }
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  getStatistics(): TransportStatistics {
    return { ...this.statistics };
  }

  destroy(): void {
    this.disconnect();
  }
}

/**
 * Message Queue Transport Implementation
 */
class MessageQueueTransport implements ITransport {
  public readonly type = TransportType.MESSAGE_QUEUE;
  public status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private statistics: TransportStatistics;
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.statistics = {
      type: TransportType.MESSAGE_QUEUE,
      status: ConnectionStatus.DISCONNECTED,
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errorCount: 0
    };
  }

  async connect(): Promise<void> {
    this.status = ConnectionStatus.CONNECTING;
    // Implementation would go here
    this.status = ConnectionStatus.CONNECTED;
    this.statistics.connectedAt = Date.now();
    this.statistics.status = ConnectionStatus.CONNECTED;
  }

  async disconnect(): Promise<void> {
    this.status = ConnectionStatus.DISCONNECTED;
    this.statistics.status = ConnectionStatus.DISCONNECTED;
  }

  async send(message: MCPMessage): Promise<void> {
    // Implementation would go here
    this.statistics.messagesSent++;
    this.statistics.bytesTransferred += JSON.stringify(message).length;
  }

  async sendBatch(messages: MCPMessage[]): Promise<void> {
    for (const message of messages) {
      await this.send(message);
    }
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  getStatistics(): TransportStatistics {
    return { ...this.statistics };
  }

  destroy(): void {
    this.disconnect();
  }
}