/**
 * Report Model for NIC Validation System
 * This model stores information about generated reports in various formats
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reportType: {
      type: DataTypes.ENUM('PDF', 'CSV', 'EXCEL'),
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    filePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    generatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('generating', 'completed', 'failed'),
      defaultValue: 'generating'
    },
    generatedBy: {
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
        fields: ['generatedBy']
      },
      {
        fields: ['reportType']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Report;
};