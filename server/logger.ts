type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(entry: LogEntry): string {
  const prefix = entry.context ? `[${entry.context}]` : '';
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `${prefix} ${entry.message}${dataStr}`;
}

function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
  };

  const formatted = formatMessage(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => log('debug', context, message, data),
    info: (message: string, data?: unknown) => log('info', context, message, data),
    warn: (message: string, data?: unknown) => log('warn', context, message, data),
    error: (message: string, data?: unknown) => log('error', context, message, data),
  };
}

export const logger = createLogger('App');
