/**
 * Metrics Collection
 * 
 * Collects and exports metrics on SDK usage, performance, and errors.
 */

/**
 * Metric type
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram'
}

/**
 * Metric interface
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

/**
 * Histogram bucket
 */
export interface HistogramBucket {
  le: number; // Less than or equal to
  count: number;
}

/**
 * Histogram data
 */
export interface HistogramData {
  sum: number;
  count: number;
  buckets: HistogramBucket[];
}

/**
 * Metrics exporter interface
 */
export interface MetricsExporter {
  export(metrics: Metric[]): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Console metrics exporter
 */
export class ConsoleMetricsExporter implements MetricsExporter {
  async export(metrics: Metric[]): Promise<void> {
    for (const metric of metrics) {
      console.log('[METRIC]', {
        name: metric.name,
        type: metric.type,
        value: metric.value,
        labels: metric.labels,
        timestamp: metric.timestamp.toISOString()
      });
    }
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}

/**
 * Metrics collector configuration
 */
export interface MetricsConfig {
  enabled?: boolean;
  prefix?: string;
  exportInterval?: number;
  exporter?: MetricsExporter;
  defaultLabels?: Record<string, string>;
}

/**
 * Metrics collector class
 */
export class MetricsCollector {
  private config: MetricsConfig;
  private counters: Map<string, number>;
  private gauges: Map<string, number>;
  private histograms: Map<string, HistogramData>;
  private exporter: MetricsExporter;
  private exportTimer: NodeJS.Timeout | null;

  constructor(config: MetricsConfig = {}) {
    this.config = {
      enabled: true,
      prefix: 'sdk',
      exportInterval: 60000, // 1 minute
      defaultLabels: {},
      ...config
    };

    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.exporter = config.exporter || new ConsoleMetricsExporter();
    this.exportTimer = null;
  }

  async initialize(): Promise<void> {
    if (this.config.enabled && this.config.exportInterval) {
      this.exportTimer = setInterval(
        () => this.export(),
        this.config.exportInterval
      );
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    if (!this.config.enabled) return;

    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.getMetricKey(name, labels);
    let data = this.histograms.get(key);

    if (!data) {
      data = {
        sum: 0,
        count: 0,
        buckets: this.createBuckets()
      };
      this.histograms.set(key, data);
    }

    data.sum += value;
    data.count++;

    // Update buckets
    for (const bucket of data.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  /**
   * Create histogram buckets
   */
  private createBuckets(): HistogramBucket[] {
    const boundaries = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    return boundaries.map(le => ({ le, count: 0 }));
  }

  /**
   * Get metric key
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    const fullName = this.config.prefix ? `${this.config.prefix}_${name}` : name;
    
    if (!labels || Object.keys(labels).length === 0) {
      return fullName;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `${fullName}{${labelStr}}`;
  }

  /**
   * Parse metric key
   */
  private parseMetricKey(key: string): { name: string; labels?: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    
    if (!match) {
      return { name: key };
    }

    const name = match[1];
    const labelsStr = match[2];

    if (!labelsStr) {
      return { name };
    }

    const labels: Record<string, string> = {};
    const pairs = labelsStr.split(',');

    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      labels[k] = v.replace(/"/g, '');
    }

    return { name, labels };
  }

  /**
   * Export metrics
   */
  async export(): Promise<void> {
    const metrics: Metric[] = [];
    const timestamp = new Date();

    // Export counters
    for (const [key, value] of this.counters.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      metrics.push({
        name,
        type: MetricType.COUNTER,
        value,
        timestamp,
        labels: { ...this.config.defaultLabels, ...labels }
      });
    }

    // Export gauges
    for (const [key, value] of this.gauges.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      metrics.push({
        name,
        type: MetricType.GAUGE,
        value,
        timestamp,
        labels: { ...this.config.defaultLabels, ...labels }
      });
    }

    // Export histograms
    for (const [key, data] of this.histograms.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      
      // Export sum
      metrics.push({
        name: `${name}_sum`,
        type: MetricType.COUNTER,
        value: data.sum,
        timestamp,
        labels: { ...this.config.defaultLabels, ...labels }
      });

      // Export count
      metrics.push({
        name: `${name}_count`,
        type: MetricType.COUNTER,
        value: data.count,
        timestamp,
        labels: { ...this.config.defaultLabels, ...labels }
      });

      // Export buckets
      for (const bucket of data.buckets) {
        metrics.push({
          name: `${name}_bucket`,
          type: MetricType.COUNTER,
          value: bucket.count,
          timestamp,
          labels: {
            ...this.config.defaultLabels,
            ...labels,
            le: bucket.le.toString()
          }
        });
      }
    }

    if (metrics.length > 0) {
      try {
        await this.exporter.export(metrics);
      } catch (error) {
        console.error('Failed to export metrics:', error);
      }
    }
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): any {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, data]) => [
          key,
          {
            sum: data.sum,
            count: data.count,
            avg: data.count > 0 ? data.sum / data.count : 0
          }
        ])
      )
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /**
   * Shutdown metrics collector
   */
  async shutdown(): Promise<void> {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }

    await this.export();
    await this.exporter.shutdown();
  }
}