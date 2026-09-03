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

const sensitiveKeyPattern =
  /(?:authorization|cookie|csrf|email|password|secret|token|body|query|user(?:id)?|student(?:id)?|organization(?:id)?|org(?:id)?)/i;
const sensitiveSessionKeyPattern =
  /^(?:sessions?|session_?ids?|session_?tokens?|session_?cookies?|session_?secrets?)$/i;

function isSensitiveLogKey(key: string): boolean {
  return sensitiveKeyPattern.test(key) || sensitiveSessionKeyPattern.test(key);
}
const redacted = '[REDACTED]';

export function redactLogValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(value.stack === undefined ? {} : { stack: value.stack }),
    };
  }
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item, seen));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      isSensitiveLogKey(key) ? redacted : redactLogValue(nestedValue, seen),
    ]),
  );
}

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

    const safeFields = redactLogValue(fields) as LogFields;
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...safeFields,
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
