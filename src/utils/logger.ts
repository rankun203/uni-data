import winston from 'winston';

// Configure Winston logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(/*winston.format.timestamp(),*/ winston.format.json()),
  transports: [new winston.transports.Console({ level: 'info', format: winston.format.simple() })],
});
