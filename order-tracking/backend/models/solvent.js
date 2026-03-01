module.exports = (sequelize, DataTypes) => {
  const Solvent = sequelize.define(
    'Solvent',
    {
      code_number: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      supplier: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      product: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pal_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      batch_palet_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date: {
        type: DataTypes.STRING,
        allowNull: false,

      },
      is_finished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'solvent',
      timestamps: false,
    }
  );

  return Solvent;
};