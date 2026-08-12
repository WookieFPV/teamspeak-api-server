import * as process from 'node:process';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LEVELS)[number];

const isLogLevel = (value: string): value is LogLevel =>
  (LEVELS as readonly string[]).includes(value);

// read directly from process.env (not ~/env.ts) so logging works even while
// validating the environment
const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const minLevel: LogLevel = isLogLevel(configured) ? configured : 'info';
const minLevelIndex = LEVELS.indexOf(minLevel);

const write = (
  level: LogLevel,
  scope: string,
  message: string,
  data?: unknown,
) => {
  if (LEVELS.indexOf(level) < minLevelIndex) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;
  const sink =
    level === 'error' || level === 'warn' ? console.error : console.log;
  if (data === undefined) sink(line);
  else sink(line, data);
};

/**
 * Minimal leveled logger. Every log line is timestamped and scoped so problems
 * (missed events, dropped websocket sends, reconnects) can be correlated
 * across the teamspeak connection and the websocket connections.
 */
export const createLogger = (scope: string) => ({
  debug: (message: string, data?: unknown) =>
    write('debug', scope, message, data),
  info: (message: string, data?: unknown) =>
    write('info', scope, message, data),
  warn: (message: string, data?: unknown) =>
    write('warn', scope, message, data),
  error: (message: string, data?: unknown) =>
    write('error', scope, message, data),
  child: (childScope: string) => createLogger(`${scope}:${childScope}`),
});

export const logLevel = minLevel;
export const isDebugEnabled = minLevelIndex === 0;
