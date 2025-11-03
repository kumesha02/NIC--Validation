/**
 * File Processing Service for NIC Validation System
 * Handles CSV file uploads and batch processing of NIC numbers
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const Papa = require('papaparse');
const axios = require('axios');
const { Op } = require('sequelize');
const { body, param, validationResult } = require('express-validator');
const winston = require('winston');
const morgan = require('morgan');

// Import database and models
const { sequelize } = require('../../shared/config/database');
const UploadedFile = require('../../shared/models/UploadedFile')(sequelize);
const NICRecord = require('../../shared/models/NICRecord')(sequelize);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8083;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'file-processing-service' },
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to accept only CSV files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 4 // Maximum 4 files
  }
});

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

// Validation middleware
const validateFileId = [
  param('id').isInt().withMessage('File ID must be an integer')
];

const validatePagination = [
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Process CSV file and validate NIC numbers
async function processCSVFile(file, userId) {
  try {
    // Create file record in database
    const uploadedFile = await UploadedFile.create({
      fileName: file.filename,
      originalName: file.originalname,
      uploadedBy: userId,
      status: 'processing'
    });

    // Read file content
    const fileContent = await fs.readFile(file.path, 'utf8');
    
    // Parse CSV
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data, errors } = results;
          
          // Check if CSV has required headers
          const firstRow = data[0];
          const hasNICColumn = firstRow && (firstRow.NIC || firstRow.NIC_Number);
          
          if (!hasNICColumn) {
            await uploadedFile.update({
              status: 'failed',
              totalRecords: 0,
              validRecords: 0,
              invalidRecords: 0
            });
            logger.error(`File ${file.filename} has invalid format: missing NIC column`);
            return;
          }
          
          // Update total records count
          await uploadedFile.update({
            totalRecords: data.length
          });
          
          // Process in batches of 1000 to avoid memory issues
          const batchSize = 1000;
          let validCount = 0;
          let invalidCount = 0;
          
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            // Extract NIC numbers from batch
            const nicNumbers = batch.map(row => row.NIC || row.NIC_Number);
            
            // Call NIC validation service
            const validationResponse = await axios.post(
              `${process.env.NIC_VALIDATION_SERVICE_URL || 'http://localhost:8082'}/batch`,
              { nicNumbers },
              { headers: { 'Content-Type': 'application/json' } }
            );
            
            const validationResults = validationResponse.data.results;
            
            // Create NIC records in database
            const nicRecords = validationResults.map(result => ({
              nicNumber: result.nicNumber,
              birthday: result.birthday,
              age: result.age,
              gender: result.gender,
              isValid: result.isValid,
              validationError: result.errorMessage,
              fileId: uploadedFile.id
            }));
            
            await NICRecord.bulkCreate(nicRecords);
            
            // Update counts
            validCount += validationResults.filter(r => r.isValid).length;
            invalidCount += validationResults.filter(r => !r.isValid).length;
            
            // Update file record with progress
            await uploadedFile.update({
              validRecords: validCount,
              invalidRecords: invalidCount
            });
          }
          
          // Mark file as completed
          await uploadedFile.update({
            status: 'completed'
          });
          
          logger.info(`File ${file.filename} processed successfully: ${validCount} valid, ${invalidCount} invalid`);
        } catch (error) {
          logger.error(`Error processing file ${file.filename}: ${error.message}`);
          await uploadedFile.update({
            status: 'failed'
          });
        }
      },
      error: async (error) => {
        logger.error(`Error parsing CSV file ${file.filename}: ${error.message}`);
        await uploadedFile.update({
          status: 'failed'
        });
      }
    });
    
    return uploadedFile.id;
  } catch (error) {
    logger.error(`Error processing file ${file.filename}: ${error.message}`);
    throw error;
  }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'file-processing-service' });
});

// Upload CSV files
app.post('/upload', upload.array('files', 4), async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    if (req.files.length !== 4) {
      await Promise.all(req.files.map(async (file) => {
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          logger.warn(`Failed to remove file ${file.path} during validation cleanup: ${cleanupError.message}`);
        }
      }));
      return res.status(400).json({ message: 'Exactly 4 CSV files must be uploaded' });
    }
    
    // Check if user ID is provided
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Process each file asynchronously
    const filePromises = req.files.map(file => processCSVFile(file, userId));
    const fileIds = await Promise.all(filePromises);
    
    logger.info(`${req.files.length} files uploaded by user ${userId}`);
    res.status(200).json({
      message: `${req.files.length} files uploaded successfully`,
      fileIds
    });
  } catch (error) {
    logger.error(`File upload error: ${error.message}`);
    res.status(500).json({ message: 'Error uploading files' });
  }
});

// Get all uploaded files for a user
app.get('/list', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const files = await UploadedFile.findAll({
      where: { uploadedBy: userId },
      order: [['uploadedAt', 'DESC']]
    });
    
    res.status(200).json(files);
  } catch (error) {
    logger.error(`Error fetching files: ${error.message}`);
    res.status(500).json({ message: 'Error fetching files' });
  }
});

// Get specific file details
app.get('/:id', validateFileId, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const fileId = req.params.id;
    const userId = req.headers['user-id'];
    
    const file = await UploadedFile.findOne({
      where: { id: fileId, uploadedBy: userId }
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.status(200).json(file);
  } catch (error) {
    logger.error(`Error fetching file: ${error.message}`);
    res.status(500).json({ message: 'Error fetching file' });
  }
});

// Delete file and associated records
app.delete('/:id', validateFileId, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const fileId = req.params.id;
    const userId = req.headers['user-id'];
    
    const file = await UploadedFile.findOne({
      where: { id: fileId, uploadedBy: userId }
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Delete physical file if it exists
    const filePath = path.join(uploadsDir, file.fileName);
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
    }
    
    // Delete from database (will cascade delete NICRecords)
    await file.destroy();
    
    logger.info(`File ${fileId} deleted by user ${userId}`);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting file: ${error.message}`);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

// Get all NIC records for a file with pagination
app.get('/:id/records', validateFileId, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const fileId = req.params.id;
    const userId = req.headers['user-id'];
    
    // Check if file exists and belongs to user
    const file = await UploadedFile.findOne({
      where: { id: fileId, uploadedBy: userId }
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Pagination and filtering parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search ? req.query.search.trim() : '';
    const sortableFields = ['id', 'nicNumber', 'isValid', 'gender', 'age', 'birthday', 'processedAt'];
    const sortBy = sortableFields.includes(req.query.sortBy) ? req.query.sortBy : 'id';
    const sortOrder = req.query.sortOrder && req.query.sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    const whereClause = { fileId };
    if (searchTerm) {
      whereClause.nicNumber = {
        [Op.like]: `%${searchTerm}%`
      };
    }
    
    // Get records with pagination
    const { count, rows } = await NICRecord.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[sortBy, sortOrder]]
    });
    
    res.status(200).json({
      records: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
        sortBy,
        sortOrder,
        search: searchTerm
      }
    });
  } catch (error) {
    logger.error(`Error fetching records: ${error.message}`);
    res.status(500).json({ message: 'Error fetching records' });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`File Processing Service running on port ${PORT}`);
    logger.info(`File Processing Service started on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

module.exports = app; // Export for testing
