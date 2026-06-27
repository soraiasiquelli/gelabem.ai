const sequelize = require('../db');

const Item = require('./Item');
const Categoria = require('./Categoria');
const Local = require('./Local');
const Usuario = require('./Usuarios');
const ListaCompras = require('./ListaCompras');

// Categoria → Item
Categoria.hasMany(Item, { foreignKey: 'categoria_id' });
Item.belongsTo(Categoria, { foreignKey: 'categoria_id' });

// Local → Item
Local.hasMany(Item, { foreignKey: 'local_id' });
Item.belongsTo(Local, { foreignKey: 'local_id' });

// 👇 NOVO: Usuario → Local
Usuario.hasMany(Local, { foreignKey: 'usuario_id' });
Local.belongsTo(Usuario, { foreignKey: 'usuario_id' });

// 👇 NOVO: Usuario → Item (importante pra segurança)
Usuario.hasMany(Item, { foreignKey: 'usuario_id' });
Item.belongsTo(Usuario, { foreignKey: 'usuario_id' });

// Usuario → ListaCompras
Usuario.hasMany(ListaCompras, { foreignKey: 'usuario_id' });
ListaCompras.belongsTo(Usuario, { foreignKey: 'usuario_id' });

module.exports = {
  sequelize,
  Item,
  Categoria,
  Local,
  Usuario,
  ListaCompras
};