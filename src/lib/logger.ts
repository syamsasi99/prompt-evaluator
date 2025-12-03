/**
 * Structured logging utility with configurable log levels
 *
 * Log Levels (in order of severity):
 * - DEBUG: Detailed information for debugging
 * - INFO: General informational messages
 * - WARN: Warning messages for potentially harmful situations
 * - ERROR: Error messages for failures
 *
 * Usage:
 * import { logger } from './lib/logger';
 *
 * logger.debug('component', 'Detailed debug info', { data });
 * logger.info('api', 'Request started', { url });
 * logger.warn('validation', 'Missing field', { field });
 * logger.error('api', 'Request failed', { error });
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private minLevel: LogLevel = LogLevel.DEBUG;
  private isProduction: boolean = false;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 1000; // Keep last 1000 log entries in memory

  constructor() {
    // In production, only show INFO and above
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLog(level: string, category: string, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
    };

    if (data !== undefined) {
      entry.data = data;
    }

    return entry;
  }

  private log(level: LogLevel, levelName: string, category: string, message: string, data?: any) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.formatLog(levelName, category, message, data);
    const prefix = `[${entry.timestamp}] [${levelName}] [${category}]`;

    // Add to buffer (for in-app log viewer)
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Write to file via IPC (if available)
    if ((window as any).api?.writeLog) {
      const logLine = `${prefix} ${message}${data !== undefined ? ' ' + JSON.stringify(data) : ''}\n`;
      (window as any).api.writeLog(logLine).catch((err: any) => {
        console.error('Failed to write log to file:', err);
      });
    }

    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data !== undefined ? data : '');
        break;
    }
  }

  /**
   * Log debug information (development only)
   * @param category - Category/module name (e.g., 'api', 'validation', 'ui')
   * @param message - Log message
   * @param data - Optional data to log
   */
  debug(category: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, 'DEBUG', category, message, data);
  }

  /**
   * Log informational messages
   * @param category - Category/module name
   * @param message - Log message
   * @param data - Optional data to log
   */
  info(category: string, message: string, data?: any) {
    this.log(LogLevel.INFO, 'INFO', category, message, data);
  }

  /**
   * Log warning messages
   * @param category - Category/module name
   * @param message - Log message
   * @param data - Optional data to log
   */
  warn(category: string, message: string, data?: any) {
    this.log(LogLevel.WARN, 'WARN', category, message, data);
  }

  /**
   * Log error messages
   * @param category - Category/module name
   * @param message - Log message
   * @param data - Optional data to log (e.g., error object)
   */
  error(category: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, 'ERROR', category, message, data);
  }

  /**
   * Set minimum log level
   * @param level - Minimum log level to display
   */
  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Get recent log entries from buffer
   * @param count - Number of recent entries to return (default: all)
   */
  getRecentLogs(count?: number): LogEntry[] {
    if (count === undefined) {
      return [...this.logBuffer];
    }
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearBuffer() {
    this.logBuffer = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience type for categories
export type LogCategory =
  | 'app'
  | 'api'
  | 'evaluation'
  | 'bigquery'
  | 'validation'
  | 'ui'
  | 'sync'
  | 'tutorial'
  | 'history'
  | 'comparison'
  | 'dataset'
  | 'prompt'
  | 'provider'
  | 'assertion'
  | 'security';
