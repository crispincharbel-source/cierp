module.exports = (sequelize, DataTypes) => {
  const Complex = sequelize.define(
    'Complex',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      desc: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: 'complex',
      timestamps: false,
    }
  );

  return Complex;
};