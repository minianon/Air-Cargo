import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routeController from './controllers/routeController.js';
import bookingController from './controllers/bookingController.js';

// Create Express app
const app = express();

// CORS configuration
const corsOptions = {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'air-cargo-backend'
    });
});

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
