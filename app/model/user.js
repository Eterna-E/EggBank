'use strict';

module.exports = (app) => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const User = app.model.define('user', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    name: STRING(30),
    password: STRING(30),
    createdAt: {
      field: 'created_at',
      allowNull: false,
      type: DATE, 
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      field: 'updated_at',
      allowNull: false,
      type: DATE, 
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP')
    },
  });

  return User;
};