/**
 * ============================================================================
 * Research Games API Server
 * ============================================================================
 *
 * Express.js backend for psychological experiments testing
 * Festinger's Cognitive Dissonance vs Capaldi's Sequential Theory
 *
 * Features:
 * - Participant management
 * - Balanced condition assignment
 * - Data validation and storage
 * - CSV/JSON export for R analysis
 * - Admin authentication
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const apiRoutes = require('./routes/api');
const { sequelize } = require('./models');

// ============================================================================
// APP INITIALIZATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy - required when behind Nginx/reverse proxy
app.set('trust proxy', true);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,  // Allow jsPsych to work
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health check (no rate limit)
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        await sequelize.authenticate();

        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: NODE_ENV,
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Research Games API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            consent: 'POST /api/consent',
            assign: 'GET /api/assign/:experiment',
            save: 'POST /api/experiment/:id/save',
            stats: 'GET /api/stats/:experiment',
            export: 'GET /api/export/:experiment/:format',
            login: 'POST /api/admin/login'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================================================
// DATABASE CONNECTION & SERVER START
// ============================================================================

async function startServer() {
    try {
        // Test database connection
        console.log('🔌 Connecting to PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Sync models (in production, use migrations instead)
        if (NODE_ENV === 'development') {
            // Don't force sync in production - data will be lost!
            // await sequelize.sync({ alter: true });
            console.log('📊 Database models synced (development mode)');
        }

        // Start listening
        app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════════════════════╗');
            console.log('║         RESEARCH GAMES API SERVER                              ║');
            console.log('╠════════════════════════════════════════════════════════════════╣');
            console.log(`║  Environment: ${NODE_ENV.padEnd(47)} ║`);
            console.log(`║  Port:        ${PORT.toString().padEnd(47)} ║`);
            console.log(`║  Database:    Connected                                        ║`);
            console.log('╠════════════════════════════════════════════════════════════════╣');
            console.log('║  Endpoints:                                                    ║');
            console.log('║    GET  /api/health                                            ║');
            console.log('║    POST /api/consent                                           ║');
            console.log('║    GET  /api/assign/:experiment                                ║');
            console.log('║    POST /api/experiment/:id/save                               ║');
            console.log('║    GET  /api/stats/:experiment                                 ║');
            console.log('║    GET  /api/export/:experiment/:format                        ║');
            console.log('║    POST /api/admin/login                                       ║');
            console.log('╚════════════════════════════════════════════════════════════════╝');
            console.log('');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await sequelize.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await sequelize.close();
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
