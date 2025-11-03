/**
 * NICRecord Model for NIC Validation System
 * This model stores information about validated NIC numbers and their results
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NICRecord = sequelize.define('NICRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nicNumber: {
      type: DataTypes.STRING(12),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE'),
      allowNull: true
    },
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    validationError: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    processedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'UploadedFiles',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['nicNumber']
      },
      {
        fields: ['fileId']
      },
      {
        fields: ['isValid']
      }
    ]
  });

  return NICRecord;
};