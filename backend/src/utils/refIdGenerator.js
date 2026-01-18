/**
 * Generate human-friendly reference IDs for bookings
 * Format: ACB-XXXXXX (Air Cargo Booking - 6 alphanumeric characters)
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1

/**
 * Generate a random alphanumeric string
 * @param {number} length - Length of the string
 * @returns {string} Random alphanumeric string
 */
function randomString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return result;
}

/**
 * Generate a unique booking reference ID
 * @returns {string} Booking reference ID in format ACB-XXXXXX
 */
export function generateRefId() {
    return `ACB-${randomString(6)}`;
}

/**
 * Validate a booking reference ID format
 * @param {string} refId - Reference ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidRefId(refId) {
    return /^ACB-[A-Z2-9]{6}$/.test(refId);
}
