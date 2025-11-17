import Config from 'react-native-config';

const IS_DEV = Config.ENVIRONMENT === 'development' || __DEV__;

/**
 * Production-safe logger
 * Logs only in development, silenced in production
 */
class Logger {
  log(...args: unknown[]): void {
    if (IS_DEV) {
      console.log('[Ordak]', ...args);
    }
  }

  error(...args: unknown[]): void {
    if (IS_DEV) {
      console.error('[Ordak Error]', ...args);
    }
    // In production, you could send to error tracking service like Sentry
    // Example: Sentry.captureException(args[0]);
  }

  warn(...args: unknown[]): void {
    if (IS_DEV) {
      console.warn('[Ordak Warning]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (IS_DEV) {
      console.info('[Ordak Info]', ...args);
    }
  }

  debug(...args: unknown[]): void {
    if (IS_DEV) {
      console.debug('[Ordak Debug]', ...args);
    }
  }
}

export const logger = new Logger();
