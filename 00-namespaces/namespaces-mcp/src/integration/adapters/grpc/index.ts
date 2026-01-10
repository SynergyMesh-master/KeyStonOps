/**
 * gRPC Adapter Module - Unified Exports
 * 
 * @module integration/adapters/grpc
 */

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
  type ServiceDefinition,
  type MethodDefinition,
  type ProtoDefinition,
  type MessageDefinition,
  type FieldDefinition,
  type GRPCAdapterConfig
} from './grpc-adapter';