import timelineRepository from '../repositories/timelineRepository.js';
import { EventType } from '../models/stateMachine.js';
import logger from '../middleware/logger.js';

/**
 * Timeline Service
 * Handles timeline event creation and retrieval
 */
class TimelineService {
    /**
     * Record a booking creation event
     * @param {string} bookingRefId - Booking reference ID
     * @param {string} location - Origin location
     * @returns {Object} Created event
     */
    recordCreated(bookingRefId, location) {
        logger.info('Recording CREATED event', { bookingRefId, location });

        return timelineRepository.addEvent({
            booking_ref_id: bookingRefId,
            event_type: EventType.CREATED,
            location,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Record a departure event
     * @param {string} bookingRefId - Booking reference ID
     * @param {string} location - Departure location
     * @param {string} flightId - Optional flight ID
     * @returns {Object} Created event
     */
    recordDeparted(bookingRefId, location, flightId = null) {
        logger.info('Recording DEPARTED event', { bookingRefId, location, flightId });

        return timelineRepository.addEvent({
            booking_ref_id: bookingRefId,
            event_type: EventType.DEPARTED,
            location,
            flight_id: flightId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Record an arrival event
     * @param {string} bookingRefId - Booking reference ID
     * @param {string} location - Arrival location
     * @param {string} flightId - Optional flight ID
     * @returns {Object} Created event
     */
    recordArrived(bookingRefId, location, flightId = null) {
        logger.info('Recording ARRIVED event', { bookingRefId, location, flightId });

        return timelineRepository.addEvent({
            booking_ref_id: bookingRefId,
            event_type: EventType.ARRIVED,
            location,
            flight_id: flightId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Record a delivery event
     * @param {string} bookingRefId - Booking reference ID
     * @param {string} location - Delivery location
     * @returns {Object} Created event
     */
    recordDelivered(bookingRefId, location) {
        logger.info('Recording DELIVERED event', { bookingRefId, location });

        return timelineRepository.addEvent({
            booking_ref_id: bookingRefId,
            event_type: EventType.DELIVERED,
            location,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Record a cancellation event
     * @param {string} bookingRefId - Booking reference ID
     * @param {string} location - Current location
     * @returns {Object} Created event
     */
    recordCancelled(bookingRefId, location) {
        logger.info('Recording CANCELLED event', { bookingRefId, location });

        return timelineRepository.addEvent({
            booking_ref_id: bookingRefId,
            event_type: EventType.CANCELLED,
            location,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get full timeline for a booking
     * @param {string} bookingRefId - Booking reference ID
     * @returns {Object[]} Array of timeline events in chronological order
     */
    getTimeline(bookingRefId) {
        return timelineRepository.getByBookingRefId(bookingRefId);
    }

    /**
     * Get latest event for a booking
     * @param {string} bookingRefId - Booking reference ID
     * @returns {Object|null} Latest event
     */
    getLatestEvent(bookingRefId) {
        return timelineRepository.getLatestEvent(bookingRefId);
    }
}

export default new TimelineService();
