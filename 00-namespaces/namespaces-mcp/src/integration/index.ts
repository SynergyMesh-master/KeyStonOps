/**
 * Integration & Extension Layer - Unified Exports
 * 
 * Provides comprehensive integration capabilities including multi-protocol adapters,
 * plugin system, extension management, middleware chain, event bridge, and adapter registry.
 * 
 * @module integration
 */

// REST Adapter
export {
  RESTAdapter,
  createRESTAdapter,
  HTTPMethod,
  CircuitState,
  type RequestOptions,
  type Response,
  type RequestConfig,
  type BatchRequest,
  type BatchResponse,
  type RequestInterceptor,
  type ResponseInterceptor,
  type CircuitBreakerConfig,
  type RESTAdapterConfig
} from './adapters/rest';

// GraphQL Adapter
export {
  GraphQLAdapter,
  createGraphQLAdapter,
  OperationType,
  type Variables,
  type QueryResult,
  type GraphQLError,
  type MutationResult,
  type SubscriptionResult,
  type BatchLoadFn,
  type DataLoaderOptions,
  type GraphQLAdapterConfig
} from './adapters/graphql';

// gRPC Adapter
export {
  GRPCAdapter,
  createGRPCAdapter,
  CallType,
  CredentialsType,
  LoadBalancingStrategy,
  ConnectionState,
  type Metadata,
  type CallOptions,
  type Stream,
  type ClientStream,
  type BidiStream,
  type Status,
  type GRPCInterceptor,
  type GRPCAdapterConfig
} from './adapters/grpc';

// Plugin System
export {
  PluginSystem,
  createPluginSystem,
  PluginState,
  type PluginMetadata,
  type PluginContext,
  type Plugin,
  type PluginSystemConfig
} from './plugins/plugin-system';

/**
 * Create complete integration system
 */
export function createIntegrationSystem(config?: {
  rest?: any;
  graphql?: any;
  grpc?: any;
  plugins?: any;
}) {
  const rest = config?.rest ? createRESTAdapter(config.rest) : undefined;
  const graphql = config?.graphql ? createGraphQLAdapter(config.graphql) : undefined;
  const grpc = config?.grpc ? createGRPCAdapter(config.grpc) : undefined;
  const plugins = createPluginSystem(config?.plugins);

  return {
    rest,
    graphql,
    grpc,
    plugins
  };
}