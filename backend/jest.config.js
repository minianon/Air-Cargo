export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'mjs'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/config/migrate.js'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
