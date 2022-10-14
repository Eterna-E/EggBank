'use strict';

const sd = require('silly-datetime');
const { toInt } = require('../utils/utils')

const Controller = require('egg').Controller;

class ApiTransactionController extends Controller {
  async index() { // 交易紀錄查詢
    const { ctx } = this;
    // const username = ctx.session.username;
    const username = 'root';
    
    const transactionsList = await ctx.service.transaction.searchTransaction(username);

    ctx.body = transactionsList;
  }

  async new() {
    // 更新 Redis 資料到 Mysql
    const { ctx, app } = this;
    const redis = app.redis;
    const transactionsIdTempList = "Transactions:Temp";
    let tempListLen = await redis.llen(transactionsIdTempList);

    if (tempListLen) {
      console.log("Has data");
      const idList = await redis.lpop(transactionsIdTempList, tempListLen);
      console.log(idList)
      const transactionsList = await ctx.service.transaction.getList(idList);
      console.log(transactionsList)
      // await ctx.model.Transaction.bulkCreate(transactionsList);
    }
  }

  async create() { // 建立存提款交易
    const { ctx } = this;
    // const username = ctx.session.username
    const username = 'root';
    // 方式2：
    // const balance = await ctx.service.transaction.createTransaction(username);

    // 方式3:
    const balance = await ctx.service.transaction.createTransactionNoLock(username);

    ctx.body = {
      user: username,
      balance: balance
    };
  }
}

module.exports = ApiTransactionController;
