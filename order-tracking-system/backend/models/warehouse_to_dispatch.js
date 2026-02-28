module.exports = (sequelize, DataTypes) => {
  const WarehouseToDispatch = sequelize.define(
    'WarehouseToDispatch',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      batch_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      supplier_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      item_description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name_received: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity_requested: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      quantity_sent: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: 'warehouse_to_dispatch',
      timestamps: true,
    }
  );

  return WarehouseToDispatch;
};
