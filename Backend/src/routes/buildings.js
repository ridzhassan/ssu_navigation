/**
 * Buildings Routes
 * Handles all building-related API endpoints
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
// GET /buildings
// Get all buildings
// ===================
router.get('/', async (req, res, next) => {
    try {
        const [buildings] = await db.query(`
            SELECT 
                id,
                name,
                description,
                latitude,
                longitude,
                image_url as imageUrl,
                category,
                floors,
                facilities,
                created_at as createdAt,
                updated_at as updatedAt
            FROM buildings
            WHERE is_active = 1
            ORDER BY name ASC
        `);

        // Parse facilities JSON
        const formattedBuildings = buildings.map(b => ({
            ...b,
            facilities: b.facilities ? JSON.parse(b.facilities) : []
        }));

        res.json(formattedBuildings);
    } catch (error) {
        next(error);
    }
});

// ===================
// GET /buildings/:id
// Get single building by ID
// ===================
router.get('/:id',
    param('id').isInt().withMessage('Building ID must be an integer'),
    validateRequest,
    async (req, res, next) => {
        try {
            const [buildings] = await db.query(`
                SELECT 
                    id,
                    name,
                    description,
                    latitude,
                    longitude,
                    image_url as imageUrl,
                    category,
                    floors,
                    facilities,
                    created_at as createdAt,
                    updated_at as updatedAt
                FROM buildings
                WHERE id = ? AND is_active = 1
            `, [req.params.id]);

            if (buildings.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Building not found'
                });
            }

            const building = buildings[0];
            building.facilities = building.facilities ? JSON.parse(building.facilities) : [];

            res.json(building);
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// POST /buildings
// Create new building (Admin only)
// ===================
router.post('/',
    authenticateToken,
    requireAdmin,
    [
        body('name').trim().notEmpty().withMessage('Building name is required'),
        body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
        body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
        body('description').optional().trim(),
        body('category').optional().trim(),
        body('floors').optional().isInt({ min: 1 }).withMessage('Floors must be a positive integer'),
        body('facilities').optional().isArray()
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const {
                name,
                description,
                latitude,
                longitude,
                imageUrl,
                category,
                floors,
                facilities
            } = req.body;

            const [result] = await db.query(`
                INSERT INTO buildings 
                (name, description, latitude, longitude, image_url, category, floors, facilities)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                name,
                description || null,
                latitude,
                longitude,
                imageUrl || null,
                category || 'general',
                floors || 1,
                facilities ? JSON.stringify(facilities) : null
            ]);

            res.status(201).json({
                success: true,
                message: 'Building created successfully',
                data: {
                    id: result.insertId,
                    name,
                    latitude,
                    longitude
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// PUT /buildings/:id
// Update building (Admin only)
// ===================
router.put('/:id',
    authenticateToken,
    requireAdmin,
    [
        param('id').isInt().withMessage('Building ID must be an integer'),
        body('name').optional().trim().notEmpty(),
        body('latitude').optional().isFloat({ min: -90, max: 90 }),
        body('longitude').optional().isFloat({ min: -180, max: 180 }),
        body('floors').optional().isInt({ min: 1 })
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Build dynamic update query
            const fields = [];
            const values = [];

            const allowedFields = ['name', 'description', 'latitude', 'longitude', 
                                   'image_url', 'category', 'floors', 'facilities'];
            
            for (const [key, value] of Object.entries(updates)) {
                const dbField = key === 'imageUrl' ? 'image_url' : key;
                if (allowedFields.includes(dbField)) {
                    fields.push(`${dbField} = ?`);
                    values.push(key === 'facilities' ? JSON.stringify(value) : value);
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
                UPDATE buildings SET ${fields.join(', ')} WHERE id = ?
            `, values);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Building not found'
                });
            }

            res.json({
                success: true,
                message: 'Building updated successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// DELETE /buildings/:id
// Delete building (Admin only)
// ===================
router.delete('/:id',
    authenticateToken,
    requireAdmin,
    param('id').isInt().withMessage('Building ID must be an integer'),
    validateRequest,
    async (req, res, next) => {
        try {
            const { id } = req.params;

            // Soft delete
            const [result] = await db.query(`
                UPDATE buildings SET is_active = 0, updated_at = NOW() WHERE id = ?
            `, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Building not found'
                });
            }

            res.json({
                success: true,
                message: 'Building deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// GET /buildings/:id/pois
// Get all POIs in a building
// ===================
router.get('/:id/pois',
    param('id').isInt().withMessage('Building ID must be an integer'),
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
                    tags as Tags
                FROM pois
                WHERE building_id = ? AND is_active = 1
                ORDER BY building_name ASC
            `, [req.params.id]);

            // Parse tags JSON
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

module.exports = router;

