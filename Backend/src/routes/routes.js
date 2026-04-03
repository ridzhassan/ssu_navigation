/**
 * Routes (Navigation Paths) Routes
 * Handles predefined navigation routes and waypoints
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/connection');

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// ===================
// GET /routes
// Get all navigation routes
// ===================
router.get('/', async (req, res, next) => {
    try {
        const [routes] = await db.query(`
            SELECT 
                r.id,
                r.name,
                r.description,
                r.total_distance as totalDistance,
                r.estimated_time as estimatedTime,
                r.is_accessible as isAccessible,
                r.created_at as createdAt
            FROM navigation_routes r
            WHERE r.is_active = 1
            ORDER BY r.name ASC
        `);

        // Get waypoints for each route
        for (let route of routes) {
            const [waypoints] = await db.query(`
                SELECT 
                    latitude,
                    longitude,
                    waypoint_order as 'order',
                    description
                FROM route_waypoints
                WHERE route_id = ?
                ORDER BY waypoint_order ASC
            `, [route.id]);

            route.waypoints = waypoints;
        }

        res.json(routes);
    } catch (error) {
        next(error);
    }
});

// ===================
// GET /routes/:id
// Get single route with waypoints
// ===================
router.get('/:id',
    param('id').isInt().withMessage('Route ID must be an integer'),
    validateRequest,
    async (req, res, next) => {
        try {
            const [routes] = await db.query(`
                SELECT 
                    id,
                    name,
                    description,
                    total_distance as totalDistance,
                    estimated_time as estimatedTime,
                    is_accessible as isAccessible,
                    created_at as createdAt
                FROM navigation_routes
                WHERE id = ? AND is_active = 1
            `, [req.params.id]);

            if (routes.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Route not found'
                });
            }

            const route = routes[0];

            // Get waypoints
            const [waypoints] = await db.query(`
                SELECT 
                    latitude,
                    longitude,
                    waypoint_order as 'order',
                    description
                FROM route_waypoints
                WHERE route_id = ?
                ORDER BY waypoint_order ASC
            `, [route.id]);

            route.waypoints = waypoints;

            res.json(route);
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// POST /routes
// Create new route (Admin only)
// ===================
router.post('/',
    authenticateToken,
    requireAdmin,
    [
        body('name').trim().notEmpty().withMessage('Route name is required'),
        body('waypoints').isArray({ min: 2 }).withMessage('At least 2 waypoints required'),
        body('waypoints.*.latitude').isFloat({ min: -90, max: 90 }),
        body('waypoints.*.longitude').isFloat({ min: -180, max: 180 })
    ],
    validateRequest,
    async (req, res, next) => {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const { name, description, waypoints, isAccessible } = req.body;

            // Calculate total distance
            let totalDistance = 0;
            for (let i = 1; i < waypoints.length; i++) {
                totalDistance += calculateDistance(
                    waypoints[i-1].latitude, waypoints[i-1].longitude,
                    waypoints[i].latitude, waypoints[i].longitude
                );
            }

            // Estimate time (assuming 5 km/h walking speed)
            const estimatedTime = Math.round((totalDistance / 5000) * 60); // minutes

            // Create route
            const [result] = await connection.query(`
                INSERT INTO navigation_routes 
                (name, description, total_distance, estimated_time, is_accessible)
                VALUES (?, ?, ?, ?, ?)
            `, [name, description || null, totalDistance, estimatedTime, isAccessible ? 1 : 0]);

            const routeId = result.insertId;

            // Insert waypoints
            for (let i = 0; i < waypoints.length; i++) {
                await connection.query(`
                    INSERT INTO route_waypoints 
                    (route_id, latitude, longitude, waypoint_order, description)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    routeId,
                    waypoints[i].latitude,
                    waypoints[i].longitude,
                    i,
                    waypoints[i].description || null
                ]);
            }

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Route created successfully',
                data: {
                    id: routeId,
                    name,
                    totalDistance,
                    estimatedTime,
                    waypointsCount: waypoints.length
                }
            });
        } catch (error) {
            await connection.rollback();
            next(error);
        } finally {
            connection.release();
        }
    }
);

// ===================
// PUT /routes/:id
// Update route (Admin only)
// ===================
router.put('/:id',
    authenticateToken,
    requireAdmin,
    [
        param('id').isInt().withMessage('Route ID must be an integer'),
        body('waypoints').optional().isArray({ min: 2 })
    ],
    validateRequest,
    async (req, res, next) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { name, description, waypoints, isAccessible } = req.body;

            // Update route info
            const updates = [];
            const values = [];

            if (name) {
                updates.push('name = ?');
                values.push(name);
            }
            if (description !== undefined) {
                updates.push('description = ?');
                values.push(description);
            }
            if (isAccessible !== undefined) {
                updates.push('is_accessible = ?');
                values.push(isAccessible ? 1 : 0);
            }

            if (updates.length > 0) {
                updates.push('updated_at = NOW()');
                values.push(id);

                await connection.query(`
                    UPDATE navigation_routes SET ${updates.join(', ')} WHERE id = ?
                `, values);
            }

            // Update waypoints if provided
            if (waypoints && waypoints.length > 0) {
                // Delete existing waypoints
                await connection.query(`
                    DELETE FROM route_waypoints WHERE route_id = ?
                `, [id]);

                // Calculate new distance
                let totalDistance = 0;
                for (let i = 1; i < waypoints.length; i++) {
                    totalDistance += calculateDistance(
                        waypoints[i-1].latitude, waypoints[i-1].longitude,
                        waypoints[i].latitude, waypoints[i].longitude
                    );
                }

                const estimatedTime = Math.round((totalDistance / 5000) * 60);

                // Update route distance
                await connection.query(`
                    UPDATE navigation_routes 
                    SET total_distance = ?, estimated_time = ?, updated_at = NOW()
                    WHERE id = ?
                `, [totalDistance, estimatedTime, id]);

                // Insert new waypoints
                for (let i = 0; i < waypoints.length; i++) {
                    await connection.query(`
                        INSERT INTO route_waypoints 
                        (route_id, latitude, longitude, waypoint_order, description)
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        id,
                        waypoints[i].latitude,
                        waypoints[i].longitude,
                        i,
                        waypoints[i].description || null
                    ]);
                }
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'Route updated successfully'
            });
        } catch (error) {
            await connection.rollback();
            next(error);
        } finally {
            connection.release();
        }
    }
);

// ===================
// DELETE /routes/:id
// Delete route (Admin only)
// ===================
router.delete('/:id',
    authenticateToken,
    requireAdmin,
    param('id').isInt().withMessage('Route ID must be an integer'),
    validateRequest,
    async (req, res, next) => {
        try {
            const { id } = req.params;

            const [result] = await db.query(`
                UPDATE navigation_routes SET is_active = 0, updated_at = NOW() WHERE id = ?
            `, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Route not found'
                });
            }

            res.json({
                success: true,
                message: 'Route deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// GET /routes/between/:startPOI/:endPOI
// Get route between two POIs
// ===================
router.get('/between/:startPOI/:endPOI',
    [
        param('startPOI').isInt().withMessage('Start POI ID must be an integer'),
        param('endPOI').isInt().withMessage('End POI ID must be an integer')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { startPOI, endPOI } = req.params;

            // Get POI coordinates
            const [pois] = await db.query(`
                SELECT poi_id, latitude, longitude, building_name
                FROM pois
                WHERE poi_id IN (?, ?) AND is_active = 1
            `, [startPOI, endPOI]);

            if (pois.length < 2) {
                return res.status(404).json({
                    success: false,
                    error: 'One or both POIs not found'
                });
            }

            const start = pois.find(p => p.poi_id == startPOI);
            const end = pois.find(p => p.poi_id == endPOI);

            // Calculate direct distance
            const distance = calculateDistance(
                start.latitude, start.longitude,
                end.latitude, end.longitude
            );

            // Generate simple waypoints (direct path)
            const waypoints = [
                { latitude: start.latitude, longitude: start.longitude, order: 0 },
                { latitude: end.latitude, longitude: end.longitude, order: 1 }
            ];

            res.json({
                startPOI: {
                    id: start.poi_id,
                    name: start.building_name,
                    latitude: start.latitude,
                    longitude: start.longitude
                },
                endPOI: {
                    id: end.poi_id,
                    name: end.building_name,
                    latitude: end.latitude,
                    longitude: end.longitude
                },
                distance: Math.round(distance),
                estimatedTime: Math.round((distance / 5000) * 60),
                waypoints
            });
        } catch (error) {
            next(error);
        }
    }
);

// Helper function - Haversine distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

module.exports = router;

