const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const TravelerProfile = sequelize.define('TravelerProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    unique: true
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  total_bookings: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'traveler_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeUpdate: (profile) => {
      profile.updated_at = new Date();
    }
  }
});

// Association
User.hasOne(TravelerProfile, { foreignKey: 'user_id', as: 'travelerProfile' });
TravelerProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = TravelerProfile;
