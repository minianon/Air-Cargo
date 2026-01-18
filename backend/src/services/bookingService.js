import bookingRepository from '../repositories/bookingRepository.js';
import timelineService from './timelineService.js';
import {
    BookingStatus,
    isValidTransition,
    getAllowedTransitions,
    isTerminalStatus
} from '../models/stateMachine.js';
import db from '../config/database.js';
import logger from '../middleware/logger.js';

/**
 * Booking Service
 * Handles booking business logic with state machine validation
 */
class BookingService {
    /**
     * Create a new booking
     * @param {Object} bookingData - Booking data (origin, destination, pieces, weight_kg)
     * @returns {Object} Created booking with initial timeline event
     */
    createBooking(bookingData) {
        logger.info('Creating new booking', bookingData);

        // Validate required fields
        const { origin, destination, pieces, weight_kg } = bookingData;

        if (!origin || !destination) {
            throw new Error('Origin and destination are required');
        }
        if (!pieces || pieces <= 0) {
            throw new Error('Pieces must be a positive integer');
        }
        if (!weight_kg || weight_kg <= 0) {
            throw new Error('Weight must be a positive integer');
        }

        // Use transaction for atomic creation
        const result = db.transaction(() => {
            // Create booking
            const booking = bookingRepository.create({
                origin: origin.toUpperCase(),
                destination: destination.toUpperCase(),
                pieces,
                weight_kg
            });

            // Record CREATED event in timeline
            timelineService.recordCreated(booking.ref_id, booking.origin);

            return booking;
        })();

        logger.info('Booking created', { refId: result.ref_id });
        return result;
    }

    /**
     * Get booking by reference ID with full timeline
     * @param {string} refId - Booking reference ID
     * @returns {Object} Booking with timeline
     */
    getBookingWithTimeline(refId) {
        const booking = bookingRepository.getByRefId(refId);

        if (!booking) {
            return null;
        }

        const timeline = timelineService.getTimeline(refId);

        return {
            booking,
            timeline
        };
    }

    /**
     * Mark booking as departed
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Departure data (location, flightId)
     * @returns {Object} Updated booking
     */
    departBooking(refId, { location, flightId } = {}) {
        logger.info('Departing booking', { refId, location, flightId });

        return this.transitionStatus(refId, BookingStatus.DEPARTED, () => {
            const booking = bookingRepository.getByRefId(refId);
            timelineService.recordDeparted(
                refId,
                location || booking.origin,
                flightId
            );
        });
    }

    /**
     * Mark booking as arrived
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Arrival data (location, flightId)
     * @returns {Object} Updated booking
     */
    arriveBooking(refId, { location, flightId } = {}) {
        logger.info('Arriving booking', { refId, location, flightId });

        return this.transitionStatus(refId, BookingStatus.ARRIVED, () => {
            const booking = bookingRepository.getByRefId(refId);
            timelineService.recordArrived(
                refId,
                location || booking.destination,
                flightId
            );
        });
    }

    /**
     * Mark booking as delivered
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Delivery data (location)
     * @returns {Object} Updated booking
     */
    deliverBooking(refId, { location } = {}) {
        logger.info('Delivering booking', { refId, location });

        return this.transitionStatus(refId, BookingStatus.DELIVERED, () => {
            const booking = bookingRepository.getByRefId(refId);
            timelineService.recordDelivered(
                refId,
                location || booking.destination
            );
        });
    }

    /**
     * Cancel a booking (idempotent operation)
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Cancellation data (location)
     * @returns {Object} Updated booking
     */
    cancelBooking(refId, { location } = {}) {
        logger.info('Cancelling booking', { refId });

        const booking = bookingRepository.getByRefId(refId);

        if (!booking) {
            throw new Error('Booking not found');
        }

        // Idempotent: if already cancelled, return current state
        if (booking.status === BookingStatus.CANCELLED) {
            logger.info('Booking already cancelled', { refId });
            return this.getBookingWithTimeline(refId);
        }

        // Cannot cancel after arrival
        if (booking.status === BookingStatus.ARRIVED ||
            booking.status === BookingStatus.DELIVERED) {
            throw new Error('Cannot cancel booking after arrival');
        }

        return this.transitionStatus(refId, BookingStatus.CANCELLED, () => {
            const currentBooking = bookingRepository.getByRefId(refId);
            timelineService.recordCancelled(
                refId,
                location || currentBooking.origin
            );
        });
    }

    /**
     * Transition booking to a new status with validation
     * @param {string} refId - Booking reference ID
     * @param {string} newStatus - Target status
     * @param {Function} sideEffect - Function to run on successful transition
     * @returns {Object} Updated booking with timeline
     */
    transitionStatus(refId, newStatus, sideEffect = null) {
        return db.transaction(() => {
            const booking = bookingRepository.getByRefId(refId);

            if (!booking) {
                throw new Error('Booking not found');
            }

            // Validate state transition
            if (!isValidTransition(booking.status, newStatus)) {
                const allowed = getAllowedTransitions(booking.status);
                throw new Error(
                    `Invalid state transition from ${booking.status} to ${newStatus}. ` +
                    `Allowed: ${allowed.join(', ') || 'none'}`
                );
            }

            // Update status with optimistic locking
            const updated = bookingRepository.updateStatus(refId, newStatus, booking.version);

            if (!updated) {
                throw new Error('Concurrent update detected. Please retry.');
            }

            // Run side effect (e.g., recording timeline event)
            if (sideEffect) {
                sideEffect();
            }

            logger.info('Booking status updated', {
                refId,
                from: booking.status,
                to: newStatus
            });

            // Return updated booking with timeline
            return this.getBookingWithTimeline(refId);
        })();
    }

    /**
     * List bookings with pagination
     * @param {Object} options - Query options
     * @returns {Object} Paginated bookings
     */
    listBookings(options = {}) {
        return bookingRepository.list(options);
    }
}

export default new BookingService();
