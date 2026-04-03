/**
 * SQLite Database Connection
 * Using sql.js (pure JavaScript SQLite - no native dependencies)
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, '../../data/ssc_navigation.db');
const dataDir = path.dirname(dbPath);

// Database instance
let db = null;
let dbReady = null;

// Initialize database
async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('✅ Database loaded from file');
        updateKnownPOICoordinates();
    } else {
        db = new SQL.Database();
        console.log('🔧 Creating new database...');
        createSchema();
        seedDatabase();
        saveDatabase();
    }
    
    return db;
}

// Update known POI coordinates and ensure key POIs exist (for existing databases)
// Fixes wrong coordinates (e.g. old typos like 6.85456, 123.00387) to correct SSC campus location
function updateKnownPOICoordinates() {
    const knownPOIs = [
        ['Administrative Building', 6.051607934623702, 121.01233231292177],
        ['Cashier Office', 6.051676239286513, 121.01215839671107]
    ];
    knownPOIs.forEach(([name, lat, lng]) => {
        try {
            // Match case-insensitively so "Cashier Office" is always found
            db.run(
                'UPDATE pois SET latitude = ?, longitude = ? WHERE LOWER(TRIM(building_name)) = LOWER(TRIM(?))',
                [lat, lng, name]
            );
            // If Administrative Building doesn't exist, insert it
            if (name === 'Administrative Building') {
                const stmt = db.prepare('SELECT 1 FROM pois WHERE LOWER(TRIM(building_name)) = LOWER(TRIM(?))');
                stmt.bind([name]);
                const exists = stmt.step();
                stmt.free();
                if (!exists) {
                    db.run(
                        'INSERT INTO pois (building_name, latitude, longitude, type, description, building_id) VALUES (?, ?, ?, ?, ?, ?)',
                        [name, lat, lng, 'office', 'Main administrative offices and student services', null]
                    );
                }
            }
        } catch (e) {
            // ignore if table/column missing
        }
    });
    saveDatabase();
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// Create database schema
function createSchema() {
    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'superadmin')),
            is_active INTEGER DEFAULT 1,
            last_login TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS buildings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            image_url TEXT,
            category TEXT DEFAULT 'general',
            floors INTEGER DEFAULT 1,
            facilities TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS pois (
            poi_id INTEGER PRIMARY KEY AUTOINCREMENT,
            building_name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            building_id INTEGER,
            floor TEXT,
            tags TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS navigation_routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            total_distance REAL DEFAULT 0,
            estimated_time INTEGER DEFAULT 0,
            is_accessible INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS route_waypoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            waypoint_order INTEGER NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (route_id) REFERENCES navigation_routes(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS navigation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            start_poi_id INTEGER,
            end_poi_id INTEGER,
            start_time TEXT NOT NULL,
            end_time TEXT,
            completed INTEGER DEFAULT 0,
            distance_traveled REAL,
            device_info TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_pois_building_name ON pois(building_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type)`);
    
    console.log('✅ Database schema created');
}

// Seed initial data
function seedDatabase() {
    console.log('📦 Seeding initial data...');
    
    // Default admin password: admin123
    const hashedPassword = bcrypt.hashSync('admin123', 12);
    
    db.run(`INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)`,
        ['admin@ssc.edu.ph', hashedPassword, 'System Administrator', 'superadmin']);

    // Insert buildings - Coordinates corrected to match actual SSC campus location (Google Maps: 6.054353, 121.0032358)
    const buildings = [
        ['College of Computer Studies', 'Main IT and Computer Science building with laboratories and lecture rooms', 6.05431, 121.00332, 'academic', 3, '["Computer Lab", "WiFi", "Air Conditioned"]'],
        ['College of Education', 'Teacher education and training facility', 6.05445, 121.00318, 'academic', 2, '["Library", "Seminar Room", "WiFi"]'],
        ['College of Arts and Sciences', 'Liberal arts and sciences department', 6.05420, 121.00345, 'academic', 2, '["Science Lab", "Lecture Halls"]'],
        ['Administration Building', 'Main administrative offices and student services', 6.05455, 121.00300, 'administrative', 2, '["Registrar", "Cashier", "Student Affairs"]'],
        ['Library', 'Main campus library with digital resources', 6.05438, 121.00360, 'facility', 2, '["Reading Area", "Computer Access", "WiFi", "Air Conditioned"]'],
        ['Student Center', 'Student activities and organizations hub', 6.05410, 121.00320, 'facility', 1, '["Cafeteria", "Meeting Rooms", "WiFi"]'],
        ['Gymnasium', 'Sports and physical education facility', 6.05395, 121.00350, 'sports', 1, '["Basketball Court", "Volleyball Court", "Stage"]'],
        ['Canteen', 'Main campus dining facility', 6.05405, 121.00305, 'facility', 1, '["Food Stalls", "Seating Area"]'],
        ['Main Gate', 'Campus main entrance', 6.05480, 121.00280, 'entrance', 1, '["Guard House", "Visitor Parking"]'],
        ['Parking Area', 'Faculty and student parking', 6.05470, 121.00295, 'facility', 1, '["Motorcycle Parking", "Car Parking"]']
    ];

    buildings.forEach(b => {
        db.run(`INSERT INTO buildings (name, description, latitude, longitude, category, floors, facilities) VALUES (?, ?, ?, ?, ?, ?, ?)`, b);
    });

    // Insert POIs - Coordinates corrected to match actual SSC campus location
    const pois = [
        ['Administrative Building', 6.051607934623702, 121.01233231292177, 'office', 'Main administrative offices and student services', null],
        ['College of Computer Studies', 6.05431, 121.00332, 'department', 'Main IT academic building with computer laboratories', 1],
        ['College of Education', 6.05445, 121.00318, 'department', 'Teacher education and professional development', 2],
        ['College of Arts and Sciences', 6.05420, 121.00345, 'department', 'Liberal arts, sciences, and general education', 3],
        ['Registrar Office', 6.05455, 121.00300, 'office', 'Student registration and records', 4],
        ['Cashier Office', 6.051676239286513, 121.01215839671107, 'office', 'Payment and financial transactions', 4],
        ['Main Library', 6.05438, 121.00360, 'facility', 'Books, journals, and digital resources', 5],
        ['Student Center', 6.05410, 121.00320, 'facility', 'Student organizations and activities', 6],
        ['Gymnasium', 6.05395, 121.00350, 'sports', 'Indoor sports and events venue', 7],
        ['Main Canteen', 6.05405, 121.00305, 'food', 'Campus dining area', 8],
        ['Main Entrance', 6.05480, 121.00280, 'entrance', 'Campus main gate', 9],
        ['Computer Laboratory 1', 6.05432, 121.00330, 'lab', 'Primary computer lab for IT students', 1],
        ['Computer Laboratory 2', 6.05433, 121.00334, 'lab', 'Secondary computer lab', 1],
        ['Science Laboratory', 6.05421, 121.00347, 'lab', 'Physics and Chemistry lab', 3],
        ['Faculty Office - CCS', 6.05430, 121.00335, 'office', 'CCS faculty room', 1],
        ['Clinic', 6.05452, 121.00305, 'health', 'Campus medical clinic', 4]
    ];

    pois.forEach(p => {
        db.run(`INSERT INTO pois (building_name, latitude, longitude, type, description, building_id) VALUES (?, ?, ?, ?, ?, ?)`, p);
    });

    // Insert navigation routes
    db.run(`INSERT INTO navigation_routes (name, description, total_distance, estimated_time, is_accessible) VALUES (?, ?, ?, ?, ?)`,
        ['Main Gate to CCS', 'Route from main entrance to College of Computer Studies', 150, 3, 1]);
    
    db.run(`INSERT INTO navigation_routes (name, description, total_distance, estimated_time, is_accessible) VALUES (?, ?, ?, ?, ?)`,
        ['Campus Tour', 'Complete walking tour of the campus', 500, 10, 1]);

    // Insert waypoints - Coordinates corrected to match actual SSC campus location
    const waypoints = [
        [1, 6.05480, 121.00280, 0, 'Start at Main Gate'],
        [1, 6.05470, 121.00295, 1, 'Pass parking area'],
        [1, 6.05455, 121.00300, 2, 'Administration Building'],
        [1, 6.05445, 121.00315, 3, 'Near Education Building'],
        [1, 6.05431, 121.00332, 4, 'Arrive at CCS']
    ];

    waypoints.forEach(w => {
        db.run(`INSERT INTO route_waypoints (route_id, latitude, longitude, waypoint_order, description) VALUES (?, ?, ?, ?, ?)`, w);
    });

    console.log('✅ Seed data inserted successfully');
}

// Promise for when database is ready
dbReady = initDatabase();

// Create a wrapper to mimic mysql2's promise API
const pool = {
    query: async (sql, params = []) => {
        await dbReady;
        
        try {
            // Replace MySQL-specific syntax with SQLite equivalents
            let sqliteSql = sql
                .replace(/NOW\(\)/gi, "datetime('now')");
            
            // Determine if it's a SELECT or modification query
            const trimmedSql = sqliteSql.trim().toUpperCase();
            const isSelect = trimmedSql.startsWith('SELECT');
            
            if (isSelect) {
                const stmt = db.prepare(sqliteSql);
                if (params.length > 0) {
                    stmt.bind(params);
                }
                const rows = [];
                while (stmt.step()) {
                    rows.push(stmt.getAsObject());
                }
                stmt.free();
                return [rows];
            } else {
                db.run(sqliteSql, params);
                const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0;
                const changes = db.getRowsModified();
                
                // Save after modifications
                saveDatabase();
                
                return [{
                    insertId: lastId,
                    affectedRows: changes
                }];
            }
        } catch (error) {
            console.error('Database error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    },
    
    getConnection: async () => {
        await dbReady;
        
        return {
            query: async (sql, params = []) => {
                return pool.query(sql, params);
            },
            beginTransaction: async () => {
                db.run('BEGIN TRANSACTION');
            },
            commit: async () => {
                db.run('COMMIT');
                saveDatabase();
            },
            rollback: async () => {
                db.run('ROLLBACK');
            },
            release: () => {
                // No-op for SQLite
            }
        };
    }
};

module.exports = pool;
