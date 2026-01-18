import db from './database.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, '../../migrations');

console.log('Running migrations...');

// Read all migration files
const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

for (const file of migrationFiles) {
    console.log(`Applying migration: ${file}`);
    const sql = fs.readFileSync(join(migrationsDir, file), 'utf-8');
    db.exec(sql);
}

console.log('Migrations completed successfully!');
process.exit(0);
