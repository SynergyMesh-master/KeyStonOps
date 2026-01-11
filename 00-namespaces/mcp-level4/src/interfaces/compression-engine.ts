/**
 * MCP Level 4 Compression Engine Interface
 * Self-compression for context and knowledge optimization
 */

import { IEngine, IEngineConfig } from './core';

export enum CompressionAlgorithm {
  GZIP = 'gzip',
  BROTLI = 'brotli',
  SEMANTIC = 'semantic'
}

export interface ICompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  durationMs: number;
}

export interface ICompressionConfig extends IEngineConfig {
  config: {
    defaultAlgorithm: CompressionAlgorithm;
    targetCompressionRatio: number;
    enableSemanticCompression: boolean;
  };
}

export interface ICompressionEngine extends IEngine {
  readonly config: ICompressionConfig;
  compress(data: Buffer | string, algorithm?: CompressionAlgorithm): Promise<Buffer>;
  decompress(data: Buffer, algorithm: CompressionAlgorithm): Promise<Buffer>;
  optimizeMemory(): Promise<{ memorySavedMB: number }>;
}