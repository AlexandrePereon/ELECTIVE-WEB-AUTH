const Sequelize = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      first_name: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      last_name: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      email: {
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.STRING,
      },
      password: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      restaurant: {
        allowNull: true,
        type: Sequelize.DataTypes.STRING,
      },
      role: {
        allowNull: false,
        defaultValue: 'user',
        type: Sequelize.DataTypes.STRING,
        validate: {
          isIn: [['user', 'restaurant', 'deliveryman', 'developer', 'marketing', 'technical']],
        },
      },
      partner_code: {
        allowNull: true,
        type: Sequelize.DataTypes.STRING,
      },
      partner_id: {
        allowNull: true,
        type: Sequelize.DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      last_login: {
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      refreshToken: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'refresh_token',
      },
      isBlocked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_blocked',
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  },
};
