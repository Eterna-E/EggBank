'use strict';

module.exports = {

  up: async (queryInterface, Sequelize) => {
    const { INTEGER, DATE, STRING } = Sequelize;
    await queryInterface.createTable('transactions', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      user: STRING(30),
      deposit: INTEGER,
      withdraw: INTEGER,
      date: {
        allowNull: false,
        type: DATE, 
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
    });
  },
  // 在执行数据库降级时调用的函数，删除 users 表
  down: async (queryInterface) => {
    await queryInterface.dropTable('transactions');
  },
};