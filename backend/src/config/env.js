/**
 * Environment Configuration
 * 
 * This file loads and exports all environment variables.
 * Copy .env.example to .env and configure your values.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from backend root
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Environment variables configuration
 * All environment variables should be accessed through this object
 */
const config = {
    // Server Configuration
    PORT: process.env.PORT || 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // CORS Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

    // Database Configuration
    DB_PATH: process.env.DB_PATH || join(__dirname, '../../data/cargo.db'),

    // Logging Configuration
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Helper to check if running in production
    isProduction: () => config.NODE_ENV === 'production',
    isDevelopment: () => config.NODE_ENV === 'development',
};

export default config;
