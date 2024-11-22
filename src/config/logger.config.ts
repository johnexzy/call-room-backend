import { createLogger, format, transports } from 'winston';

export const complianceLogger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.File({
      filename: 'logs/compliance.log',
      level: 'info',
    }),
  ],
});
