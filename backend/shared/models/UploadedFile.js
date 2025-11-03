/**
 * UploadedFile Model for NIC Validation System
 * This model stores information about uploaded CSV files for batch processing
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UploadedFile = sequelize.define('UploadedFile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    totalRecords: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    validRecords: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    invalidRecords: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['status']
      }
    ]
  });

  // Define associations in the index.js file where models are imported
  
  return UploadedFile;
};