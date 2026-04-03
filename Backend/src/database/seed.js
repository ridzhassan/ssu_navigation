/**
 * Database Seed Script
 * Populates the database with sample data for testing
 */

require('dotenv').config({ path: '../../.env' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssc_navigation',
    multipleStatements: true
};

async function seed() {
    console.log('🌱 Starting database seed...\n');
    
    const connection = await mysql.createConnection(config);

    try {
        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('🗑️  Clearing existing data...');
        await connection.query(`
            SET FOREIGN_KEY_CHECKS = 0;
            TRUNCATE TABLE route_waypoints;
            TRUNCATE TABLE navigation_routes;
            TRUNCATE TABLE navigation_logs;
            TRUNCATE TABLE pois;
            TRUNCATE TABLE buildings;
            TRUNCATE TABLE admins;
            SET FOREIGN_KEY_CHECKS = 1;
        `);

        // Seed admins
        console.log('👤 Seeding admins...');
        const adminPassword = await bcrypt.hash('admin123', 12);
        await connection.query(`
            INSERT INTO admins (email, password, name, role) VALUES
            (?, ?, 'System Administrator', 'superadmin'),
            (?, ?, 'Campus Admin', 'admin')
        `, [
            'admin@ssc.edu.ph', adminPassword,
            'campus@ssc.edu.ph', adminPassword
        ]);
        console.log('   ✅ Created 2 admin accounts');

        // Seed buildings
        console.log('🏢 Seeding buildings...');
        const [buildingResult] = await connection.query(`
            INSERT INTO buildings (name, description, latitude, longitude, category, floors, facilities) VALUES
            ('College of Computer Studies', 'Main IT and Computer Science building with laboratories and lecture rooms', 6.05231, 121.00212, 'academic', 3, '["Computer Lab", "WiFi", "Air Conditioned", "Projectors"]'),
            ('College of Education', 'Teacher education and training facility', 6.05245, 121.00198, 'academic', 2, '["Library", "Seminar Room", "WiFi", "Demo Teaching Room"]'),
            ('College of Arts and Sciences', 'Liberal arts and sciences department', 6.05220, 121.00225, 'academic', 2, '["Science Lab", "Lecture Halls", "Research Room"]'),
            ('College of Business Administration', 'Business and entrepreneurship programs', 6.05235, 121.00190, 'academic', 2, '["Lecture Rooms", "WiFi", "Computer Lab"]'),
            ('Administration Building', 'Main administrative offices and student services', 6.05255, 121.00180, 'administrative', 2, '["Registrar", "Cashier", "Student Affairs", "President Office"]'),
            ('Library', 'Main campus library with digital resources', 6.05238, 121.00240, 'facility', 2, '["Reading Area", "Computer Access", "WiFi", "Air Conditioned", "E-Library"]'),
            ('Student Center', 'Student activities and organizations hub', 6.05210, 121.00200, 'facility', 1, '["Cafeteria", "Meeting Rooms", "WiFi", "Student Lounge"]'),
            ('Gymnasium', 'Sports and physical education facility', 6.05195, 121.00230, 'sports', 1, '["Basketball Court", "Volleyball Court", "Stage", "Sound System"]'),
            ('Canteen', 'Main campus dining facility', 6.05205, 121.00185, 'facility', 1, '["Food Stalls", "Seating Area", "Water Station"]'),
            ('Main Gate', 'Campus main entrance', 6.05280, 121.00160, 'entrance', 1, '["Guard House", "Visitor Parking", "Information Desk"]'),
            ('Parking Area', 'Faculty and student parking', 6.05270, 121.00175, 'facility', 1, '["Motorcycle Parking", "Car Parking", "Covered Parking"]'),
            ('Chapel', 'Campus worship and reflection area', 6.05248, 121.00220, 'facility', 1, '["Prayer Room", "Counseling Room"]'),
            ('Research Center', 'Academic research and development facility', 6.05225, 121.00235, 'academic', 2, '["Research Lab", "Conference Room", "Library"]'),
            ('NSTP Building', 'National Service Training Program facility', 6.05215, 121.00215, 'facility', 1, '["Training Room", "Storage", "Office"]'),
            ('Covered Court', 'Outdoor sports facility', 6.05188, 121.00210, 'sports', 1, '["Basketball Court", "Events Area", "Bleachers"]')
        `);
        console.log(`   ✅ Created ${buildingResult.affectedRows} buildings`);

        // Seed POIs
        console.log('📍 Seeding POIs...');
        const [poiResult] = await connection.query(`
            INSERT INTO pois (building_name, latitude, longitude, type, description, building_id, floor, tags) VALUES
            ('College of Computer Studies', 6.05231, 121.00212, 'department', 'Main IT academic building with computer laboratories', 1, 'Ground', '["IT", "Computer Science", "Programming"]'),
            ('CCS Computer Lab 1', 6.05232, 121.00210, 'lab', 'Primary computer laboratory for IT students', 1, '2nd Floor', '["Lab", "Computers", "IT"]'),
            ('CCS Computer Lab 2', 6.05233, 121.00214, 'lab', 'Secondary computer laboratory', 1, '2nd Floor', '["Lab", "Computers", "IT"]'),
            ('CCS Faculty Office', 6.05230, 121.00215, 'office', 'CCS faculty room and consultation area', 1, '3rd Floor', '["Faculty", "Office", "Consultation"]'),
            ('College of Education', 6.05245, 121.00198, 'department', 'Teacher education and professional development', 2, 'Ground', '["Education", "Teaching", "Training"]'),
            ('COE Demo Teaching Room', 6.05246, 121.00196, 'facility', 'Practice teaching demonstration room', 2, '2nd Floor', '["Teaching", "Demo", "Practice"]'),
            ('College of Arts and Sciences', 6.05220, 121.00225, 'department', 'Liberal arts, sciences, and general education', 3, 'Ground', '["Arts", "Sciences", "General Ed"]'),
            ('CAS Science Laboratory', 6.05221, 121.00227, 'lab', 'Physics and Chemistry laboratory', 3, '2nd Floor', '["Science", "Lab", "Chemistry", "Physics"]'),
            ('College of Business Admin', 6.05235, 121.00190, 'department', 'Business administration programs', 4, 'Ground', '["Business", "Management", "Entrepreneurship"]'),
            ('Registrar Office', 6.05255, 121.00180, 'office', 'Student registration and academic records', 5, 'Ground', '["Registrar", "Records", "Enrollment"]'),
            ('Cashier Office', 6.05256, 121.00182, 'office', 'Payment and financial transactions', 5, 'Ground', '["Payment", "Finance", "Fees"]'),
            ('Student Affairs Office', 6.05254, 121.00178, 'office', 'Student services and welfare', 5, 'Ground', '["Student Services", "Welfare"]'),
            ('President Office', 6.05257, 121.00181, 'office', 'College President office', 5, '2nd Floor', '["Administration", "Executive"]'),
            ('Main Library', 6.05238, 121.00240, 'facility', 'Books, journals, and digital resources', 6, 'Ground', '["Library", "Books", "Study", "Research"]'),
            ('E-Library Section', 6.05239, 121.00242, 'facility', 'Digital library and computer access', 6, '2nd Floor', '["E-Library", "Digital", "Computers"]'),
            ('Student Center', 6.05210, 121.00200, 'facility', 'Student organizations and activities hub', 7, 'Ground', '["Student Org", "Activities", "Events"]'),
            ('Student Lounge', 6.05211, 121.00202, 'facility', 'Student rest and recreation area', 7, 'Ground', '["Lounge", "Rest", "Recreation"]'),
            ('Gymnasium', 6.05195, 121.00230, 'sports', 'Indoor sports and events venue', 8, 'Ground', '["Sports", "Basketball", "Events"]'),
            ('Main Canteen', 6.05205, 121.00185, 'food', 'Campus dining area with multiple food stalls', 9, 'Ground', '["Food", "Dining", "Canteen"]'),
            ('Coffee Shop', 6.05206, 121.00187, 'food', 'Coffee and snacks shop', 9, 'Ground', '["Coffee", "Snacks", "Drinks"]'),
            ('Main Entrance', 6.05280, 121.00160, 'entrance', 'Campus main gate and security', 10, 'Ground', '["Entrance", "Security", "Gate"]'),
            ('Parking Area', 6.05270, 121.00175, 'facility', 'Vehicle parking facility', 11, 'Ground', '["Parking", "Vehicles"]'),
            ('Campus Chapel', 6.05248, 121.00220, 'facility', 'Worship and spiritual activities', 12, 'Ground', '["Chapel", "Worship", "Prayer"]'),
            ('Research Center', 6.05225, 121.00235, 'academic', 'Research and development facility', 13, 'Ground', '["Research", "Development", "Academic"]'),
            ('NSTP Office', 6.05215, 121.00215, 'office', 'NSTP program coordination', 14, 'Ground', '["NSTP", "ROTC", "CWTS"]'),
            ('Clinic', 6.05252, 121.00185, 'health', 'Campus medical clinic and first aid', 5, 'Ground', '["Health", "Medical", "Clinic", "First Aid"]'),
            ('Guidance Office', 6.05253, 121.00183, 'office', 'Student counseling and guidance services', 5, 'Ground', '["Guidance", "Counseling", "Career"]'),
            ('Covered Court', 6.05188, 121.00210, 'sports', 'Outdoor sports facility', 15, 'Ground', '["Sports", "Basketball", "Outdoor"]'),
            ('ATM Area', 6.05265, 121.00170, 'facility', 'Automated teller machines', 10, 'Ground', '["ATM", "Bank", "Money"]'),
            ('Guard House', 6.05278, 121.00162, 'facility', 'Security personnel station', 10, 'Ground', '["Security", "Guard", "Safety"]')
        `);
        console.log(`   ✅ Created ${poiResult.affectedRows} POIs`);

        // Seed navigation routes
        console.log('🗺️  Seeding navigation routes...');
        const [routeResult] = await connection.query(`
            INSERT INTO navigation_routes (name, description, total_distance, estimated_time, is_accessible) VALUES
            ('Main Gate to CCS', 'Route from main entrance to College of Computer Studies', 150, 3, TRUE),
            ('Main Gate to Library', 'Route from main entrance to the main library', 180, 4, TRUE),
            ('CCS to Canteen', 'Route from CCS building to the main canteen', 80, 2, TRUE),
            ('Campus Tour - Quick', 'Quick tour covering main buildings', 350, 7, TRUE),
            ('Campus Tour - Complete', 'Complete walking tour of all campus facilities', 600, 12, TRUE),
            ('Admin Building to Gym', 'Route from administration to gymnasium', 120, 2, TRUE)
        `);
        console.log(`   ✅ Created ${routeResult.affectedRows} navigation routes`);

        // Seed route waypoints
        console.log('📌 Seeding route waypoints...');
        await connection.query(`
            INSERT INTO route_waypoints (route_id, latitude, longitude, waypoint_order, description) VALUES
            -- Main Gate to CCS
            (1, 6.05280, 121.00160, 0, 'Start at Main Gate'),
            (1, 6.05270, 121.00175, 1, 'Pass parking area'),
            (1, 6.05255, 121.00180, 2, 'Pass Administration Building'),
            (1, 6.05245, 121.00195, 3, 'Near Education Building'),
            (1, 6.05231, 121.00212, 4, 'Arrive at CCS'),
            
            -- Main Gate to Library
            (2, 6.05280, 121.00160, 0, 'Start at Main Gate'),
            (2, 6.05270, 121.00175, 1, 'Pass parking area'),
            (2, 6.05255, 121.00200, 2, 'Pass Student Center'),
            (2, 6.05245, 121.00220, 3, 'Near Chapel'),
            (2, 6.05238, 121.00240, 4, 'Arrive at Library'),
            
            -- CCS to Canteen
            (3, 6.05231, 121.00212, 0, 'Start at CCS'),
            (3, 6.05220, 121.00200, 1, 'Pass CAS Building'),
            (3, 6.05210, 121.00195, 2, 'Near Student Center'),
            (3, 6.05205, 121.00185, 3, 'Arrive at Canteen'),
            
            -- Quick Campus Tour
            (4, 6.05280, 121.00160, 0, 'Start at Main Gate'),
            (4, 6.05255, 121.00180, 1, 'Administration Building'),
            (4, 6.05231, 121.00212, 2, 'College of Computer Studies'),
            (4, 6.05238, 121.00240, 3, 'Library'),
            (4, 6.05210, 121.00200, 4, 'Student Center'),
            (4, 6.05195, 121.00230, 5, 'Gymnasium'),
            (4, 6.05280, 121.00160, 6, 'Return to Main Gate')
        `);
        console.log('   ✅ Created route waypoints');

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('   Email: admin@ssc.edu.ph');
        console.log('   Password: admin123');
        console.log('   (Change this in production!)');

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

seed();

