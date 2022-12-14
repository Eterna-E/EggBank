'use strict';

module.exports = (app) => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const Transactions = app.model.define('transactions', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    user: STRING(30),
    deposit: INTEGER,
    withdraw: INTEGER,
    balance: INTEGER,
    date: {
      allowNull: false,
      type: DATE, 
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP')
    },
  }, {
    tableName: 'transactions',
    timestamps: false
  });

  return Transactions;
};