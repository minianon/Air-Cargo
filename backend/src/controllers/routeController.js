import routeService from '../services/routeService.js';

/**
 * Route Controller
 * Handles HTTP requests for flight route operations
 */
class RouteController {
    /**
     * Search for routes
     * GET /api/routes?origin=XXX&destination=YYY&date=YYYY-MM-DD
     */
    searchRoutes(req, res, next) {
        try {
            const { origin, destination, date } = req.query;

            if (!origin || !destination || !date) {
                return res.status(400).json({
                    success: false,
                    error: 'Origin, destination, and date are required query parameters'
                });
            }

            const routes = routeService.findRoutes(origin, destination, date);

            res.json({
                success: true,
                data: routes
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get list of available airports
     * GET /api/routes/airports
     */
    getAirports(req, res, next) {
        try {
            const airports = routeService.getAirports();

            res.json({
                success: true,
                data: airports
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new RouteController();
