module.exports = (sequelize, DataTypes) => {
  const RawSlitting = sequelize.define(
    'RawSlitting',
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
      batch_number: {
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
      supplier: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      roll_width: {
        type: DataTypes.FLOAT,
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
      size_after_slitting: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      purpose: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      remaining_destination: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      waste: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      tableName: 'raw_slitting',
      timestamps: true,
    }
  );

  return RawSlitting;
};