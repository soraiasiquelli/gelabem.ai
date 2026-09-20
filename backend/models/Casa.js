const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// Uma "casa" agrupa usuários que compartilham a mesma cozinha (itens, locais e lista de compras).
// O índice único do código é declarado em `indexes` (e não com `unique: true` na coluna)
// porque o sync({ alter: true }) recria unique de coluna a cada restart.
const Casa = sequelize.define('Casa', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },

  codigo: {
    type: DataTypes.STRING(8),
    allowNull: false
  },

  dono_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'casas',
  indexes: [{ unique: true, fields: ['codigo'], name: 'casas_codigo_unico' }]
});

module.exports = Casa;
