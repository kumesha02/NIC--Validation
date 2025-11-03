/**
 * RevokedToken Model for NIC Validation System
 * Stores hashes of JWTs that have been explicitly revoked (e.g. logout)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  if (sequelize.models.RevokedToken) {
    return sequelize.models.RevokedToken;
  }

  const RevokedToken = sequelize.define('RevokedToken', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    tokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['tokenHash']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });

  return RevokedToken;
};
