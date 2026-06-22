const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  senha: {
    type: DataTypes.STRING,
    allowNull: false
  },

  nivel: {
  type: DataTypes.ENUM('comum', 'premium', 'admin'),
  defaultValue: 'comum'
},

  usos_ia: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});


module.exports = Usuario;