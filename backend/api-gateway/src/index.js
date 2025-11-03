/**
 * API Gateway for NIC Validation System
 * Main entry point for all client requests
 * Handles routing to appropriate microservices
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const { sequelize } = require('../../shared/config/database');
const RevokedToken = require('../../shared/models/RevokedToken')(sequelize);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('combined')); // HTTP request logger

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Helpers
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
let dbInitialized = false;

const initializeDatabase = async () => {
  if (dbInitialized) {
    return;
  }

  try {
    await sequelize.sync();
    dbInitialized = true;
    logger.info('API Gateway database synchronized');
  } catch (error) {
    logger.error(`API Gateway database sync failed: ${error.message}`);
    throw error;
  }
};

// JWT verification middleware
const verifyToken = async (req, res, next) => {
  // Skip token verification for auth routes and OPTIONS requests
  if (
    req.path.startsWith('/api/auth') ||
    req.path === '/api/health' ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    await initializeDatabase();
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const tokenHash = hashToken(token);

    const revoked = await RevokedToken.findOne({ where: { tokenHash } });
    if (revoked) {
      if (revoked.expiresAt < new Date()) {
        await revoked.destroy();
      }
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Apply JWT verification to all routes except auth
app.use(verifyToken);

// Service routes configuration
const serviceRoutes = [
  {
    path: '/api/auth',
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:8081',
    pathRewrite: { '^/api/auth': '/' }
  },
  {
    path: '/api/validate',
    target: process.env.NIC_VALIDATION_SERVICE_URL || 'http://localhost:8082',
    pathRewrite: { '^/api/validate': '/' }
  },
  {
    path: '/api/files',
    target: process.env.FILE_PROCESSING_SERVICE_URL || 'http://localhost:8083',
    pathRewrite: { '^/api/files': '/' }
  },
  {
    path: '/api/dashboard',
    target: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:8084',
    pathRewrite: { '^/api/dashboard': '/' }
  },
  {
    path: '/api/reports',
    target: process.env.REPORT_SERVICE_URL || 'http://localhost:8085',
    pathRewrite: { '^/api/reports': '/' }
  }
];

// Register proxy routes
serviceRoutes.forEach(route => {
  app.use(route.path, createProxyMiddleware({
    target: route.target,
    changeOrigin: true,
    pathRewrite: route.pathRewrite,
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('user-id', req.user.id);
        proxyReq.setHeader('user-username', req.user.username);
      }
      if (                                                                                 
        req.body &&                                                                        
        Object.keys(req.body).length &&                                                    
        req.headers['content-type']?.includes('application/json')                          
      ) {                                                                                  
        const bodyData = JSON.stringify(req.body);                                         
        proxyReq.setHeader('Content-Type', 'application/json');                            
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));                 
        proxyReq.write(bodyData);                                                          
      } 
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(500).json({ message: 'Service unavailable' });
    }
  }));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'api-gateway' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  logger.info(`API Gateway started on port ${PORT}`);
});

module.exports = app; // Export for testing
