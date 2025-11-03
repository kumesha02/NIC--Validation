/**
 * Dashboard Service for NIC Validation System
 * Provides statistics and analytics for the NIC validation system
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');
const winston = require('winston');
const morgan = require('morgan');
const NodeCache = require('node-cache');

// Import database and models
const { sequelize } = require('../../shared/config/database');
const NICRecord = require('../../shared/models/NICRecord')(sequelize);
const UploadedFile = require('../../shared/models/UploadedFile')(sequelize);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8084;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'dashboard-service' },
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

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 }); // 300 seconds = 5 minutes

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Initialize database and sync models
async function initializeDatabase() {
  try {
    // Define associations
    UploadedFile.hasMany(NICRecord, { foreignKey: 'fileId', onDelete: 'CASCADE' });
    NICRecord.belongsTo(UploadedFile, { foreignKey: 'fileId' });
    
    await sequelize.sync();
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error(`Database synchronization failed: ${error.message}`);
    process.exit(1);
  }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'dashboard-service' });
});

// Get overall statistics
app.get('/summary', async (req, res) => {
  try {
    // Check if data is in cache
    const cacheKey = 'dashboard_summary';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached dashboard summary');
      return res.status(200).json(cachedData);
    }
    
    // Get total records count
    const totalRecords = await NICRecord.count();
    
    // Get male count
    const maleCount = await NICRecord.count({
      where: { gender: 'MALE' }
    });
    
    // Get female count
    const femaleCount = await NICRecord.count({
      where: { gender: 'FEMALE' }
    });
    
    // Get valid vs invalid records
    const validRecords = await NICRecord.count({
      where: { isValid: true }
    });
    
    const invalidRecords = await NICRecord.count({
      where: { isValid: false }
    });
    
    // Get files processed count
    const filesProcessed = await UploadedFile.count();
    
    // Get completed files count
    const completedFiles = await UploadedFile.count({
      where: { status: 'completed' }
    });
    
    // Get failed files count
    const failedFiles = await UploadedFile.count({
      where: { status: 'failed' }
    });
    
    // Create summary object
    const summary = {
      totalRecords,
      genderDistribution: {
        male: maleCount,
        female: femaleCount
      },
      validationStatus: {
        valid: validRecords,
        invalid: invalidRecords,
        validPercentage: totalRecords > 0 ? (validRecords / totalRecords * 100).toFixed(2) : 0
      },
      filesProcessed,
      fileStatus: {
        completed: completedFiles,
        failed: failedFiles,
        processing: filesProcessed - completedFiles - failedFiles
      }
    };
    
    // Store in cache
    cache.set(cacheKey, summary);
    
    logger.info('Dashboard summary generated');
    res.status(200).json(summary);
  } catch (error) {
    logger.error(`Error generating summary: ${error.message}`);
    res.status(500).json({ message: 'Error generating summary' });
  }
});

// Get data for charts
app.get('/charts', async (req, res) => {
  try {
    // Check if data is in cache
    const cacheKey = 'dashboard_charts';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached chart data');
      return res.status(200).json(cachedData);
    }
    
    // Gender distribution for pie chart
    const genderDistribution = [
      { name: 'Male', value: await NICRecord.count({ where: { gender: 'MALE' } }) },
      { name: 'Female', value: await NICRecord.count({ where: { gender: 'FEMALE' } }) }
    ];
    
    // Age distribution by ranges for bar chart
    const ageRanges = [
      { range: '0-18', min: 0, max: 18 },
      { range: '19-30', min: 19, max: 30 },
      { range: '31-50', min: 31, max: 50 },
      { range: '51-70', min: 51, max: 70 },
      { range: '70+', min: 71, max: 200 }
    ];
    
    const ageDistribution = await Promise.all(ageRanges.map(async ({ range, min, max }) => {
      const count = await NICRecord.count({
        where: {
          age: {
            [Sequelize.Op.between]: [min, max]
          }
        }
      });
      
      return { range, count };
    }));
    
    // Records per file for bar chart
    const files = await UploadedFile.findAll({
      attributes: ['id', 'originalName', 'totalRecords', 'validRecords', 'invalidRecords'],
      where: { status: 'completed' },
      limit: 10,
      order: [['uploadedAt', 'DESC']]
    });
    
    const recordsPerFile = files.map(file => ({
      fileName: file.originalName,
      total: file.totalRecords,
      valid: file.validRecords,
      invalid: file.invalidRecords
    }));
    
    // Create charts object
    const charts = {
      genderDistribution,
      ageDistribution,
      recordsPerFile
    };
    
    // Store in cache
    cache.set(cacheKey, charts);
    
    logger.info('Chart data generated');
    res.status(200).json(charts);
  } catch (error) {
    logger.error(`Error generating chart data: ${error.message}`);
    res.status(500).json({ message: 'Error generating chart data' });
  }
});

// Get recent uploads
app.get('/recent-uploads', async (req, res) => {
  try {
    // Check if data is in cache
    const cacheKey = 'recent_uploads';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached recent uploads');
      return res.status(200).json(cachedData);
    }
    
    // Get last 10 uploaded files
    const recentUploads = await UploadedFile.findAll({
      attributes: [
        'id', 
        'originalName', 
        'totalRecords', 
        'validRecords', 
        'invalidRecords', 
        'uploadedAt', 
        'status', 
        'uploadedBy'
      ],
      limit: 10,
      order: [['uploadedAt', 'DESC']]
    });
    
    // Store in cache
    cache.set(cacheKey, recentUploads);
    
    logger.info('Recent uploads fetched');
    res.status(200).json(recentUploads);
  } catch (error) {
    logger.error(`Error fetching recent uploads: ${error.message}`);
    res.status(500).json({ message: 'Error fetching recent uploads' });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`Dashboard Service running on port ${PORT}`);
    logger.info(`Dashboard Service started on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

module.exports = app; // Export for testing