/**
 * Booking State Machine
 * 
 * Valid states: BOOKED, DEPARTED, ARRIVED, DELIVERED, CANCELLED
 * 
 * State transitions:
 * BOOKED → DEPARTED, CANCELLED
 * DEPARTED → ARRIVED, CANCELLED
 * ARRIVED → DELIVERED (cannot cancel after arrival)
 * DELIVERED → (terminal state)
 * CANCELLED → (terminal state)
 */

export const BookingStatus = {
    BOOKED: 'BOOKED',
    DEPARTED: 'DEPARTED',
    ARRIVED: 'ARRIVED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED'
};

export const EventType = {
    CREATED: 'CREATED',
    DEPARTED: 'DEPARTED',
    ARRIVED: 'ARRIVED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED'
};

// Define valid state transitions
const validTransitions = {
    [BookingStatus.BOOKED]: [BookingStatus.DEPARTED, BookingStatus.CANCELLED],
    [BookingStatus.DEPARTED]: [BookingStatus.ARRIVED, BookingStatus.CANCELLED],
    [BookingStatus.ARRIVED]: [BookingStatus.DELIVERED],
    [BookingStatus.DELIVERED]: [], // Terminal state
    [BookingStatus.CANCELLED]: []  // Terminal state
};

/**
 * Check if a state transition is valid
 * @param {string} currentStatus - Current booking status
 * @param {string} newStatus - Target status
 * @returns {boolean} True if transition is valid
 */
export function isValidTransition(currentStatus, newStatus) {
    const allowed = validTransitions[currentStatus];
    if (!allowed) {
        return false;
    }
    return allowed.includes(newStatus);
}

/**
 * Get allowed transitions from a given status
 * @param {string} currentStatus - Current booking status
 * @returns {string[]} Array of allowed target statuses
 */
export function getAllowedTransitions(currentStatus) {
    return validTransitions[currentStatus] || [];
}

/**
 * Check if a status is terminal (no further transitions allowed)
 * @param {string} status - Status to check
 * @returns {boolean} True if terminal
 */
export function isTerminalStatus(status) {
    const transitions = validTransitions[status];
    return transitions && transitions.length === 0;
}

/**
 * Get event type for a status transition
 * @param {string} newStatus - New status
 * @returns {string} Corresponding event type
 */
export function getEventTypeForStatus(newStatus) {
    return newStatus; // Event types match status names
}
