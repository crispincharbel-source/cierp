module.exports = (sequelize, DataTypes) => {
  const DispatchToProduction = sequelize.define(
    'DispatchToProduction',
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
      date: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      item_description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      uom: {
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
      batch_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name_received: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity_returned: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      tableName: 'dispatch_to_production',
      timestamps: true,
    }
  );

  return DispatchToProduction;
};