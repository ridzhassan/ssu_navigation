/**
 * POI (Point of Interest) Routes
 * Handles all POI-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
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
// GET /poi
// Get all POIs with optional filters
// ===================
router.get('/', async (req, res, next) => {
    try {
        const { buildingId, type, search } = req.query;
        
        let sql = `
            SELECT 
                poi_id as POIId,
                building_name as BuildingName,
                latitude as Latitude,
                longitude as Longitude,
                type as Type,
                description as Description,
                image_url as ImageUrl,
                building_id as BuildingId,
                floor as Floor,
                tags as Tags,
                ar_enabled as AREnabled,
                ar_label as ARLabel,
                anchor_height as AnchorHeight,
                icon_scale as IconScale,
                min_visible_distance as MinVisibleDistance,
                max_visible_distance as MaxVisibleDistance,
                created_at as createdAt
            FROM pois
            WHERE is_active = 1
        `;
        const params = [];

        if (buildingId) {
            sql += ' AND building_id = ?';
            params.push(buildingId);
        }

        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }

        if (search) {
            sql += ' AND (building_name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY building_name ASC';

        const [pois] = await db.query(sql, params);

        // Parse tags JSON
        const formattedPOIs = pois.map(p => ({
            ...p,
            Tags: p.Tags ? JSON.parse(p.Tags) : []
        }));

        res.json(formattedPOIs);
    } catch (error) {
        next(error);
    }
});

// ===================
// GET /poi/search
// Search POIs by query
// ===================
router.get('/search',
    query('q').optional().trim(),
    async (req, res, next) => {
        try {
            const searchQuery = req.query.q || '';

            if (searchQuery.length < 2) {
                return res.json([]);
            }

            const [pois] = await db.query(`
                SELECT 
                    poi_id as POIId,
                    building_name as BuildingName,
                    latitude as Latitude,
                    longitude as Longitude,
                    type as Type,
                    description as Description,
                    image_url as ImageUrl,
                    building_id as BuildingId,
                    floor as Floor,
                    tags as Tags,
                    ar_enabled as AREnabled,
                    ar_label as ARLabel,
                    anchor_height as AnchorHeight,
                    icon_scale as IconScale,
                    min_visible_distance as MinVisibleDistance,
                    max_visible_distance as MaxVisibleDistance
                FROM pois
                WHERE is_active = 1
                AND (
                    building_name LIKE ? 
                    OR description LIKE ? 
                    OR type LIKE ?
                    OR tags LIKE ?
                )
                ORDER BY building_name ASC
                LIMIT 20
            `, [
                `%${searchQuery}%`,
                `%${searchQuery}%`,
                `%${searchQuery}%`,
                `%${searchQuery}%`
            ]);

            const formattedPOIs = pois.map(p => ({
                ...p,
                Tags: p.Tags ? JSON.parse(p.Tags) : []
            }));

            res.json(formattedPOIs);
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// GET /poi/types
// Get all unique POI types
// ===================
router.get('/types', async (req, res, next) => {
    try {
        const [types] = await db.query(`
            SELECT DISTINCT type 
            FROM pois 
            WHERE is_active = 1 AND type IS NOT NULL
            ORDER BY type ASC
        `);

        res.json(types.map(t => t.type));
    } catch (error) {
        next(error);
    }
});

// ===================
// GET /poi/:id
// Get single POI by ID
// ===================
router.get('/:id',
    param('id').isInt().withMessage('POI ID must be an integer'),
    validateRequest,
    async (req, res, next) => {
        try {
            const [pois] = await db.query(`
                SELECT 
                    poi_id as POIId,
                    building_name as BuildingName,
                    latitude as Latitude,
                    longitude as Longitude,
                    type as Type,
                    description as Description,
                    image_url as ImageUrl,
                    building_id as BuildingId,
                    floor as Floor,
                    tags as Tags,
                    ar_enabled as AREnabled,
                    ar_label as ARLabel,
                    anchor_height as AnchorHeight,
                    icon_scale as IconScale,
                    min_visible_distance as MinVisibleDistance,
                    max_visible_distance as MaxVisibleDistance,
                    created_at as createdAt,
                    updated_at as updatedAt
                FROM pois
                WHERE poi_id = ? AND is_active = 1
            `, [req.params.id]);

            if (pois.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'POI not found'
                });
            }

            const poi = pois[0];
            poi.Tags = poi.Tags ? JSON.parse(poi.Tags) : [];

            res.json(poi);
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// POST /poi
// Create new POI (Admin only)
// ===================
router.post('/',
    authenticateToken,
    requireAdmin,
    [
        body('buildingName').trim().notEmpty().withMessage('Building name is required'),
        body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
        body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
        body('type').trim().notEmpty().withMessage('POI type is required'),
        body('description').optional().trim(),
        body('buildingId').optional().isInt(),
        body('floor').optional().trim(),
        body('tags').optional().isArray(),
        body('arEnabled').optional().isBoolean(),
        body('arLabel').optional().trim(),
        body('anchorHeight').optional().isFloat({ min: 0, max: 30 }),
        body('iconScale').optional().isFloat({ min: 0.1, max: 10 }),
        body('minVisibleDistance').optional().isFloat({ min: 0, max: 1000 }),
        body('maxVisibleDistance').optional().isFloat({ min: 1, max: 5000 })
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const {
                buildingName,
                latitude,
                longitude,
                type,
                description,
                imageUrl,
                buildingId,
                floor,
                tags,
                arEnabled,
                arLabel,
                anchorHeight,
                iconScale,
                minVisibleDistance,
                maxVisibleDistance
            } = req.body;

            const [result] = await db.query(`
                INSERT INTO pois 
                (building_name, latitude, longitude, type, description, image_url, building_id, floor, tags, ar_enabled, ar_label, anchor_height, icon_scale, min_visible_distance, max_visible_distance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                buildingName,
                latitude,
                longitude,
                type,
                description || null,
                imageUrl || null,
                buildingId || null,
                floor || null,
                tags ? JSON.stringify(tags) : null,
                arEnabled === undefined ? 1 : (arEnabled ? 1 : 0),
                arLabel || null,
                anchorHeight ?? 1.6,
                iconScale ?? 1,
                minVisibleDistance ?? 3,
                maxVisibleDistance ?? 300
            ]);

            res.status(201).json({
                success: true,
                message: 'POI created successfully',
                data: {
                    POIId: result.insertId,
                    buildingName,
                    latitude,
                    longitude,
                    type
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// PUT /poi/:id
// Update POI (Admin only)
// ===================
router.put('/:id',
    authenticateToken,
    requireAdmin,
    [
        param('id').isInt().withMessage('POI ID must be an integer'),
        body('latitude').optional().isFloat({ min: -90, max: 90 }),
        body('longitude').optional().isFloat({ min: -180, max: 180 })
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Build dynamic update query
            const fields = [];
            const values = [];

            const fieldMapping = {
                buildingName: 'building_name',
                latitude: 'latitude',
                longitude: 'longitude',
                type: 'type',
                description: 'description',
                imageUrl: 'image_url',
                buildingId: 'building_id',
                floor: 'floor',
                tags: 'tags',
                arEnabled: 'ar_enabled',
                arLabel: 'ar_label',
                anchorHeight: 'anchor_height',
                iconScale: 'icon_scale',
                minVisibleDistance: 'min_visible_distance',
                maxVisibleDistance: 'max_visible_distance'
            };

            for (const [key, value] of Object.entries(updates)) {
                const dbField = fieldMapping[key];
                if (dbField) {
                    fields.push(`${dbField} = ?`);
                    if (key === 'tags') {
                        values.push(JSON.stringify(value));
                    } else if (key === 'arEnabled') {
                        values.push(value ? 1 : 0);
                    } else {
                        values.push(value);
                    }
                }
            }

            if (fields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid fields to update'
                });
            }

            fields.push('updated_at = NOW()');
            values.push(id);

            const [result] = await db.query(`
                UPDATE pois SET ${fields.join(', ')} WHERE poi_id = ?
            `, values);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'POI not found'
                });
            }

            res.json({
                success: true,
                message: 'POI updated successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// DELETE /poi/:id
// Delete POI (Admin only)
// ===================
router.delete('/:id',
    authenticateToken,
    requireAdmin,
    param('id').isInt().withMessage('POI ID must be an integer'),
    validateRequest,
    async (req, res, next) => {
        try {
            const { id } = req.params;

            // Soft delete
            const [result] = await db.query(`
                UPDATE pois SET is_active = 0, updated_at = NOW() WHERE poi_id = ?
            `, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'POI not found'
                });
            }

            res.json({
                success: true,
                message: 'POI deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// GET /poi/nearby/:lat/:lng
// Get POIs near a coordinate
// ===================
router.get('/nearby/:lat/:lng',
    [
        param('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
        param('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { lat, lng } = req.params;
            const radius = req.query.radius || 500; // Default 500 meters

            // Get all active POIs and calculate distance in JavaScript (SQLite compatible)
            const [pois] = await db.query(`
                SELECT 
                    poi_id as POIId,
                    building_name as BuildingName,
                    latitude as Latitude,
                    longitude as Longitude,
                    type as Type,
                    description as Description,
                    image_url as ImageUrl
                FROM pois
                WHERE is_active = 1
            `);

            // Calculate distance using Haversine formula in JavaScript
            const calculateDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371000; // Earth's radius in meters
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            };

            const nearbyPois = pois
                .map(poi => ({
                    ...poi,
                    distance: calculateDistance(parseFloat(lat), parseFloat(lng), poi.Latitude, poi.Longitude)
                }))
                .filter(poi => poi.distance < radius)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 20);

            res.json(nearbyPois);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;

