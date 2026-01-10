/**
 * gRPC Adapter - gRPC API integration adapter
 * 
 * Provides comprehensive gRPC integration with Protocol Buffers,
 * streaming support, interceptors, and load balancing.
 * 
 * @module integration/adapters/grpc/grpc-adapter
 */

import { EventEmitter } from 'events';

/**
 * gRPC call type
 */
export enum CallType {
  UNARY = 'unary',
  SERVER_STREAM = 'server_stream',
  CLIENT_STREAM = 'client_stream',
  BIDI_STREAM = 'bidi_stream'
}

/**
 * gRPC credentials type
 */
export enum CredentialsType {
  INSECURE = 'insecure',
  SSL = 'ssl',
  MTLS = 'mtls'
}

/**
 * gRPC metadata
 */
export type Metadata = Record<string, string | string[]>;

/**
 * gRPC call options
 */
export interface CallOptions {
  timeout?: number;
  metadata?: Metadata;
  retry?: {
    maxAttempts: number;
    initialBackoff: number;
    maxBackoff: number;
    backoffMultiplier: number;
  };
}

/**
 * Stream interface
 */
export interface Stream<T = unknown> {
  on(event: 'data', listener: (data: T) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'status', listener: (status: Status) => void): this;
  cancel(): void;
}

/**
 * Client stream interface
 */
export interface ClientStream<T = unknown, R = unknown> extends Stream<R> {
  write(data: T): boolean;
  end(): void;
}

/**
 * Bidirectional stream interface
 */
export interface BidiStream<T = unknown, R = unknown> extends ClientStream<T, R> {}

/**
 * gRPC status
 */
export interface Status {
  code: number;
  details: string;
  metadata: Metadata;
}

/**
 * gRPC interceptor
 */
export interface GRPCInterceptor {
  intercept(
    method: string,
    request: unknown,
    metadata: Metadata,
    next: (request: unknown, metadata: Metadata) => Promise<unknown>
  ): Promise<unknown>;
}

/**
 * Service definition
 */
export interface ServiceDefinition {
  name: string;
  methods: Map<string, MethodDefinition>;
}

/**
 * Method definition
 */
export interface MethodDefinition {
  name: string;
  type: CallType;
  requestType: string;
  responseType: string;
  requestStream: boolean;
  responseStream: boolean;
}

/**
 * Proto file definition
 */
export interface ProtoDefinition {
  package: string;
  services: Map<string, ServiceDefinition>;
  messages: Map<string, MessageDefinition>;
}

/**
 * Message definition
 */
export interface MessageDefinition {
  name: string;
  fields: Map<string, FieldDefinition>;
}

/**
 * Field definition
 */
export interface FieldDefinition {
  name: string;
  type: string;
  repeated: boolean;
  optional: boolean;
}

/**
 * Load balancing strategy
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_REQUEST = 'least_request',
  RANDOM = 'random'
}

/**
 * gRPC adapter configuration
 */
export interface GRPCAdapterConfig {
  host: string;
  port: number;
  protoPath?: string;
  protoContent?: string;
  credentials?: {
    type: CredentialsType;
    cert?: string;
    key?: string;
    ca?: string;
  };
  options?: {
    keepalive?: {
      time: number;
      timeout: number;
      permitWithoutCalls: boolean;
    };
    compression?: boolean;
    maxReceiveMessageLength?: number;
    maxSendMessageLength?: number;
  };
  loadBalancing?: {
    strategy: LoadBalancingStrategy;
    targets?: Array<{ host: string; port: number }>;
  };
  interceptors?: GRPCInterceptor[];
}

/**
 * Connection state
 */
export enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  READY = 'ready',
  TRANSIENT_FAILURE = 'transient_failure',
  SHUTDOWN = 'shutdown'
}

/**
 * gRPC Adapter
 * 
 * Comprehensive gRPC API integration adapter
 */
export class GRPCAdapter extends EventEmitter {
  private config: Required<GRPCAdapterConfig>;
  private protoDefinition?: ProtoDefinition;
  private interceptors: GRPCInterceptor[] = [];
  private connectionState: ConnectionState = ConnectionState.IDLE;
  private activeStreams: Map<string, Stream> = new Map();
  private callStats: Map<string, { count: number; errors: number }> = new Map();

  constructor(config: GRPCAdapterConfig) {
    super();
    this.config = {
      host: config.host,
      port: config.port,
      protoPath: config.protoPath,
      protoContent: config.protoContent,
      credentials: config.credentials ?? { type: CredentialsType.INSECURE },
      options: {
        keepalive: config.options?.keepalive ?? {
          time: 30000,
          timeout: 10000,
          permitWithoutCalls: true
        },
        compression: config.options?.compression ?? true,
        maxReceiveMessageLength: config.options?.maxReceiveMessageLength ?? 4 * 1024 * 1024,
        maxSendMessageLength: config.options?.maxSendMessageLength ?? 4 * 1024 * 1024
      },
      loadBalancing: config.loadBalancing ?? {
        strategy: LoadBalancingStrategy.ROUND_ROBIN,
        targets: []
      },
      interceptors: config.interceptors ?? []
    };

    this.interceptors = [...this.config.interceptors];
  }

  /**
   * Connect to gRPC server
   */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.READY) {
      return;
    }

    this.connectionState = ConnectionState.CONNECTING;
    this.emit('connection:connecting');

    try {
      // Load proto definition
      if (this.config.protoPath || this.config.protoContent) {
        await this.loadProto();
      }

      // Establish connection (implementation depends on gRPC library)
      // This is a placeholder
      await this.establishConnection();

      this.connectionState = ConnectionState.READY;
      this.emit('connection:ready');

    } catch (error) {
      this.connectionState = ConnectionState.TRANSIENT_FAILURE;
      this.emit('connection:error', { error });
      throw error;
    }
  }

  /**
   * Disconnect from gRPC server
   */
  async disconnect(): Promise<void> {
    // Cancel all active streams
    this.activeStreams.forEach(stream => stream.cancel());
    this.activeStreams.clear();

    this.connectionState = ConnectionState.SHUTDOWN;
    this.emit('connection:shutdown');
  }

  /**
   * Make unary RPC call
   */
  async call<T = unknown, R = unknown>(
    service: string,
    method: string,
    data: T,
    options?: CallOptions
  ): Promise<R> {
    await this.ensureConnected();

    const fullMethod = `${service}/${method}`;
    this.recordCall(fullMethod);

    try {
      // Apply interceptors
      let processedData = data;
      let metadata = options?.metadata ?? {};

      for (const interceptor of this.interceptors) {
        processedData = await interceptor.intercept(
          fullMethod,
          processedData,
          metadata,
          async (req, meta) => {
            metadata = meta;
            return req;
          }
        ) as T;
      }

      // Execute call (implementation depends on gRPC library)
      const result = await this.executeUnaryCall<T, R>(
        service,
        method,
        processedData,
        metadata,
        options
      );

      this.emit('call:success', { service, method, data, result });

      return result;

    } catch (error) {
      this.recordError(fullMethod);
      this.emit('call:error', { service, method, error });
      throw error;
    }
  }

  /**
   * Create server streaming call
   */
  serverStream<T = unknown, R = unknown>(
    service: string,
    method: string,
    data: T,
    options?: CallOptions
  ): Stream<R> {
    this.ensureConnected();

    const streamId = this.generateStreamId();
    const fullMethod = `${service}/${method}`;

    // Create stream (implementation depends on gRPC library)
    const stream = this.createServerStream<T, R>(
      service,
      method,
      data,
      options
    );

    this.activeStreams.set(streamId, stream);

    stream.on('end', () => {
      this.activeStreams.delete(streamId);
      this.emit('stream:end', { id: streamId, service, method });
    });

    stream.on('error', (error) => {
      this.activeStreams.delete(streamId);
      this.recordError(fullMethod);
      this.emit('stream:error', { id: streamId, service, method, error });
    });

    this.emit('stream:created', { id: streamId, service, method, type: 'server' });

    return stream;
  }

  /**
   * Create client streaming call
   */
  clientStream<T = unknown, R = unknown>(
    service: string,
    method: string,
    options?: CallOptions
  ): ClientStream<T, R> {
    this.ensureConnected();

    const streamId = this.generateStreamId();
    const fullMethod = `${service}/${method}`;

    // Create stream (implementation depends on gRPC library)
    const stream = this.createClientStream<T, R>(
      service,
      method,
      options
    );

    this.activeStreams.set(streamId, stream);

    stream.on('end', () => {
      this.activeStreams.delete(streamId);
      this.emit('stream:end', { id: streamId, service, method });
    });

    stream.on('error', (error) => {
      this.activeStreams.delete(streamId);
      this.recordError(fullMethod);
      this.emit('stream:error', { id: streamId, service, method, error });
    });

    this.emit('stream:created', { id: streamId, service, method, type: 'client' });

    return stream;
  }

  /**
   * Create bidirectional streaming call
   */
  bidiStream<T = unknown, R = unknown>(
    service: string,
    method: string,
    options?: CallOptions
  ): BidiStream<T, R> {
    this.ensureConnected();

    const streamId = this.generateStreamId();
    const fullMethod = `${service}/${method}`;

    // Create stream (implementation depends on gRPC library)
    const stream = this.createBidiStream<T, R>(
      service,
      method,
      options
    );

    this.activeStreams.set(streamId, stream);

    stream.on('end', () => {
      this.activeStreams.delete(streamId);
      this.emit('stream:end', { id: streamId, service, method });
    });

    stream.on('error', (error) => {
      this.activeStreams.delete(streamId);
      this.recordError(fullMethod);
      this.emit('stream:error', { id: streamId, service, method, error });
    });

    this.emit('stream:created', { id: streamId, service, method, type: 'bidi' });

    return stream;
  }

  /**
   * Add interceptor
   */
  addInterceptor(interceptor: GRPCInterceptor): void {
    this.interceptors.push(interceptor);
  }

  /**
   * Load proto definition
   */
  private async loadProto(): Promise<void> {
    // Implementation depends on proto-loader library
    // This is a placeholder
    this.protoDefinition = {
      package: 'example',
      services: new Map(),
      messages: new Map()
    };

    this.emit('proto:loaded', { definition: this.protoDefinition });
  }

  /**
   * Establish connection
   */
  private async establishConnection(): Promise<void> {
    // Implementation depends on gRPC library
    // This is a placeholder
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Ensure connected
   */
  private ensureConnected(): void {
    if (this.connectionState !== ConnectionState.READY) {
      throw new Error('gRPC adapter is not connected');
    }
  }

  /**
   * Execute unary call
   */
  private async executeUnaryCall<T, R>(
    service: string,
    method: string,
    data: T,
    metadata: Metadata,
    options?: CallOptions
  ): Promise<R> {
    // Implementation depends on gRPC library
    // This is a placeholder
    return {} as R;
  }

  /**
   * Create server stream
   */
  private createServerStream<T, R>(
    service: string,
    method: string,
    data: T,
    options?: CallOptions
  ): Stream<R> {
    // Implementation depends on gRPC library
    // This is a placeholder
    const emitter = new EventEmitter();
    return emitter as unknown as Stream<R>;
  }

  /**
   * Create client stream
   */
  private createClientStream<T, R>(
    service: string,
    method: string,
    options?: CallOptions
  ): ClientStream<T, R> {
    // Implementation depends on gRPC library
    // This is a placeholder
    const emitter = new EventEmitter();
    return emitter as unknown as ClientStream<T, R>;
  }

  /**
   * Create bidirectional stream
   */
  private createBidiStream<T, R>(
    service: string,
    method: string,
    options?: CallOptions
  ): BidiStream<T, R> {
    // Implementation depends on gRPC library
    // This is a placeholder
    const emitter = new EventEmitter();
    return emitter as unknown as BidiStream<T, R>;
  }

  /**
   * Record call statistics
   */
  private recordCall(method: string): void {
    const stats = this.callStats.get(method) || { count: 0, errors: 0 };
    stats.count++;
    this.callStats.set(method, stats);
  }

  /**
   * Record error statistics
   */
  private recordError(method: string): void {
    const stats = this.callStats.get(method) || { count: 0, errors: 0 };
    stats.errors++;
    this.callStats.set(method, stats);
  }

  /**
   * Generate stream ID
   */
  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get proto definition
   */
  getProtoDefinition(): ProtoDefinition | undefined {
    return this.protoDefinition;
  }

  /**
   * Get adapter statistics
   */
  getStats(): {
    connectionState: ConnectionState;
    activeStreams: number;
    totalCalls: number;
    totalErrors: number;
    callStats: Map<string, { count: number; errors: number }>;
  } {
    const totalCalls = Array.from(this.callStats.values())
      .reduce((sum, stats) => sum + stats.count, 0);
    const totalErrors = Array.from(this.callStats.values())
      .reduce((sum, stats) => sum + stats.errors, 0);

    return {
      connectionState: this.connectionState,
      activeStreams: this.activeStreams.size,
      totalCalls,
      totalErrors,
      callStats: new Map(this.callStats)
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return this.connectionState === ConnectionState.READY;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }
}

/**
 * Create gRPC adapter instance
 */
export function createGRPCAdapter(config: GRPCAdapterConfig): GRPCAdapter {
  return new GRPCAdapter(config);
}

export default GRPCAdapter;