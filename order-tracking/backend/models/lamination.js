module.exports = (sequelize, DataTypes) => {
  const Lamination = sequelize.define(
    'Lamination',
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
      hardner_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      complex_1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      complex_2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      complex_3: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      complex_4: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      complex_5: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      complex_6: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      glue_speed: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      machine_speed: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      meters: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      weight: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      waste: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      glue_weight: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      hardner_weight: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      tableName: 'lamination',
      timestamps: true,
    }
  );

  return Lamination;
};