const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const GuideProfile = require('./GuideProfile');

const Certification = sequelize.define('Certification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  guide_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
    allowNull: false
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'certifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeUpdate: (certification) => {
      certification.updated_at = new Date();
    }
  }
});

// Associations
User.hasMany(Certification, { foreignKey: 'guide_id', as: 'guideCertifications' });
User.hasMany(Certification, { foreignKey: 'admin_id', as: 'adminReviewedCertifications' });
Certification.belongsTo(User, { foreignKey: 'guide_id', as: 'guide' });
Certification.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

module.exports = Certification;
