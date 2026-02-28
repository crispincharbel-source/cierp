module.exports = (sequelize, DataTypes) => {
  const Printing = sequelize.define(
    'Printing',
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
      ink_1: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      ink_2: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      ink_3: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      ink_4: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      ink_5: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      ink_6: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      ink_7: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      ink_8: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'ink',
          key: 'code_number',
        },
      },
      solvent_1: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'solvent',
          key: 'code_number',
        },
      },
      solvent_2: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'solvent',
          key: 'code_number',
        },
      },
      solvent_3: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'solvent',
          key: 'code_number',
        },
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
      speed: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      width: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      printed_meters: {
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
      number_of_colors: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      hours: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'printing',
      timestamps: true,
    }
  );

  return Printing;
};