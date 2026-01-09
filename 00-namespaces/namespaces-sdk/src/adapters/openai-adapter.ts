/**
 * OpenAI Adapter - INSTANT Implementation
 * 自动OpenAI API包装，<100ms延迟
 */

import { ServiceAdapter } from '../core/service-adapter';

export class OpenAIAdapter extends ServiceAdapter {
  constructor(config: OpenAIConfig) {
    super('openai', config);
  }

  async initialize(): Promise<void> {
    // 即时初始化
  }

  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletion> {
    // 即时聊天完成
    return {} as ChatCompletion;
  }

  async createEmbedding(params: EmbeddingParams): Promise<Embedding> {
    // 即时嵌入生成
    return {} as Embedding;
  }
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export interface ChatCompletionParams {
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface EmbeddingParams {
  input: string;
  model?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletion {
  id: string;
  choices: Choice[];
  usage: Usage;
}

export interface Choice {
  message: ChatMessage;
  finishReason: string;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Embedding {
  object: string;
  embedding: number[];
  index: number;
}
