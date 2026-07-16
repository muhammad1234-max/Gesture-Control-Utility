import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { PathManager } from './PathManager';

const logDir = PathManager.getInstance().logsDir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    performance: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    performance: 'cyan',
    debug: 'blue'
  }
};

winston.addColors(customLevels.colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

function createTransport(filename: string, level: string) {
  return new DailyRotateFile({
    filename: path.join(logDir, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: level,
    format: logFormat
  });
}

const winstonLogger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'performance',
  transports: [
    createTransport('session', 'info'),
    createTransport('crash', 'error'),
    createTransport('telemetry', 'performance'),
    createTransport('debug', 'debug')
  ]
});

// Also log to console in dev mode
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export class Logger {
  public static debug(message: string, meta?: any) {
    winstonLogger.log('debug', message, meta);
  }

  public static info(message: string, meta?: any) {
    winstonLogger.log('info', message, meta);
  }

  public static warn(message: string, meta?: any) {
    winstonLogger.log('warn', message, meta);
  }

  public static error(message: string, meta?: any) {
    winstonLogger.log('error', message, meta);
  }

  public static performance(message: string, meta?: any) {
    winstonLogger.log('performance', message, meta);
  }
}
