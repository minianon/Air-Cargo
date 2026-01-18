import flightRepository from '../repositories/flightRepository.js';
import logger from '../middleware/logger.js';

/**
 * Route Service
 * Handles route search logic including direct and 1-transit routes
 */
class RouteService {
    /**
     * Find routes between origin and destination
     * @param {string} origin - Origin airport code
     * @param {string} destination - Destination airport code
     * @param {string} departureDate - Departure date (YYYY-MM-DD)
     * @returns {Object} Routes result with direct and transit options
     */
    findRoutes(origin, destination, departureDate) {
        logger.info('Searching routes', { origin, destination, departureDate });

        // Validate inputs
        if (!origin || !destination || !departureDate) {
            throw new Error('Origin, destination, and departure date are required');
        }

        // Find direct flights
        const directFlights = flightRepository.findDirectFlights(
            origin.toUpperCase(),
            destination.toUpperCase(),
            departureDate
        );

        // Find 1-transit routes
        const transitRoute = this.findBestTransitRoute(
            origin.toUpperCase(),
            destination.toUpperCase(),
            departureDate
        );

        logger.info('Routes found', {
            directCount: directFlights.length,
            hasTransit: !!transitRoute
        });

        return {
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departureDate,
            directFlights,
            transitRoute
        };
    }

    /**
     * Find the best 1-transit route
     * Second hop must be on same day or next day of first flight arrival
     * @param {string} origin - Origin airport code
     * @param {string} destination - Final destination code
     * @param {string} departureDate - Departure date (YYYY-MM-DD)
     * @returns {Object|null} Best transit route or null
     */
    findBestTransitRoute(origin, destination, departureDate) {
        // Get all first-hop flights from origin on departure date
        const firstHopFlights = flightRepository.findFlightsFromOrigin(origin, departureDate);

        let bestRoute = null;
        let shortestTotalTime = Infinity;

        for (const firstHop of firstHopFlights) {
            // Skip if first hop goes directly to destination
            if (firstHop.destination === destination) {
                continue;
            }

            const intermediateAirport = firstHop.destination;
            const arrivalDatetime = firstHop.arrival_datetime;

            // Calculate end of next day (transit rule: same day or next day only)
            const arrivalDate = new Date(arrivalDatetime);
            const nextDayEnd = new Date(arrivalDate);
            nextDayEnd.setDate(nextDayEnd.getDate() + 1);
            nextDayEnd.setHours(23, 59, 59, 999);
            const nextDayEndStr = nextDayEnd.toISOString();

            // Find connecting flights from intermediate to destination
            const connectingFlights = flightRepository.findConnectingFlights(
                intermediateAirport,
                destination,
                arrivalDatetime,
                nextDayEndStr
            );

            for (const secondHop of connectingFlights) {
                // Calculate minimum connection time (at least 1 hour)
                const arrivalTime = new Date(arrivalDatetime).getTime();
                const departureTime = new Date(secondHop.departure_datetime).getTime();
                const connectionTimeMs = departureTime - arrivalTime;

                if (connectionTimeMs < 60 * 60 * 1000) {
                    continue; // Skip if less than 1 hour connection
                }

                // Calculate total travel time
                const firstDeparture = new Date(firstHop.departure_datetime).getTime();
                const finalArrival = new Date(secondHop.arrival_datetime).getTime();
                const totalTime = finalArrival - firstDeparture;

                if (totalTime < shortestTotalTime) {
                    shortestTotalTime = totalTime;
                    bestRoute = {
                        type: 'transit',
                        firstHop: {
                            ...firstHop,
                            leg: 1
                        },
                        secondHop: {
                            ...secondHop,
                            leg: 2
                        },
                        intermediate: intermediateAirport,
                        connectionTimeMinutes: Math.round(connectionTimeMs / (60 * 1000)),
                        totalTravelTimeMinutes: Math.round(totalTime / (60 * 1000))
                    };
                }
            }
        }

        return bestRoute;
    }

    /**
     * Get list of available airports
     * @returns {string[]} Array of airport codes
     */
    getAirports() {
        return flightRepository.getAirports();
    }
}

export default new RouteService();
