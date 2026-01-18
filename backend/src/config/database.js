import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import config from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path from config
const DB_PATH = config.DB_PATH;

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Database wrapper class for sql.js
class Database {
    constructor() {
        this.db = null;
        this.dbPath = DB_PATH;
        this.initPromise = null;
        this.inTransaction = false;
    }

    async init() {
        if (this.db) return this.db;

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            const SQL = await initSqlJs();

            // Load existing database or create new
            if (fs.existsSync(this.dbPath)) {
                const buffer = fs.readFileSync(this.dbPath);
                this.db = new SQL.Database(buffer);
            } else {
                this.db = new SQL.Database();
            }

            // Enable foreign keys
            this.db.run('PRAGMA foreign_keys = ON');

            return this.db;
        })();

        return this.initPromise;
    }

    // Save database to disk
    save() {
        if (this.db) {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        }
    }

    // Execute SQL that returns nothing
    exec(sql) {
        this.db.exec(sql);
        this.save();
    }

    // Run SQL with parameters (INSERT, UPDATE, DELETE)
    run(sql, params = []) {
        this.db.run(sql, params);
        if (!this.inTransaction) {
            this.save();
        }
        return {
            changes: this.db.getRowsModified(),
            lastInsertRowid: this.getLastInsertRowid()
        };
    }

    // Get last insert rowid
    getLastInsertRowid() {
        const result = this.db.exec('SELECT last_insert_rowid() as id');
        return result.length > 0 ? result[0].values[0][0] : 0;
    }

    // Query single row
    get(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    }

    // Query all matching rows
    all(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    }

    // Prepare statement (for compatibility with existing code)
    prepare(sql) {
        const self = this;
        return {
            run: (...params) => self.run(sql, params),
            get: (...params) => self.get(sql, params),
            all: (...params) => self.all(sql, params)
        };
    }

    // Transaction wrapper
    transaction(fn) {
        const self = this;
        return (...args) => {
            if (self.inTransaction) {
                // Already in a transaction, just execute
                return fn(...args);
            }

            self.inTransaction = true;
            self.db.run('BEGIN TRANSACTION');
            try {
                const result = fn(...args);
                self.db.run('COMMIT');
                self.save();
                return result;
            } catch (error) {
                try {
                    self.db.run('ROLLBACK');
                } catch (rollbackError) {
                    // Ignore rollback errors
                }
                throw error;
            } finally {
                self.inTransaction = false;
            }
        };
    }
}

const db = new Database();

// Initialize database on module load
let initComplete = false;
const initDb = async () => {
    if (!initComplete) {
        await db.init();

        // Run migrations
        const migrationsDir = join(__dirname, '../../migrations');
        if (fs.existsSync(migrationsDir)) {
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(f => f.endsWith('.sql'))
                .sort();

            for (const file of migrationFiles) {
                const sql = fs.readFileSync(join(migrationsDir, file), 'utf-8');
                db.exec(sql);
            }
        }

        initComplete = true;
    }
    return db;
};

// Export both the db instance and init function
export { initDb };
export default db;

// Helper to run database in a transaction
export function runTransaction(callback) {
    return db.transaction(callback)();
}

// Helper to get database path
export function getDatabasePath() {
    return DB_PATH;
}
