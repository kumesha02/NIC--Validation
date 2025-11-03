/**
 * Authentication Service for NIC Validation System
 * Handles user registration, login, JWT token generation, and password reset
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { Op } = require('sequelize');

// Import database and models
const { sequelize } = require('../../shared/config/database');
const User = require('../../shared/models/User')(sequelize);
const RevokedToken = require('../../shared/models/RevokedToken')(sequelize);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8081;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
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

// Store for password reset tokens (in production, use Redis or database)
const passwordResetTokens = new Map();

// Helpers for token revocation
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const cleanupExpiredTokens = async () => {
  try {
    await RevokedToken.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date()
        }
      }
    });
  } catch (error) {
    logger.error(`Failed to cleanup revoked tokens: ${error.message}`);
  }
};

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASS || 'password'
  }
});

// Validation middleware
const validateRegistration = [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password')
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage('Password must be at least 8 characters and include uppercase, lowercase, and a number')
];

const validateLogin = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const validatePasswordReset = [
  body('email').isEmail().withMessage('Must be a valid email address')
];

const validateNewPassword = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage('Password must be at least 8 characters and include uppercase, lowercase, and a number')
];

// Initialize database and sync models
async function initializeDatabase() {
  try {
    await sequelize.sync();
    logger.info('Database synchronized successfully');
    await cleanupExpiredTokens();
  } catch (error) {
    logger.error(`Database synchronization failed: ${error.message}`);
    process.exit(1);
  }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

// Register new user
app.post('/register', validateRegistration, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ 
        message: 'User already exists with this username or email' 
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password // Password will be hashed by the model hook
    });

    // Remove password from response
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    };

    logger.info(`User registered: ${username}`);
    res.status(201).json({ 
      message: 'User registered successfully',
      user: userResponse
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login user
app.post('/login', validateLogin, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Find user by username
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${username}`);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Logout (revoke token)
app.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const tokenHash = hashToken(token);

    await RevokedToken.findOrCreate({
      where: { tokenHash },
      defaults: { expiresAt: new Date(decoded.exp * 1000) }
    });

    logger.info(`Token revoked for user ID: ${decoded.id}`);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error(`Logout failed: ${error.message}`);
    res.status(400).json({ message: 'Invalid token' });
  }
});

// Forgot password - send reset email
app.post('/forgot-password', validatePasswordReset, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal that the email doesn't exist
      return res.status(200).json({ 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const tokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Store token (in production, use Redis or database)
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      expiry: tokenExpiry
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'Password Reset - NIC Validation System',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset for your NIC Validation System account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    logger.info(`Password reset requested for: ${email}`);
    res.status(200).json({ 
      message: 'If your email is registered, you will receive a password reset link' 
    });
  } catch (error) {
    logger.error(`Password reset error: ${error.message}`);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset password with token
app.post('/reset-password', validateNewPassword, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  try {
    // Check if token exists and is valid
    const tokenData = passwordResetTokens.get(token);

    if (!tokenData || tokenData.expiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Find user
    const user = await User.findByPk(tokenData.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = password; // Will be hashed by model hook
    await user.save();

    // Remove used token
    passwordResetTokens.delete(token);

    logger.info(`Password reset successful for user ID: ${user.id}`);
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error(`Password reset error: ${error.message}`);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Verify token
app.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const tokenHash = hashToken(token);

    const revoked = await RevokedToken.findOne({ where: { tokenHash } });

    if (revoked) {
      if (revoked.expiresAt < new Date()) {
        await revoked.destroy();
      }
      return res.status(401).json({ valid: false, message: 'Token has been revoked' });
    }

    res.status(200).json({ 
      valid: true, 
      user: {
        id: decoded.id,
        username: decoded.username
      }
    });
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
    logger.info(`Auth Service started on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

// Periodically purge expired revoked tokens
setInterval(() => {
  cleanupExpiredTokens().catch(err => logger.error(`Token cleanup failed: ${err.message}`));
}, 60 * 60 * 1000);

module.exports = app; // Export for testing
