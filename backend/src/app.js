import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routeController from './controllers/routeController.js';
import bookingController from './controllers/bookingController.js';
import routeService from './services/routeService.js';
import db from './config/database.js';

// Create Express app
const app = express();

// Request metrics for monitoring
const metrics = {
    requestCount: 0,
    errorCount: 0,
    startTime: Date.now(),
    lastRequestTime: null
};

// Metrics middleware
app.use((req, res, next) => {
    metrics.requestCount++;
    metrics.lastRequestTime = Date.now();

    res.on('finish', () => {
        if (res.statusCode >= 400) {
            metrics.errorCount++;
        }
    });

    next();
});

// CORS configuration
const corsOptions = {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Health check endpoint with monitoring metrics
app.get('/api/health', async (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
    const memoryUsage = process.memoryUsage();

    // Get database stats
    let dbStats = { bookings: 0, flights: 0 };
    try {
        const bookingCount = db.get('SELECT COUNT(*) as count FROM bookings');
        const flightCount = db.get('SELECT COUNT(*) as count FROM flights');
        dbStats = {
            bookings: bookingCount?.count || 0,
            flights: flightCount?.count || 0
        };
    } catch (e) {
        // Database not initialized yet
    }

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'air-cargo-backend',
        version: '1.0.0',
        environment: config.NODE_ENV,
        uptime: {
            seconds: uptimeSeconds,
            formatted: formatUptime(uptimeSeconds)
        },
        memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB'
        },
        database: dbStats,
        cache: routeService.getCacheStats(),
        requests: {
            total: metrics.requestCount,
            errors: metrics.errorCount,
            errorRate: metrics.requestCount > 0
                ? Math.round((metrics.errorCount / metrics.requestCount) * 100) + '%'
                : '0%'
        }
    });
});

// Helper to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

// Route endpoints
app.get('/api/routes', (req, res, next) => routeController.searchRoutes(req, res, next));
app.get('/api/routes/airports', (req, res, next) => routeController.getAirports(req, res, next));

// Booking endpoints
app.post('/api/bookings', (req, res, next) => bookingController.createBooking(req, res, next));
app.get('/api/bookings', (req, res, next) => bookingController.listBookings(req, res, next));
app.get('/api/bookings/:refId', (req, res, next) => bookingController.getBooking(req, res, next));
app.post('/api/bookings/:refId/depart', (req, res, next) => bookingController.departBooking(req, res, next));
app.post('/api/bookings/:refId/arrive', (req, res, next) => bookingController.arriveBooking(req, res, next));
app.post('/api/bookings/:refId/deliver', (req, res, next) => bookingController.deliverBooking(req, res, next));
app.post('/api/bookings/:refId/cancel', (req, res, next) => bookingController.cancelBooking(req, res, next));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

