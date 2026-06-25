const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Item = sequelize.define('Item', {
  nome: DataTypes.STRING,
  quantidade: DataTypes.INTEGER,

  categoria_id: DataTypes.INTEGER,
  local_id: DataTypes.INTEGER,

  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unidade: {
    type: DataTypes.ENUM('un', 'kg', 'g', 'L', 'mL', 'cx', 'pct'),
    defaultValue: 'un'
  },
    quantidade_minima: DataTypes.INTEGER,

}, {
  tableName: 'itens',
  timestamps: false
});

module.exports = Item;