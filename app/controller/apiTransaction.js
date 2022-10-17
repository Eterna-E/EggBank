'use strict';

const Controller = require('egg').Controller;

class ApiTransactionController extends Controller {
  async index() { // 交易紀錄查詢
    const { ctx } = this;
    const username = ctx.session.username;
    
    const transactionsList = await ctx.service.transaction.searchTransaction(username);

    ctx.body = transactionsList;
  }

  async create() { // 建立存提款交易
    const { ctx } = this;
    const username = ctx.session.username;

    const balance = await ctx.service.transaction.createTransactionNoLock(username);

    ctx.body = {
      user: username,
      balance: balance
    };
  }

  async new() {
    const { ctx } = this;
    const newestTransaction = await ctx.model.Transaction.findOne({ 
      attributes: ['id'], 
      order: [[ 'id', 'DESC' ]] 
    });
    console.log(newestTransaction.id);
  }
}

module.exports = ApiTransactionController;
