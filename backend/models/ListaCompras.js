const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ListaCompras = sequelize.define('ListaCompras', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantidade: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  unidade: {
    type: DataTypes.ENUM('un', 'kg', 'g', 'L', 'mL', 'cx', 'pct'),
    defaultValue: 'un'
  },
  comprado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'lista_compras',
  timestamps: false
});

module.exports = ListaCompras;
