import db, { runTransaction, initDb } from '../config/database.js';
import { generateRefId } from '../utils/refIdGenerator.js';

/**
 * Booking Repository
 * Handles database operations for bookings with optimistic locking
 */
class BookingRepository {
    /**
     * Create a new booking
     * @param {Object} bookingData - Booking data
     * @returns {Object} Created booking
     */
    create(bookingData) {
        const refId = generateRefId();
        const now = new Date().toISOString();

        db.run(`
            INSERT INTO bookings (ref_id, origin, destination, pieces, weight_kg, 
                status, created_at, updated_at, version)
            VALUES (?, ?, ?, ?, ?, 'BOOKED', ?, ?, 1)
        `, [
            refId,
            bookingData.origin,
            bookingData.destination,
            bookingData.pieces,
            bookingData.weight_kg,
            now,
            now
        ]);

        return this.getByRefId(refId);
    }

    /**
     * Get a booking by reference ID
     * @param {string} refId - Booking reference ID
     * @returns {Object|null} Booking object or null
     */
    getByRefId(refId) {
        return db.get('SELECT * FROM bookings WHERE ref_id = ?', [refId]);
    }

    /**
     * Update booking status with optimistic locking
     * @param {string} refId - Booking reference ID
     * @param {string} newStatus - New status
     * @param {number} expectedVersion - Expected version for optimistic lock
     * @returns {Object|null} Updated booking or null if version mismatch
     */
    updateStatus(refId, newStatus, expectedVersion) {
        const now = new Date().toISOString();

        const result = db.run(`
            UPDATE bookings 
            SET status = ?, updated_at = ?, version = version + 1
            WHERE ref_id = ? AND version = ?
        `, [newStatus, now, refId, expectedVersion]);

        if (result.changes === 0) {
            return null; // Version mismatch - concurrent update detected
        }

        return this.getByRefId(refId);
    }

    /**
     * Update booking status within a transaction (for atomic operations)
     * @param {string} refId - Booking reference ID
     * @param {string} newStatus - New status
     * @returns {Object} Result with success flag and booking/error
     */
    updateStatusAtomic(refId, newStatus) {
        return runTransaction(() => {
            const booking = this.getByRefId(refId);
            if (!booking) {
                return { success: false, error: 'Booking not found' };
            }

            const updated = this.updateStatus(refId, newStatus, booking.version);
            if (!updated) {
                return { success: false, error: 'Concurrent update detected' };
            }

            return { success: true, booking: updated };
        });
    }

    /**
     * List bookings with pagination
     * @param {Object} options - Query options
     * @returns {Object} Paginated results
     */
    list({ limit = 20, offset = 0, status = null } = {}) {
        let query = 'SELECT * FROM bookings';
        const params = [];

        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const bookings = db.all(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM bookings';
        const countParams = [];
        if (status) {
            countQuery += ' WHERE status = ?';
            countParams.push(status);
        }
        const countResult = db.get(countQuery, countParams);
        const total = countResult ? countResult.count : 0;

        return {
            bookings,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + bookings.length < total
            }
        };
    }

    /**
     * Get total booking count
     * @returns {number} Total number of bookings
     */
    count() {
        const result = db.get('SELECT COUNT(*) as count FROM bookings');
        return result ? result.count : 0;
    }

    /**
     * Check if ref_id exists
     * @param {string} refId - Reference ID to check
     * @returns {boolean} True if exists
     */
    exists(refId) {
        return !!db.get('SELECT 1 FROM bookings WHERE ref_id = ?', [refId]);
    }
}

export default new BookingRepository();
