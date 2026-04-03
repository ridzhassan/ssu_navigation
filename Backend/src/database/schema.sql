-- =============================================
-- SSC Campus Navigation Database Schema
-- Sulu State College AR Navigation App
-- =============================================

-- Create database
CREATE DATABASE IF NOT EXISTS ssc_navigation
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE ssc_navigation;

-- =============================================
-- Admins Table
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'superadmin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- =============================================
-- Buildings Table
-- =============================================
CREATE TABLE IF NOT EXISTS buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(50) DEFAULT 'general',
    floors INT DEFAULT 1,
    facilities JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_location (latitude, longitude),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =============================================
-- POIs (Points of Interest) Table
-- =============================================
CREATE TABLE IF NOT EXISTS pois (
    poi_id INT AUTO_INCREMENT PRIMARY KEY,
    building_name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    building_id INT,
    floor VARCHAR(20),
    tags JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_building_name (building_name),
    INDEX idx_type (type),
    INDEX idx_location (latitude, longitude),
    INDEX idx_building_id (building_id),
    INDEX idx_active (is_active),
    
    CONSTRAINT fk_poi_building 
        FOREIGN KEY (building_id) 
        REFERENCES buildings(id) 
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================
-- Navigation Routes Table
-- =============================================
CREATE TABLE IF NOT EXISTS navigation_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_distance FLOAT DEFAULT 0,
    estimated_time INT DEFAULT 0,
    is_accessible BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =============================================
-- Route Waypoints Table
-- =============================================
CREATE TABLE IF NOT EXISTS route_waypoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    waypoint_order INT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_route_id (route_id),
    INDEX idx_order (waypoint_order),
    
    CONSTRAINT fk_waypoint_route 
        FOREIGN KEY (route_id) 
        REFERENCES navigation_routes(id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- Navigation Logs Table (for analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS navigation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50),
    start_poi_id INT,
    end_poi_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    completed BOOLEAN DEFAULT FALSE,
    distance_traveled FLOAT,
    device_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session (session_id),
    INDEX idx_start_time (start_time),
    INDEX idx_completed (completed)
) ENGINE=InnoDB;

-- =============================================
-- Insert Default Admin User
-- Password: admin123 (change in production!)
-- =============================================
INSERT INTO admins (email, password, name, role) VALUES
('admin@ssc.edu.ph', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FJN3HLXQHQXGVC', 'System Administrator', 'superadmin')
ON DUPLICATE KEY UPDATE email=email;

-- =============================================
-- Insert Sample Campus Buildings
-- Coordinates are approximate for Sulu State College
-- =============================================
INSERT INTO buildings (name, description, latitude, longitude, category, floors, facilities) VALUES
('College of Computer Studies', 'Main IT and Computer Science building with laboratories and lecture rooms', 6.05231, 121.00212, 'academic', 3, '["Computer Lab", "WiFi", "Air Conditioned"]'),
('College of Education', 'Teacher education and training facility', 6.05245, 121.00198, 'academic', 2, '["Library", "Seminar Room", "WiFi"]'),
('College of Arts and Sciences', 'Liberal arts and sciences department', 6.05220, 121.00225, 'academic', 2, '["Science Lab", "Lecture Halls"]'),
('Administration Building', 'Main administrative offices and student services', 6.05255, 121.00180, 'administrative', 2, '["Registrar", "Cashier", "Student Affairs"]'),
('Library', 'Main campus library with digital resources', 6.05238, 121.00240, 'facility', 2, '["Reading Area", "Computer Access", "WiFi", "Air Conditioned"]'),
('Student Center', 'Student activities and organizations hub', 6.05210, 121.00200, 'facility', 1, '["Cafeteria", "Meeting Rooms", "WiFi"]'),
('Gymnasium', 'Sports and physical education facility', 6.05195, 121.00230, 'sports', 1, '["Basketball Court", "Volleyball Court", "Stage"]'),
('Canteen', 'Main campus dining facility', 6.05205, 121.00185, 'facility', 1, '["Food Stalls", "Seating Area"]'),
('Main Gate', 'Campus main entrance', 6.05280, 121.00160, 'entrance', 1, '["Guard House", "Visitor Parking"]'),
('Parking Area', 'Faculty and student parking', 6.05270, 121.00175, 'facility', 1, '["Motorcycle Parking", "Car Parking"]')
ON DUPLICATE KEY UPDATE name=name;

-- =============================================
-- Insert Sample POIs
-- =============================================
INSERT INTO pois (building_name, latitude, longitude, type, description, building_id) VALUES
('College of Computer Studies', 6.05231, 121.00212, 'department', 'Main IT academic building with computer laboratories', 1),
('College of Education', 6.05245, 121.00198, 'department', 'Teacher education and professional development', 2),
('College of Arts and Sciences', 6.05220, 121.00225, 'department', 'Liberal arts, sciences, and general education', 3),
('Registrar Office', 6.05255, 121.00180, 'office', 'Student registration and records', 4),
('Cashier Office', 6.05256, 121.00182, 'office', 'Payment and financial transactions', 4),
('Main Library', 6.05238, 121.00240, 'facility', 'Books, journals, and digital resources', 5),
('Student Center', 6.05210, 121.00200, 'facility', 'Student organizations and activities', 6),
('Gymnasium', 6.05195, 121.00230, 'sports', 'Indoor sports and events venue', 7),
('Main Canteen', 6.05205, 121.00185, 'food', 'Campus dining area', 8),
('Main Entrance', 6.05280, 121.00160, 'entrance', 'Campus main gate', 9),
('Computer Laboratory 1', 6.05232, 121.00210, 'lab', 'Primary computer lab for IT students', 1),
('Computer Laboratory 2', 6.05233, 121.00214, 'lab', 'Secondary computer lab', 1),
('Science Laboratory', 6.05221, 121.00227, 'lab', 'Physics and Chemistry lab', 3),
('Faculty Office - CCS', 6.05230, 121.00215, 'office', 'CCS faculty room', 1),
('Clinic', 6.05252, 121.00185, 'health', 'Campus medical clinic', 4)
ON DUPLICATE KEY UPDATE building_name=building_name;

-- =============================================
-- Insert Sample Navigation Route
-- =============================================
INSERT INTO navigation_routes (name, description, total_distance, estimated_time, is_accessible) VALUES
('Main Gate to CCS', 'Route from main entrance to College of Computer Studies', 150, 3, TRUE),
('Campus Tour', 'Complete walking tour of the campus', 500, 10, TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Insert waypoints for Main Gate to CCS route
INSERT INTO route_waypoints (route_id, latitude, longitude, waypoint_order, description) VALUES
(1, 6.05280, 121.00160, 0, 'Start at Main Gate'),
(1, 6.05270, 121.00175, 1, 'Pass parking area'),
(1, 6.05255, 121.00180, 2, 'Administration Building'),
(1, 6.05245, 121.00195, 3, 'Near Education Building'),
(1, 6.05231, 121.00212, 4, 'Arrive at CCS')
ON DUPLICATE KEY UPDATE route_id=route_id;

-- =============================================
-- Useful Views
-- =============================================

-- Active POIs with building info
CREATE OR REPLACE VIEW v_pois_with_buildings AS
SELECT 
    p.poi_id,
    p.building_name,
    p.latitude,
    p.longitude,
    p.type,
    p.description,
    p.image_url,
    p.floor,
    p.tags,
    b.name as parent_building_name,
    b.category as building_category
FROM pois p
LEFT JOIN buildings b ON p.building_id = b.id
WHERE p.is_active = 1;

-- Building statistics
CREATE OR REPLACE VIEW v_building_stats AS
SELECT 
    b.id,
    b.name,
    b.category,
    COUNT(p.poi_id) as poi_count
FROM buildings b
LEFT JOIN pois p ON b.id = p.building_id AND p.is_active = 1
WHERE b.is_active = 1
GROUP BY b.id;

-- =============================================
-- Done!
-- =============================================
SELECT 'Database schema created successfully!' as Status;

