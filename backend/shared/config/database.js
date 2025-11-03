/**
 * Database configuration for the NIC Validation System
 * This file provides Sequelize configuration to be used across all microservices
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env (fallback to default resolution)
dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

// Create Sequelize instance with environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME || 'nic_validation_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};
