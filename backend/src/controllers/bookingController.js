import bookingService from '../services/bookingService.js';
import { isValidRefId } from '../utils/refIdGenerator.js';

/**
 * Booking Controller
 * Handles HTTP requests for booking operations
 */
class BookingController {
    /**
     * Create a new booking
     * POST /api/bookings
     */
    createBooking(req, res, next) {
        try {
            const { origin, destination, pieces, weight_kg } = req.body;

            const booking = bookingService.createBooking({
                origin,
                destination,
                pieces: parseInt(pieces, 10),
                weight_kg: parseInt(weight_kg, 10)
            });

            res.status(201).json({
                success: true,
                data: booking
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get booking by reference ID with timeline
     * GET /api/bookings/:refId
     */
    getBooking(req, res, next) {
        try {
            const { refId } = req.params;

            if (!isValidRefId(refId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid booking reference ID format'
                });
            }

            const result = bookingService.getBookingWithTimeline(refId);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * List bookings with pagination
     * GET /api/bookings?limit=20&offset=0&status=BOOKED
     */
    listBookings(req, res, next) {
        try {
            const { limit = 20, offset = 0, status } = req.query;

            const result = bookingService.listBookings({
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                status: status || null
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Depart a booking
     * POST /api/bookings/:refId/depart
     */
    departBooking(req, res, next) {
        try {
            const { refId } = req.params;
            const { location, flight_id } = req.body;

            const result = bookingService.departBooking(refId, {
                location,
                flightId: flight_id
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Arrive a booking
     * POST /api/bookings/:refId/arrive
     */
    arriveBooking(req, res, next) {
        try {
            const { refId } = req.params;
            const { location, flight_id } = req.body;

            const result = bookingService.arriveBooking(refId, {
                location,
                flightId: flight_id
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deliver a booking
     * POST /api/bookings/:refId/deliver
     */
    deliverBooking(req, res, next) {
        try {
            const { refId } = req.params;
            const { location } = req.body;

            const result = bookingService.deliverBooking(refId, { location });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel a booking
     * POST /api/bookings/:refId/cancel
     */
    cancelBooking(req, res, next) {
        try {
            const { refId } = req.params;
            const { location } = req.body;

            const result = bookingService.cancelBooking(refId, { location });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new BookingController();
