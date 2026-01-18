import config from './config/env.js';
import app from './app.js';
import { initDb } from './config/database.js';
import logger from './middleware/logger.js';

const PORT = config.PORT;

// Initialize database before starting server
async function start() {
    try {
        logger.info('Initializing database...');
        await initDb();
        logger.info('Database initialized successfully');

        app.listen(PORT, () => {
            logger.info(`Air Cargo Backend server running on port ${PORT}`);
            logger.info(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
