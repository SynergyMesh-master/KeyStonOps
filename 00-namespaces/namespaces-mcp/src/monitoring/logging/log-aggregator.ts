/**
 * Log Aggregator - Centralized Log Aggregation System
 * 
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { LogEntry } from './logger';

export class LogAggregator extends EventEmitter {
  private logs: Map<string, LogEntry[]>;
  private maxLogsPerSource: number;
  
  constructor(config?: { maxLogsPerSource?: number }) {
    super();
    this.logs = new Map();
    this.maxLogsPerSource = config?.maxLogsPerSource || 10000;
  }
  
  aggregate(source: string, entry: LogEntry): void {
    let sourceLogs = this.logs.get(source);
    
    if (!sourceLogs) {
      sourceLogs = [];
      this.logs.set(source, sourceLogs);
    }
    
    sourceLogs.push(entry);
    
    if (sourceLogs.length > this.maxLogsPerSource) {
      sourceLogs.shift();
    }
    
    this.emit('log:aggregated', { source, entry });
  }
  
  getLogs(source?: string): LogEntry[] {
    if (source) {
      return this.logs.get(source) || [];
    }
    
    return Array.from(this.logs.values()).flat();
  }
  
  getSources(): string[] {
    return Array.from(this.logs.keys());
  }
  
  clear(source?: string): void {
    if (source) {
      this.logs.delete(source);
    } else {
      this.logs.clear();
    }
  }
}
