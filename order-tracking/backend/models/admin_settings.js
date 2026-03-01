module.exports = (sequelize, DataTypes) => {
  const AdminSettings = sequelize.define(
    'AdminSettings',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      setting_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      setting_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      setting_description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_updated_by: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'email',
        },
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'admin_settings',
      timestamps: false,
    }
  );

  return AdminSettings;
};