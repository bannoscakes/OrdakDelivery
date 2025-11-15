import winston from 'winston';
import env from './env';

const { combine, timestamp, printf, colorize, json } = winston.format;

const simpleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp as string} [${level}]: ${message as string}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    env.LOG_FORMAT === 'json' ? json() : simpleFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        env.LOG_FORMAT === 'json' ? json() : simpleFormat
      ),
    }),
  ],
});

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
