module.exports = (sequelize, DataTypes) => {
  const Extruder = sequelize.define(
    'Extruder',
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
      waste:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      operator: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      client: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      color: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      size: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      thickness: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      item_description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      meters: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      weight: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      ldpe_batch_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      enable_batch_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      exact_batch_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      white_batch_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'extruder',
      timestamps: true,
    }
  );

  return Extruder;
};