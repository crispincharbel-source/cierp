const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import models
const User = require('./user')(sequelize, DataTypes);
const Role = require('./role')(sequelize, DataTypes);
const Cutting = require('./cutting')(sequelize, DataTypes);
const Lamination = require('./lamination')(sequelize, DataTypes);
const Printing = require('./printing')(sequelize, DataTypes);
const WarehouseToDispatch = require('./warehouse_to_dispatch')(sequelize, DataTypes);
const DispatchToProduction = require('./dispatch_to_production')(sequelize, DataTypes);
const Extruder = require('./extruder')(sequelize, DataTypes);
const RawSlitting = require('./raw_slitting')(sequelize, DataTypes);
const PVC = require('./pvc')(sequelize, DataTypes);
const Slitting = require('./slitting')(sequelize, DataTypes);
const Ink = require('./ink')(sequelize, DataTypes);
const Solvent = require('./solvent')(sequelize, DataTypes);
const Complex = require('./complex')(sequelize, DataTypes);
const AdminSettings = require('./admin_settings')(sequelize, DataTypes);

// Establish relationships
User.belongsTo(Role, { foreignKey: 'id_role' });
Role.hasMany(User, { foreignKey: 'id_role' });

const models = {
  User,
  Role,
  Cutting,
  Lamination,
  Printing,
  WarehouseToDispatch,
  DispatchToProduction,
  Extruder,
  RawSlitting,
  PVC,
  Slitting,
  Ink,
  Solvent,
  Complex,
  AdminSettings,
  sequelize,
};

// Export models and sequelize instance
module.exports = models;
