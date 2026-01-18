import flightRepository from '../repositories/flightRepository.js';
import logger from '../middleware/logger.js';

/**
 * Simple LRU Cache with TTL
 */
class SimpleCache {
    constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.hits = 0;
        this.misses = 0;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            return null;
        }
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        this.hits++;
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value) {
        // Evict oldest if at max size
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs
        });
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0
        };
    }
}

// Route cache instance (5 minute TTL, max 100 entries)
const routeCache = new SimpleCache(100, 5 * 60 * 1000);
// Airport cache (30 minute TTL, airports rarely change)
const airportCache = new SimpleCache(1, 30 * 60 * 1000);

/**
 * Route Service
 * Handles route search logic including direct and 1-transit routes
 * Includes caching for performance optimization
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
        // Validate inputs
        if (!origin || !destination || !departureDate) {
            throw new Error('Origin, destination, and departure date are required');
        }

        const normalizedOrigin = origin.toUpperCase();
        const normalizedDest = destination.toUpperCase();

        // Check cache first
        const cacheKey = `${normalizedOrigin}-${normalizedDest}-${departureDate}`;
        const cached = routeCache.get(cacheKey);

        if (cached) {
            logger.debug('Route cache hit', { cacheKey });
            return cached;
        }

        logger.info('Searching routes', { origin: normalizedOrigin, destination: normalizedDest, departureDate });

        // Find direct flights
        const directFlights = flightRepository.findDirectFlights(
            normalizedOrigin,
            normalizedDest,
            departureDate
        );

        // Find 1-transit routes
        const transitRoute = this.findBestTransitRoute(
            normalizedOrigin,
            normalizedDest,
            departureDate
        );

        const result = {
            origin: normalizedOrigin,
            destination: normalizedDest,
            departureDate,
            directFlights,
            transitRoute
        };

        // Cache the result
        routeCache.set(cacheKey, result);

        logger.info('Routes found', {
            directCount: directFlights.length,
            hasTransit: !!transitRoute
        });

        return result;
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
     * Get list of available airports (cached)
     * @returns {string[]} Array of airport codes
     */
    getAirports() {
        const cached = airportCache.get('airports');
        if (cached) {
            return cached;
        }

        const airports = flightRepository.getAirports();
        airportCache.set('airports', airports);
        return airports;
    }

    /**
     * Get cache statistics for monitoring
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            routeCache: routeCache.getStats(),
            airportCache: airportCache.getStats()
        };
    }

    /**
     * Clear all caches
     */
    clearCache() {
        routeCache.clear();
        airportCache.clear();
        logger.info('Route caches cleared');
    }
}

export default new RouteService();

