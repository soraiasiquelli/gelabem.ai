const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Categoria = sequelize.define('Categoria', {
  nome: DataTypes.STRING
}, {
  tableName: 'categorias',
  timestamps: false
});

module.exports = Categoria;