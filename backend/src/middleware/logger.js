import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    transports: [
        // Console transport
        new winston.transports.Console({
            format: consoleFormat
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for errors only
        new winston.transports.File({
            filename: join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Export logger
export default logger;

/**
 * Express middleware for request logging
 */
export function requestLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent')
        });
    });

    next();
}
