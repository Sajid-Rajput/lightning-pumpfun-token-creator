/**
 * Lightning Fast PumpFun Token Creator - Professional Logger
 * 
 * Comprehensive logging system with multiple levels and colored output.
 */

import { LogLevel, LoggerConfig } from './types';

export class ConsoleLogger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level || LogLevel.INFO,
      enableConsole: config.enableConsole ?? true,
      enableFile: config.enableFile ?? false,
      filePath: config.filePath || './logs/app.log',
      enablePerformanceLogging: config.enablePerformanceLogging ?? true,
      enableColoredOutput: config.enableColoredOutput ?? true,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.DEBUG]: 3,
      [LogLevel.VERBOSE]: 4,
    };
    return levels[level] <= levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level);
    return `${timestamp} ${emoji} [${level.toUpperCase()}] ${message}`;
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.VERBOSE: return '📝';
      default: return '📝';
    }
  }

  // === Public Logging Methods ===

  public error(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message));
      if (meta) console.error(meta);
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message));
      if (meta) console.warn(meta);
    }
  }

  public info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message));
      if (meta) console.log(meta);
    }
  }

  public debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message));
      if (meta) console.log(meta);
    }
  }

  public verbose(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      console.log(this.formatMessage(LogLevel.VERBOSE, message));
      if (meta) console.log(meta);
    }
  }

  // === Specialized Logging Methods ===

  public success(message: string, meta?: any): void {
    this.info(`✅ ${message}`, meta);
  }

  public failure(message: string, meta?: any): void {
    this.error(`❌ ${message}`, meta);
  }

  public progress(message: string, meta?: any): void {
    this.info(`🔄 ${message}`, meta);
  }

  public performance(operation: string, duration: number, meta?: any): void {
    if (this.config.enablePerformanceLogging) {
      this.info(`⚡ ${operation}: ${duration}ms`, meta);
    }
  }

  public network(message: string, meta?: any): void {
    this.info(`🌐 ${message}`, meta);
  }

  public transaction(message: string, signature?: string, meta?: any): void {
    this.info(`💰 ${message}`, { signature, ...meta });
  }

  public provider(provider: string, message: string, meta?: any): void {
    this.info(`🔗 [${provider}] ${message}`, meta);
  }

  public banner(title: string): void {
    const border = '='.repeat(60);
    const centeredTitle = title.padStart((60 + title.length) / 2).padEnd(60);
    console.log(border);
    console.log(centeredTitle);
    console.log(border);
  }

  public section(title: string): void {
    const sectionBorder = '-'.repeat(40);
    console.log(`\n${sectionBorder}`);
    console.log(title);
    console.log(sectionBorder);
  }

  public healthCheck(service: string, status: 'healthy' | 'degraded' | 'unhealthy'): void {
    const statusIcon = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
    this.info(`${statusIcon} ${service}: ${status.toUpperCase()}`);
  }

  public metrics(title: string, metrics: Record<string, number>): void {
    this.section(`📊 ${title}`);
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`${key.padEnd(25)}: ${value}ms`);
    });
  }

  // === Configuration Methods ===

  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  public enableColors(enable: boolean): void {
    this.config.enableColoredOutput = enable;
  }

  public enablePerformanceLogging(enable: boolean): void {
    this.config.enablePerformanceLogging = enable;
  }
}

// === Singleton Logger Instance ===

let loggerInstance: ConsoleLogger | null = null;

export function getLogger(config?: Partial<LoggerConfig>): ConsoleLogger {
  if (!loggerInstance) {
    loggerInstance = new ConsoleLogger(config);
  }
  return loggerInstance;
}

export function setLogger(logger: ConsoleLogger): void {
  loggerInstance = logger;
}

export default ConsoleLogger;
