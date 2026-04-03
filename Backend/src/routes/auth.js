/**
 * Authentication Routes
 * Handles admin login and token management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
// POST /auth/login
// Admin login
// ===================
router.post('/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // Find user
            const [users] = await db.query(`
                SELECT id, email, password, name, role, is_active
                FROM admins
                WHERE email = ?
            `, [email]);

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            const user = users[0];

            // Check if account is active
            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    error: 'Account is deactivated'
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Update last login
            await db.query(`
                UPDATE admins SET last_login = NOW() WHERE id = ?
            `, [user.id]);

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// POST /auth/register
// Create new admin (requires existing admin)
// ===================
router.post('/register',
    authenticateToken,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('role').optional().isIn(['admin', 'superadmin']).withMessage('Invalid role')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            // Only superadmin can create new admins
            if (req.user.role !== 'superadmin') {
                return res.status(403).json({
                    success: false,
                    error: 'Only superadmin can create new admins'
                });
            }

            const { email, password, name, role = 'admin' } = req.body;

            // Check if email already exists
            const [existing] = await db.query(`
                SELECT id FROM admins WHERE email = ?
            `, [email]);

            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create admin
            const [result] = await db.query(`
                INSERT INTO admins (email, password, name, role)
                VALUES (?, ?, ?, ?)
            `, [email, hashedPassword, name, role]);

            res.status(201).json({
                success: true,
                message: 'Admin created successfully',
                data: {
                    id: result.insertId,
                    email,
                    name,
                    role
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// GET /auth/me
// Get current user info
// ===================
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const [users] = await db.query(`
            SELECT id, email, name, role, created_at, last_login
            FROM admins
            WHERE id = ?
        `, [req.user.userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        next(error);
    }
});

// ===================
// POST /auth/change-password
// Change password
// ===================
router.post('/change-password',
    authenticateToken,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { currentPassword, newPassword } = req.body;

            // Get current password hash
            const [users] = await db.query(`
                SELECT password FROM admins WHERE id = ?
            `, [req.user.userId]);

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, users[0].password);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update password
            await db.query(`
                UPDATE admins SET password = ?, updated_at = NOW() WHERE id = ?
            `, [hashedPassword, req.user.userId]);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// ===================
// POST /auth/logout
// Logout (client-side token removal, but log the event)
// ===================
router.post('/logout', authenticateToken, async (req, res) => {
    // In a production app, you might want to blacklist the token
    // For simplicity, we just return success
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;

