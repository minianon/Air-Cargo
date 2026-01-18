import db from '../config/database.js';

/**
 * Timeline Repository
 * Handles database operations for booking timeline events (immutable)
 */
class TimelineRepository {
    /**
     * Add an event to the timeline
     * @param {Object} eventData - Event data
     * @returns {Object} Created event
     */
    addEvent(eventData) {
        const result = db.run(`
            INSERT INTO timeline_events (booking_ref_id, event_type, location, flight_id, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `, [
            eventData.booking_ref_id,
            eventData.event_type,
            eventData.location || null,
            eventData.flight_id || null,
            eventData.timestamp || new Date().toISOString()
        ]);

        return this.getById(result.lastInsertRowid);
    }

    /**
     * Get an event by ID
     * @param {number} id - Event ID
     * @returns {Object|null} Event object or null
     */
    getById(id) {
        return db.get('SELECT * FROM timeline_events WHERE id = ?', [id]);
    }

    /**
     * Get all events for a booking in chronological order
     * @param {string} bookingRefId - Booking reference ID
     * @returns {Object[]} Array of events ordered by timestamp
     */
    getByBookingRefId(bookingRefId) {
        return db.all(`
            SELECT te.*, f.flight_number, f.airline_name
            FROM timeline_events te
            LEFT JOIN flights f ON te.flight_id = f.flight_id
            WHERE te.booking_ref_id = ?
            ORDER BY te.timestamp ASC
        `, [bookingRefId]);
    }

    /**
     * Get latest event for a booking
     * @param {string} bookingRefId - Booking reference ID
     * @returns {Object|null} Latest event or null
     */
    getLatestEvent(bookingRefId) {
        return db.get(`
            SELECT * FROM timeline_events 
            WHERE booking_ref_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        `, [bookingRefId]);
    }

    /**
     * Check if a specific event type exists for a booking
     * @param {string} bookingRefId - Booking reference ID
     * @param {string} eventType - Event type to check
     * @returns {boolean} True if event exists
     */
    hasEvent(bookingRefId, eventType) {
        return !!db.get(`
            SELECT 1 FROM timeline_events 
            WHERE booking_ref_id = ? AND event_type = ?
        `, [bookingRefId, eventType]);
    }

    /**
     * Count events for a booking
     * @param {string} bookingRefId - Booking reference ID
     * @returns {number} Number of events
     */
    countEvents(bookingRefId) {
        const result = db.get(`
            SELECT COUNT(*) as count FROM timeline_events 
            WHERE booking_ref_id = ?
        `, [bookingRefId]);
        return result ? result.count : 0;
    }
}

export default new TimelineRepository();
