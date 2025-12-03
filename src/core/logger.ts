/*import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'debug', // Nivel mínimo de logging (puede ser 'error', 'warn', 'info', 'debug', etc.)
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console(), // Log en la consola
    new transports.File({ filename: 'obsidian-agenda.log',
      level: 'error',
      format: format.json() }) // Log en un archivo
  ],
});

export default logger;*/