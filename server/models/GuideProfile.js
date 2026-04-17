const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const GuideProfile = sequelize.define('GuideProfile', {
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
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specializations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  is_certified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  certification_status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING'
  },
  avg_rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  total_reviews: {
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
  tableName: 'guide_profiles',
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
User.hasOne(GuideProfile, { foreignKey: 'user_id', as: 'guideProfile' });
GuideProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = GuideProfile;
