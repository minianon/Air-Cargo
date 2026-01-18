/**
 * API Service for Air Cargo Backend
 */

// Use environment variable for production, fall back to /api for dev proxy
const API_BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

/**
 * Make API request with error handling
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

/**
 * Route API
 */
export const routeApi = {
    /**
     * Search for routes
     * @param {string} origin - Origin airport code
     * @param {string} destination - Destination airport code
     * @param {string} date - Departure date (YYYY-MM-DD)
     */
    search: (origin, destination, date) => {
        return request(`/routes?origin=${origin}&destination=${destination}&date=${date}`);
    },

    /**
     * Get list of airports
     */
    getAirports: () => {
        return request('/routes/airports');
    }
};

/**
 * Booking API
 */
export const bookingApi = {
    /**
     * Create a new booking
     * @param {Object} data - Booking data
     */
    create: (data) => {
        return request('/bookings', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Get booking by reference ID
     * @param {string} refId - Booking reference ID
     */
    get: (refId) => {
        return request(`/bookings/${refId}`);
    },

    /**
     * List bookings with pagination
     * @param {Object} params - Query parameters
     */
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/bookings${query ? `?${query}` : ''}`);
    },

    /**
     * Depart a booking
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Departure data
     */
    depart: (refId, data = {}) => {
        return request(`/bookings/${refId}/depart`, {
            method: 'POST',
            body: data
        });
    },

    /**
     * Arrive a booking
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Arrival data
     */
    arrive: (refId, data = {}) => {
        return request(`/bookings/${refId}/arrive`, {
            method: 'POST',
            body: data
        });
    },

    /**
     * Deliver a booking
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Delivery data
     */
    deliver: (refId, data = {}) => {
        return request(`/bookings/${refId}/deliver`, {
            method: 'POST',
            body: data
        });
    },

    /**
     * Cancel a booking
     * @param {string} refId - Booking reference ID
     * @param {Object} data - Cancellation data
     */
    cancel: (refId, data = {}) => {
        return request(`/bookings/${refId}/cancel`, {
            method: 'POST',
            body: data
        });
    }
};

/**
 * Health check
 */
export const healthCheck = () => {
    return request('/health');
};
