/**
 * SSC Campus Navigation API
 * Main entry point for the backend server
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const buildingsRoutes = require('./routes/buildings');
const poiRoutes = require('./routes/poi');
const authRoutes = require('./routes/auth');
const routesRoutes = require('./routes/routes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================
// Security Middleware
// ===================
app.use(helmet());

// CORS Configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    }
});
app.use('/api/', limiter);

// ===================
// Body Parsing
// ===================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===================
// Static Files
// ===================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===================
// Logging
// ===================
app.use(requestLogger);

// ===================
// Health Check
// ===================
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'SSC Navigation API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ===================
// API Routes
// ===================
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingsRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/routes', routesRoutes);

// ===================
// 404 Handler
// ===================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// ===================
// Error Handler
// ===================
app.use(errorHandler);

// ===================
// Start Server
// ===================
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   SSC Campus Navigation API Server     ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║   Port: ${PORT}                            ║`);
    console.log(`║   Mode: ${process.env.NODE_ENV || 'development'}                   ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;

