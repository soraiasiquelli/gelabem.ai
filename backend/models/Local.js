const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Local = sequelize.define('Local', {
  nome: DataTypes.STRING,

  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'locais',
  timestamps: false
});

module.exports = Local;