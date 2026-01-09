/**
 * Distributed Tracing
 * 
 * Implements tracing for tool invocations and cross-service calls.
 */

/**
 * Span context
 */
export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags?: number;
}

/**
 * Span interface
 */
export interface Span {
  context: SpanContext;
  name: string;
  startTime: Date;
  endTime?: Date;
  attributes: Record<string, any>;
  events: SpanEvent[];
  status?: SpanStatus;
  
  setAttribute(key: string, value: any): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  setStatus(status: SpanStatus): void;
  end(): void;
}

/**
 * Span event
 */
export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes?: Record<string, any>;
}

/**
 * Span status
 */
export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

/**
 * Span status code
 */
export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2
}

/**
 * Tracer configuration
 */
export interface TracerConfig {
  serviceName?: string;
  enabled?: boolean;
  samplingRate?: number;
  exporter?: TraceExporter;
}

/**
 * Trace exporter interface
 */
export interface TraceExporter {
  export(spans: Span[]): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Console trace exporter
 */
export class ConsoleTraceExporter implements TraceExporter {
  async export(spans: Span[]): Promise<void> {
    for (const span of spans) {
      console.log('[TRACE]', {
        traceId: span.context.traceId,
        spanId: span.context.spanId,
        name: span.name,
        duration: span.endTime 
          ? span.endTime.getTime() - span.startTime.getTime()
          : null,
        attributes: span.attributes,
        status: span.status
      });
    }
  }

  async shutdown(): Promise<void> {
    // No-op for console exporter
  }
}

/**
 * Span implementation
 */
class SpanImpl implements Span {
  context: SpanContext;
  name: string;
  startTime: Date;
  endTime?: Date;
  attributes: Record<string, any>;
  events: SpanEvent[];
  status?: SpanStatus;
  private tracer: Tracer;

  constructor(
    name: string,
    context: SpanContext,
    attributes: Record<string, any>,
    tracer: Tracer
  ) {
    this.name = name;
    this.context = context;
    this.startTime = new Date();
    this.attributes = attributes;
    this.events = [];
    this.tracer = tracer;
  }

  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  addEvent(name: string, attributes?: Record<string, any>): void {
    this.events.push({
      name,
      timestamp: new Date(),
      attributes
    });
  }

  setStatus(status: SpanStatus): void {
    this.status = status;
  }

  end(): void {
    if (this.endTime) {
      return; // Already ended
    }

    this.endTime = new Date();
    this.tracer.endSpan(this);
  }
}

/**
 * Tracer class
 */
export class Tracer {
  private config: TracerConfig;
  private activeSpans: Map<string, Span>;
  private completedSpans: Span[];
  private exporter: TraceExporter;

  constructor(config: TracerConfig = {}) {
    this.config = {
      serviceName: 'namespace-sdk',
      enabled: true,
      samplingRate: 1.0,
      ...config
    };

    this.activeSpans = new Map();
    this.completedSpans = [];
    this.exporter = config.exporter || new ConsoleTraceExporter();
  }

  async initialize(): Promise<void> {
    // Initialize tracer
  }

  /**
   * Start a new span
   */
  startSpan(name: string, attributes: Record<string, any> = {}): Span {
    if (!this.config.enabled) {
      return this.createNoOpSpan(name);
    }

    // Check sampling
    if (Math.random() > (this.config.samplingRate || 1.0)) {
      return this.createNoOpSpan(name);
    }

    const context: SpanContext = {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId()
    };

    const span = new SpanImpl(name, context, attributes, this);
    this.activeSpans.set(context.spanId, span);

    return span;
  }

  /**
   * Start a child span
   */
  startChildSpan(parentSpan: Span, name: string, attributes: Record<string, any> = {}): Span {
    if (!this.config.enabled) {
      return this.createNoOpSpan(name);
    }

    const context: SpanContext = {
      traceId: parentSpan.context.traceId,
      spanId: this.generateSpanId(),
      parentSpanId: parentSpan.context.spanId
    };

    const span = new SpanImpl(name, context, attributes, this);
    this.activeSpans.set(context.spanId, span);

    return span;
  }

  /**
   * End a span (called by Span.end())
   */
  endSpan(span: Span): void {
    this.activeSpans.delete(span.context.spanId);
    this.completedSpans.push(span);

    // Export if batch size reached
    if (this.completedSpans.length >= 100) {
      this.flush();
    }
  }

  /**
   * Flush completed spans
   */
  async flush(): Promise<void> {
    if (this.completedSpans.length === 0) {
      return;
    }

    const spans = this.completedSpans.splice(0);
    
    try {
      await this.exporter.export(spans);
    } catch (error) {
      console.error('Failed to export spans:', error);
    }
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return this.generateId(32);
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return this.generateId(16);
  }

  /**
   * Generate random ID
   */
  private generateId(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  /**
   * Create no-op span
   */
  private createNoOpSpan(name: string): Span {
    return {
      context: {
        traceId: '',
        spanId: ''
      },
      name,
      startTime: new Date(),
      attributes: {},
      events: [],
      setAttribute: () => {},
      addEvent: () => {},
      setStatus: () => {},
      end: () => {}
    };
  }

  /**
   * Get active span count
   */
  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  /**
   * Shutdown tracer
   */
  async shutdown(): Promise<void> {
    await this.flush();
    await this.exporter.shutdown();
    this.activeSpans.clear();
    this.completedSpans = [];
  }
}