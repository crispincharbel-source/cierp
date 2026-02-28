module.exports = (sequelize, DataTypes) => {
  const PVC = sequelize.define(
    'PVC',
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
      machine: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customer_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      operator_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      glue_number: {
        type: DataTypes.STRING,
        allowNull: true,
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
      tableName: 'pvc',
      timestamps: true,
    }
  );

  return PVC;
};