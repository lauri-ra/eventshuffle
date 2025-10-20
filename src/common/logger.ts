import { APP_CONFIG } from '../config.ts';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    error?: Error,
  ): void {
    // Log only messages based on the environment min level.
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(message: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message);
  }

  info(message: string): void {
    this.log(LogLevel.INFO, 'INFO', message);
  }

  warn(message: string, error?: Error): void {
    this.log(LogLevel.WARN, 'WARN', message, error);
  }

  error(message: string, error?: Error): void {
    this.log(LogLevel.ERROR, 'ERROR', message, error);
  }
}

// Set log level based on the node env
// production -> INFO, WARN, ERROR
// development -> DEBUG, INFO, WARN, ERROR
const logLevel =
  APP_CONFIG.nodeEnv === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

// Create the default logger instance.
export const logger = new Logger(logLevel);
