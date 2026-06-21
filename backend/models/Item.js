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
  }
}, {
  tableName: 'itens',
  timestamps: false
});

module.exports = Item;