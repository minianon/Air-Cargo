/**
 * Unit tests for Booking State Machine
 */

import {
    BookingStatus,
    EventType,
    isValidTransition,
    getAllowedTransitions,
    isTerminalStatus,
    getEventTypeForStatus
} from '../src/models/stateMachine.js';

describe('BookingStatus', () => {
    test('should have all expected statuses', () => {
        expect(BookingStatus.BOOKED).toBe('BOOKED');
        expect(BookingStatus.DEPARTED).toBe('DEPARTED');
        expect(BookingStatus.ARRIVED).toBe('ARRIVED');
        expect(BookingStatus.DELIVERED).toBe('DELIVERED');
        expect(BookingStatus.CANCELLED).toBe('CANCELLED');
    });
});

describe('EventType', () => {
    test('should have all expected event types', () => {
        expect(EventType.CREATED).toBe('CREATED');
        expect(EventType.DEPARTED).toBe('DEPARTED');
        expect(EventType.ARRIVED).toBe('ARRIVED');
        expect(EventType.DELIVERED).toBe('DELIVERED');
        expect(EventType.CANCELLED).toBe('CANCELLED');
    });
});

describe('isValidTransition', () => {
    describe('from BOOKED status', () => {
        test('should allow transition to DEPARTED', () => {
            expect(isValidTransition(BookingStatus.BOOKED, BookingStatus.DEPARTED)).toBe(true);
        });

        test('should allow transition to CANCELLED', () => {
            expect(isValidTransition(BookingStatus.BOOKED, BookingStatus.CANCELLED)).toBe(true);
        });

        test('should NOT allow transition to ARRIVED', () => {
            expect(isValidTransition(BookingStatus.BOOKED, BookingStatus.ARRIVED)).toBe(false);
        });

        test('should NOT allow transition to DELIVERED', () => {
            expect(isValidTransition(BookingStatus.BOOKED, BookingStatus.DELIVERED)).toBe(false);
        });
    });

    describe('from DEPARTED status', () => {
        test('should allow transition to ARRIVED', () => {
            expect(isValidTransition(BookingStatus.DEPARTED, BookingStatus.ARRIVED)).toBe(true);
        });

        test('should allow transition to CANCELLED', () => {
            expect(isValidTransition(BookingStatus.DEPARTED, BookingStatus.CANCELLED)).toBe(true);
        });

        test('should NOT allow transition to BOOKED', () => {
            expect(isValidTransition(BookingStatus.DEPARTED, BookingStatus.BOOKED)).toBe(false);
        });

        test('should NOT allow transition to DELIVERED', () => {
            expect(isValidTransition(BookingStatus.DEPARTED, BookingStatus.DELIVERED)).toBe(false);
        });
    });

    describe('from ARRIVED status', () => {
        test('should allow transition to DELIVERED', () => {
            expect(isValidTransition(BookingStatus.ARRIVED, BookingStatus.DELIVERED)).toBe(true);
        });

        test('should NOT allow transition to CANCELLED (critical requirement)', () => {
            expect(isValidTransition(BookingStatus.ARRIVED, BookingStatus.CANCELLED)).toBe(false);
        });

        test('should NOT allow transition to BOOKED', () => {
            expect(isValidTransition(BookingStatus.ARRIVED, BookingStatus.BOOKED)).toBe(false);
        });

        test('should NOT allow transition to DEPARTED', () => {
            expect(isValidTransition(BookingStatus.ARRIVED, BookingStatus.DEPARTED)).toBe(false);
        });
    });

    describe('from DELIVERED status (terminal)', () => {
        test('should NOT allow any transitions', () => {
            expect(isValidTransition(BookingStatus.DELIVERED, BookingStatus.BOOKED)).toBe(false);
            expect(isValidTransition(BookingStatus.DELIVERED, BookingStatus.DEPARTED)).toBe(false);
            expect(isValidTransition(BookingStatus.DELIVERED, BookingStatus.ARRIVED)).toBe(false);
            expect(isValidTransition(BookingStatus.DELIVERED, BookingStatus.CANCELLED)).toBe(false);
        });
    });

    describe('from CANCELLED status (terminal)', () => {
        test('should NOT allow any transitions', () => {
            expect(isValidTransition(BookingStatus.CANCELLED, BookingStatus.BOOKED)).toBe(false);
            expect(isValidTransition(BookingStatus.CANCELLED, BookingStatus.DEPARTED)).toBe(false);
            expect(isValidTransition(BookingStatus.CANCELLED, BookingStatus.ARRIVED)).toBe(false);
            expect(isValidTransition(BookingStatus.CANCELLED, BookingStatus.DELIVERED)).toBe(false);
        });
    });

    describe('invalid status handling', () => {
        test('should return false for unknown current status', () => {
            expect(isValidTransition('UNKNOWN', BookingStatus.DEPARTED)).toBe(false);
        });
    });
});

describe('getAllowedTransitions', () => {
    test('should return correct transitions from BOOKED', () => {
        const allowed = getAllowedTransitions(BookingStatus.BOOKED);
        expect(allowed).toContain(BookingStatus.DEPARTED);
        expect(allowed).toContain(BookingStatus.CANCELLED);
        expect(allowed.length).toBe(2);
    });

    test('should return correct transitions from DEPARTED', () => {
        const allowed = getAllowedTransitions(BookingStatus.DEPARTED);
        expect(allowed).toContain(BookingStatus.ARRIVED);
        expect(allowed).toContain(BookingStatus.CANCELLED);
        expect(allowed.length).toBe(2);
    });

    test('should return correct transitions from ARRIVED', () => {
        const allowed = getAllowedTransitions(BookingStatus.ARRIVED);
        expect(allowed).toContain(BookingStatus.DELIVERED);
        expect(allowed.length).toBe(1);
    });

    test('should return empty array for DELIVERED', () => {
        const allowed = getAllowedTransitions(BookingStatus.DELIVERED);
        expect(allowed).toEqual([]);
    });

    test('should return empty array for CANCELLED', () => {
        const allowed = getAllowedTransitions(BookingStatus.CANCELLED);
        expect(allowed).toEqual([]);
    });
});

describe('isTerminalStatus', () => {
    test('should return true for DELIVERED', () => {
        expect(isTerminalStatus(BookingStatus.DELIVERED)).toBe(true);
    });

    test('should return true for CANCELLED', () => {
        expect(isTerminalStatus(BookingStatus.CANCELLED)).toBe(true);
    });

    test('should return false for BOOKED', () => {
        expect(isTerminalStatus(BookingStatus.BOOKED)).toBe(false);
    });

    test('should return false for DEPARTED', () => {
        expect(isTerminalStatus(BookingStatus.DEPARTED)).toBe(false);
    });

    test('should return false for ARRIVED', () => {
        expect(isTerminalStatus(BookingStatus.ARRIVED)).toBe(false);
    });
});

describe('getEventTypeForStatus', () => {
    test('should return matching event type for each status', () => {
        expect(getEventTypeForStatus(BookingStatus.DEPARTED)).toBe(EventType.DEPARTED);
        expect(getEventTypeForStatus(BookingStatus.ARRIVED)).toBe(EventType.ARRIVED);
        expect(getEventTypeForStatus(BookingStatus.DELIVERED)).toBe(EventType.DELIVERED);
        expect(getEventTypeForStatus(BookingStatus.CANCELLED)).toBe(EventType.CANCELLED);
    });
});
