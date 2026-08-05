import winston from 'winston';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  timestamp?: boolean;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
  })
);

export class Logger {
  private winston: winston.Logger;
  private context: string;

  constructor(options: LoggerOptions = {}) {
    this.context = options.context || 'app';
    this.winston = winston.createLogger({
      level: options.level || 'info',
      format: logFormat,
      transports: [
        new winston.transports.Console({
          format: consoleFormat,
        }),
      ],
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.winston.debug(message, { context: this.context, ...meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.winston.info(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.winston.warn(message, { context: this.context, ...meta });
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.winston.error(message, {
      context: this.context,
      error: error?.message,
      stack: error?.stack,
      ...meta,
    });
  }

  child(context: string): Logger {
    return new Logger({
      level: this.winston.level as LogLevel,
      context: `${this.context}:${context}`,
    });
  }
}

let defaultLogger: Logger | null = null;

export function getLogger(options?: LoggerOptions): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger(options);
  }
  return defaultLogger;
}

export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}