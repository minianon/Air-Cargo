import db, { initDb } from '../config/database.js';

/**
 * Flight Repository
 * Handles database operations for flights
 */
class FlightRepository {
    /**
     * Get a flight by ID
     * @param {string} flightId - Flight ID
     * @returns {Object|null} Flight object or null
     */
    getById(flightId) {
        return db.get('SELECT * FROM flights WHERE flight_id = ?', [flightId]);
    }

    /**
     * Find direct flights between origin and destination on a specific date
     * @param {string} origin - Origin airport code
     * @param {string} destination - Destination airport code
     * @param {string} date - Departure date (YYYY-MM-DD)
     * @returns {Object[]} Array of direct flights
     */
    findDirectFlights(origin, destination, date) {
        return db.all(`
            SELECT * FROM flights 
            WHERE origin = ? 
            AND destination = ? 
            AND date(departure_datetime) = date(?)
            ORDER BY departure_datetime
        `, [origin, destination, date]);
    }

    /**
     * Find flights departing from an origin on a specific date
     * @param {string} origin - Origin airport code
     * @param {string} date - Departure date (YYYY-MM-DD)
     * @returns {Object[]} Array of flights
     */
    findFlightsFromOrigin(origin, date) {
        return db.all(`
            SELECT * FROM flights 
            WHERE origin = ? 
            AND date(departure_datetime) = date(?)
            ORDER BY departure_datetime
        `, [origin, date]);
    }

    /**
     * Find connecting flights for transit routes
     * Second hop must be on same day or next day of first flight arrival
     * @param {string} origin - Intermediate airport (destination of first hop)
     * @param {string} destination - Final destination
     * @param {string} arrivalDatetime - Arrival time of first hop
     * @param {string} nextDayEnd - End of next day (YYYY-MM-DD 23:59:59)
     * @returns {Object[]} Array of connecting flights
     */
    findConnectingFlights(origin, destination, arrivalDatetime, nextDayEnd) {
        return db.all(`
            SELECT * FROM flights 
            WHERE origin = ? 
            AND destination = ?
            AND departure_datetime > ?
            AND departure_datetime <= ?
            ORDER BY departure_datetime
        `, [origin, destination, arrivalDatetime, nextDayEnd]);
    }

    /**
     * Get all unique airport codes
     * @returns {string[]} Array of unique airport codes
     */
    getAirports() {
        const origins = db.all('SELECT DISTINCT origin FROM flights');
        const destinations = db.all('SELECT DISTINCT destination FROM flights');
        const codes = new Set([
            ...origins.map(r => r.origin),
            ...destinations.map(r => r.destination)
        ]);
        return [...codes].sort();
    }

    /**
     * Insert a new flight
     * @param {Object} flight - Flight data
     */
    insert(flight) {
        db.run(`
            INSERT INTO flights (flight_id, flight_number, airline_name, 
                departure_datetime, arrival_datetime, origin, destination)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            flight.flight_id,
            flight.flight_number,
            flight.airline_name,
            flight.departure_datetime,
            flight.arrival_datetime,
            flight.origin,
            flight.destination
        ]);
    }

    /**
     * Bulk insert flights (for seeding)
     * @param {Object[]} flights - Array of flight data
     */
    bulkInsert(flights) {
        const insertMany = db.transaction((flights) => {
            for (const flight of flights) {
                db.run(`
                    INSERT INTO flights (flight_id, flight_number, airline_name, 
                        departure_datetime, arrival_datetime, origin, destination)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    flight.flight_id,
                    flight.flight_number,
                    flight.airline_name,
                    flight.departure_datetime,
                    flight.arrival_datetime,
                    flight.origin,
                    flight.destination
                ]);
            }
        });

        insertMany(flights);
    }

    /**
     * Get total flight count
     * @returns {number} Total number of flights
     */
    count() {
        const result = db.get('SELECT COUNT(*) as count FROM flights');
        return result ? result.count : 0;
    }
}

export default new FlightRepository();
