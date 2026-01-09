/**
 * Structured Logger
 * 
 * Implements structured, configurable logging for all SDK operations.
 */

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  logger: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  correlationId?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel;
  debug?: boolean;
  format?: 'json' | 'text';
  outputs?: LogOutput[];
  includeTimestamp?: boolean;
  includeLevel?: boolean;
  includeLogger?: boolean;
}

/**
 * Log output interface
 */
export interface LogOutput {
  write(entry: LogEntry): void | Promise<void>;
}

/**
 * Console log output
 */
export class ConsoleOutput implements LogOutput {
  write(entry: LogEntry): void {
    const level = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const message = `[${timestamp}] [${level}] [${entry.logger}] ${entry.message}`;
    
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const fullMessage = message + context;

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(fullMessage);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(fullMessage);
        if (entry.error) {
          console.error(entry.error);
        }
        break;
    }
  }
}

/**
 * File log output
 */
export class FileOutput implements LogOutput {
  private filePath: string;
  private buffer: LogEntry[];
  private flushInterval: NodeJS.Timeout | null;

  constructor(filePath: string, flushIntervalMs: number = 5000) {
    this.filePath = filePath;
    this.buffer = [];
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);
    
    // Auto-flush on error or fatal
    if (entry.level >= LogLevel.ERROR) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = this.buffer.splice(0);
    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';

    // In a real implementation, this would write to file
    // const fs = require('fs/promises');
    // await fs.appendFile(this.filePath, lines);
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}

/**
 * Logger class
 */
export class Logger {
  private name: string;
  private config: LoggerConfig;
  private outputs: LogOutput[];

  constructor(name: string, config: LoggerConfig = {}) {
    this.name = name;
    this.config = {
      level: config.debug ? LogLevel.DEBUG : LogLevel.INFO,
      format: 'text',
      includeTimestamp: true,
      includeLevel: true,
      includeLogger: true,
      ...config
    };

    // Initialize outputs
    this.outputs = config.outputs || [new ConsoleOutput()];
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      logger: this.name,
      message,
      context,
      error: error instanceof Error ? error : undefined
    };

    this.write(entry);
  }

  /**
   * Log a fatal message
   */
  fatal(message: string, error?: Error | any, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.FATAL,
      logger: this.name,
      message,
      context,
      error: error instanceof Error ? error : undefined
    };

    this.write(entry);
  }

  /**
   * Core log method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level < (this.config.level || LogLevel.INFO)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      logger: this.name,
      message,
      context
    };

    this.write(entry);
  }

  /**
   * Write log entry to outputs
   */
  private write(entry: LogEntry): void {
    for (const output of this.outputs) {
      try {
        output.write(entry);
      } catch (error) {
        console.error('Failed to write log entry:', error);
      }
    }
  }

  /**
   * Create child logger
   */
  child(name: string): Logger {
    return new Logger(`${this.name}.${name}`, this.config);
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get log level
   */
  getLevel(): LogLevel {
    return this.config.level || LogLevel.INFO;
  }

  /**
   * Add output
   */
  addOutput(output: LogOutput): void {
    this.outputs.push(output);
  }

  /**
   * Shutdown logger
   */
  async shutdown(): Promise<void> {
    for (const output of this.outputs) {
      if (output instanceof FileOutput) {
        await output.shutdown();
      }
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get or create global logger
 */
export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger('global');
  }
  return globalLogger;
}

/**
 * Set global logger
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}