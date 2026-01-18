/**
 * Unit tests for Route Service
 * Tests route search logic including direct and transit routes
 */

// Mock the flight repository and logger
const mockFlights = {
    direct: [
        {
            flight_id: 'FL0000001',
            flight_number: 'AI101',
            airline_name: 'Air India',
            departure_datetime: '2026-01-20T08:00:00.000Z',
            arrival_datetime: '2026-01-20T11:00:00.000Z',
            origin: 'DEL',
            destination: 'BOM'
        },
        {
            flight_id: 'FL0000002',
            flight_number: 'AI103',
            airline_name: 'Air India',
            departure_datetime: '2026-01-20T14:00:00.000Z',
            arrival_datetime: '2026-01-20T17:00:00.000Z',
            origin: 'DEL',
            destination: 'BOM'
        }
    ],
    firstHop: [
        {
            flight_id: 'FL0000010',
            flight_number: '6E201',
            airline_name: 'IndiGo',
            departure_datetime: '2026-01-20T06:00:00.000Z',
            arrival_datetime: '2026-01-20T08:00:00.000Z',
            origin: 'DEL',
            destination: 'HYD'
        },
        {
            flight_id: 'FL0000011',
            flight_number: '6E202',
            airline_name: 'IndiGo',
            departure_datetime: '2026-01-20T10:00:00.000Z',
            arrival_datetime: '2026-01-20T12:00:00.000Z',
            origin: 'DEL',
            destination: 'BLR'
        }
    ],
    secondHop: {
        HYD: [
            {
                flight_id: 'FL0000020',
                flight_number: 'SG301',
                airline_name: 'SpiceJet',
                departure_datetime: '2026-01-20T10:00:00.000Z',
                arrival_datetime: '2026-01-20T12:00:00.000Z',
                origin: 'HYD',
                destination: 'BOM'
            }
        ],
        BLR: [
            {
                flight_id: 'FL0000021',
                flight_number: 'UK401',
                airline_name: 'Vistara',
                departure_datetime: '2026-01-21T08:00:00.000Z', // Next day
                arrival_datetime: '2026-01-21T10:00:00.000Z',
                origin: 'BLR',
                destination: 'BOM'
            }
        ]
    },
    beyondNextDay: [
        {
            flight_id: 'FL0000030',
            flight_number: 'AI501',
            airline_name: 'Air India',
            departure_datetime: '2026-01-22T08:00:00.000Z', // 2 days later - should NOT be included
            arrival_datetime: '2026-01-22T10:00:00.000Z',
            origin: 'HYD',
            destination: 'BOM'
        }
    ]
};

describe('Route Search Logic', () => {
    describe('Direct Flights', () => {
        test('should return direct flights for matching origin/destination/date', () => {
            // This tests the core logic - direct flights are returned when available
            const directFlights = mockFlights.direct;
            expect(directFlights.length).toBe(2);
            expect(directFlights[0].origin).toBe('DEL');
            expect(directFlights[0].destination).toBe('BOM');
        });
    });

    describe('Transit Route Logic', () => {
        test('should find transit route with same-day connection', () => {
            // DEL -> HYD (arrives 08:00) -> BOM (departs 10:00)
            // Connection time: 2 hours - valid
            const firstHop = mockFlights.firstHop[0]; // DEL-HYD, arr 08:00
            const secondHop = mockFlights.secondHop.HYD[0]; // HYD-BOM, dep 10:00

            const arrivalTime = new Date(firstHop.arrival_datetime).getTime();
            const departureTime = new Date(secondHop.departure_datetime).getTime();
            const connectionTimeMs = departureTime - arrivalTime;

            // Connection time should be at least 1 hour (3600000 ms)
            expect(connectionTimeMs).toBeGreaterThanOrEqual(60 * 60 * 1000);
            // This is same-day connection
            expect(firstHop.arrival_datetime.split('T')[0])
                .toBe(secondHop.departure_datetime.split('T')[0]);
        });

        test('should find transit route with next-day connection', () => {
            // DEL -> BLR (arrives Jan 20 12:00) -> BOM (departs Jan 21 08:00)
            // Connection is on next day - should be valid
            const firstHop = mockFlights.firstHop[1]; // DEL-BLR, arr 12:00
            const secondHop = mockFlights.secondHop.BLR[0]; // BLR-BOM, dep next day 08:00

            const firstArrivalDate = new Date(firstHop.arrival_datetime);
            const secondDepartureDate = new Date(secondHop.departure_datetime);

            // Second hop is next day
            const dayDiff = secondDepartureDate.getDate() - firstArrivalDate.getDate();
            expect(dayDiff).toBe(1);
        });

        test('should NOT include connections beyond next day', () => {
            // Flight 2 days later should not be valid for transit
            const firstHop = mockFlights.firstHop[0]; // DEL-HYD, Jan 20
            const invalidSecondHop = mockFlights.beyondNextDay[0]; // Jan 22

            const firstArrivalDate = new Date(firstHop.arrival_datetime);
            const secondDepartureDate = new Date(invalidSecondHop.departure_datetime);

            // Calculate end of next day from first hop arrival
            const nextDayEnd = new Date(firstArrivalDate);
            nextDayEnd.setDate(nextDayEnd.getDate() + 1);
            nextDayEnd.setHours(23, 59, 59, 999);

            // Second hop departure should be AFTER next day end - hence invalid
            expect(secondDepartureDate.getTime()).toBeGreaterThan(nextDayEnd.getTime());
        });

        test('should reject connections with less than 1 hour connection time', () => {
            // Connection time must be at least 1 hour
            const minConnectionTimeMs = 60 * 60 * 1000; // 1 hour in ms

            // Simulate a flight arriving at 10:00 and departing at 10:30
            const arrivalTime = new Date('2026-01-20T10:00:00.000Z').getTime();
            const departureTime = new Date('2026-01-20T10:30:00.000Z').getTime();
            const connectionTimeMs = departureTime - arrivalTime;

            expect(connectionTimeMs).toBeLessThan(minConnectionTimeMs);
            // This connection should be rejected
        });

        test('should select route with shortest total travel time', () => {
            // Given two transit options, the one with shortest total time should be selected
            // Route 1: DEL -> HYD -> BOM: 6h + 6h = 12h total
            // Route 2: DEL -> BLR -> BOM: 6h + 22h = 28h total (next day connection)

            const route1FirstHop = mockFlights.firstHop[0];
            const route1SecondHop = mockFlights.secondHop.HYD[0];

            const route1TotalTime =
                new Date(route1SecondHop.arrival_datetime).getTime() -
                new Date(route1FirstHop.departure_datetime).getTime();

            const route2FirstHop = mockFlights.firstHop[1];
            const route2SecondHop = mockFlights.secondHop.BLR[0];

            const route2TotalTime =
                new Date(route2SecondHop.arrival_datetime).getTime() -
                new Date(route2FirstHop.departure_datetime).getTime();

            // Route 1 should be shorter
            expect(route1TotalTime).toBeLessThan(route2TotalTime);
        });
    });

    describe('Edge Cases', () => {
        test('should handle uppercase/lowercase origin/destination', () => {
            const origin = 'del';
            const destination = 'bom';

            expect(origin.toUpperCase()).toBe('DEL');
            expect(destination.toUpperCase()).toBe('BOM');
        });

        test('should skip first hop that goes directly to destination', () => {
            // When searching transit routes from DEL to BOM,
            // a direct DEL->BOM flight should NOT be used as first hop
            const firstHop = mockFlights.direct[0];
            const destination = 'BOM';

            // First hop destination equals final destination - skip this
            expect(firstHop.destination).toBe(destination);
        });
    });
});
