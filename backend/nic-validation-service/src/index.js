/**
 * NIC Validation Service for NIC Validation System
 * Implements validation logic for Sri Lankan National Identity Card numbers
 * Supports both old format (9 digits + V/X) and new format (12 digits)
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const morgan = require('morgan');

// Import database and models
const { sequelize } = require('../../shared/config/database');
const NICRecord = require('../../shared/models/NICRecord')(sequelize);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8082;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'nic-validation-service' },
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

// Initialize database and sync models
async function initializeDatabase() {
  try {
    await sequelize.sync();
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error(`Database synchronization failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * NIC Validation Logic
 * 
 * Old Format (9 digits + V/X):
 * - Example: 923456789V or 923456789X
 * - First 2 digits: Year (92 = 1992 or 1892 depending on century logic)
 * - Next 3 digits: Day of year (001-366 for males, 501-866 for females)
 * - Last 4 digits: Serial number
 * - Last character: V or X
 * 
 * New Format (12 digits):
 * - Example: 199212345678
 * - First 4 digits: Full year (1992)
 * - Next 3 digits: Day of year (001-366 for males, 501-866 for females)
 * - Last 5 digits: Serial number
 */
const validateNIC = (nicNumber) => {
  // Result object
  const result = {
    nicNumber,
    isValid: false,
    birthday: null,
    age: null,
    gender: null,
    errorMessage: null
  };

  try {
    // Check if NIC is empty
    if (!nicNumber || nicNumber.trim() === '') {
      result.errorMessage = 'NIC number cannot be empty';
      return result;
    }

    // Remove any whitespace
    nicNumber = nicNumber.trim();
    
    let year, dayOfYear, gender;
    
    // Validate old format (9 digits + V/X)
    if (/^\d{9}[VvXx]$/.test(nicNumber)) {
      // Extract components
      const yearDigits = nicNumber.substring(0, 2);
      const dayDigits = nicNumber.substring(2, 5);
      
      // Determine century (if year > current 2-digit year, assume 1900s, else 2000s)
      const currentYear = new Date().getFullYear();
      const currentYearLastTwoDigits = currentYear % 100;
      
      // If year digits are greater than current year's last two digits, it's from previous century
      if (parseInt(yearDigits) > currentYearLastTwoDigits) {
        year = 1900 + parseInt(yearDigits);
      } else {
        year = 2000 + parseInt(yearDigits);
      }
      
      // Extract day of year and determine gender
      let dayNum = parseInt(dayDigits);
      
      if (dayNum > 500) {
        dayNum -= 500;
        gender = 'FEMALE';
      } else {
        gender = 'MALE';
      }
      
      // Validate day of year (1-366)
      if (dayNum < 1 || dayNum > 366) {
        result.errorMessage = 'Invalid day of year in NIC';
        return result;
      }
      
      dayOfYear = dayNum;
    }
    // Validate new format (12 digits)
    else if (/^\d{12}$/.test(nicNumber)) {
      // Extract components
      year = parseInt(nicNumber.substring(0, 4));
      const dayDigits = nicNumber.substring(4, 7);
      
      // Extract day of year and determine gender
      let dayNum = parseInt(dayDigits);
      
      if (dayNum > 500) {
        dayNum -= 500;
        gender = 'FEMALE';
      } else {
        gender = 'MALE';
      }
      
      // Validate day of year (1-366)
      if (dayNum < 1 || dayNum > 366) {
        result.errorMessage = 'Invalid day of year in NIC';
        return result;
      }
      
      dayOfYear = dayNum;
    } else {
      result.errorMessage = 'Invalid NIC format';
      return result;
    }
    
    // Calculate birthday from year and day of year
    const birthday = new Date(year, 0); // January 1st of the year
    birthday.setDate(dayOfYear); // Add days
    
    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    
    // Adjust age if birthday hasn't occurred yet this year
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    
    // Set result values
    result.isValid = true;
    result.birthday = birthday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    result.age = age;
    result.gender = gender;
    
    return result;
  } catch (error) {
    result.errorMessage = `Validation error: ${error.message}`;
    return result;
  }
};

// Validation middleware
const validateNICInput = [
  body('nicNumber').notEmpty().withMessage('NIC number is required')
];

const validateBatchInput = [
  body('nicNumbers').isArray().withMessage('NIC numbers must be an array'),
  body('nicNumbers.*').notEmpty().withMessage('NIC numbers cannot be empty')
];

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'nic-validation-service' });
});

// Validate single NIC
app.post('/single', validateNICInput, (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nicNumber } = req.body;
  
  try {
    const result = validateNIC(nicNumber);
    logger.info(`Validated NIC: ${nicNumber}, isValid: ${result.isValid}`);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error validating NIC: ${error.message}`);
    res.status(500).json({ message: 'Error validating NIC' });
  }
});

// Validate batch of NICs
app.post('/batch', validateBatchInput, (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nicNumbers } = req.body;
  
  try {
    const results = nicNumbers.map(nic => validateNIC(nic));
    
    // Calculate summary
    const validCount = results.filter(result => result.isValid).length;
    const invalidCount = results.length - validCount;
    
    logger.info(`Batch validation: ${results.length} NICs processed, ${validCount} valid, ${invalidCount} invalid`);
    
    res.status(200).json({
      results,
      summary: {
        total: results.length,
        valid: validCount,
        invalid: invalidCount
      }
    });
  } catch (error) {
    logger.error(`Error in batch validation: ${error.message}`);
    res.status(500).json({ message: 'Error processing batch validation' });
  }
});

// Get supported NIC formats
app.get('/formats', (req, res) => {
  res.status(200).json({
    formats: [
      {
        name: 'Old Format',
        pattern: '9 digits + V/X',
        example: '923456789V',
        description: 'First 2 digits: Year, Next 3 digits: Day of year (001-366 for males, 501-866 for females), Last 4 digits: Serial number, Last character: V or X'
      },
      {
        name: 'New Format',
        pattern: '12 digits',
        example: '199212345678',
        description: 'First 4 digits: Full year, Next 3 digits: Day of year (001-366 for males, 501-866 for females), Last 5 digits: Serial number'
      }
    ]
  });
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`NIC Validation Service running on port ${PORT}`);
    logger.info(`NIC Validation Service started on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

module.exports = {
  app,
  validateNIC // Export for testing
};