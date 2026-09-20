const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Feedback = sequelize.define('Feedback', {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  tipo: {
    type: DataTypes.ENUM('ideia', 'problema', 'elogio'),
    defaultValue: 'ideia'
  },

  mensagem: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  pagina: DataTypes.STRING(120)
}, {
  tableName: 'feedbacks',
  updatedAt: false
});

module.exports = Feedback;
