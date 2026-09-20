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
  },

  // mês (YYYY-MM) a que `usos_ia` se refere; quando vira o mês o contador recomeça
  usos_ia_mes: DataTypes.STRING(7),

  // casa compartilhada (null = usa o app sozinho)
  casa_id: DataTypes.INTEGER,

  // preenchido quando a conta foi criada/vinculada pelo login com Google
  google_id: DataTypes.STRING
}, {
  tableName: 'usuarios'
});


module.exports = Usuario;