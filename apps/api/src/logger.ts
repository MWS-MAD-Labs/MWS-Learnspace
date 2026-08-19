import type { AppConfig } from './config.js';

const priorities = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
} as const;

type LogLevel = keyof typeof priorities;
type LogFields = Record<string, unknown>;

export type Logger = {
  fatal: (fields: LogFields, message: string) => void;
  error: (fields: LogFields, message: string) => void;
  warn: (fields: LogFields, message: string) => void;
  info: (fields: LogFields, message: string) => void;
  debug: (fields: LogFields, message: string) => void;
  trace: (fields: LogFields, message: string) => void;
};

export function createLogger(config: Pick<AppConfig, 'logLevel'>): Logger {
  const write = (level: LogLevel, fields: LogFields, message: string) => {
    if (priorities[level] > priorities[config.logLevel]) return;

    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...fields,
    });

    if (level === 'fatal' || level === 'error') console.error(entry);
    else console.log(entry);
  };

  return {
    fatal: (fields, message) => write('fatal', fields, message),
    error: (fields, message) => write('error', fields, message),
    warn: (fields, message) => write('warn', fields, message),
    info: (fields, message) => write('info', fields, message),
    debug: (fields, message) => write('debug', fields, message),
    trace: (fields, message) => write('trace', fields, message),
  };
}
