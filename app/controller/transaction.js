'use strict';

const Controller = require('egg').Controller;

const { toInt } = require('../utils/utils');

class TransactionController extends Controller {
  async index() { // 交易紀錄
    const { ctx } = this;
    const username = ctx.session.username;
    
    const transactionsList = await ctx.service.transaction.searchTransaction(username);

    await ctx.render('transaction.njk', { transactions: transactionsList, page: 1 });
  }

  async show() {
    const { ctx, app } = this;
    const username = ctx.session.username;
    const redis = app.redis;
    const userTransactions = username + ':Transactions';
    let transactions = [];
    let page = toInt(ctx.params.id);
    if (!page) { 
      page = 1; 
    }
    const offset =  (page - 1) * 100;
    let transactionsLen = await redis.llen(userTransactions);
    let transactionsList = await redis.lrange(userTransactions, 0 + offset, 99 + offset);
    if (!transactionsLen) { // transactionList 不存在
      await ctx.service.transaction.syncDataMysqlToRedis(username); // Mysql to Redis 資料同步
      transactionsList = await redis.lrange(userTransactions, 0 + offset, 99 + offset);
    }
    for (let i in transactionsList) {
      await transactions.push(JSON.parse(transactionsList[i]));
    }
    
    await ctx.render('transaction.njk', { transactions: transactions, page: page });
  }

  async create() {
    const { ctx } = this;
    const body = ctx.request.body;
    const username = ctx.session.username;
    const operate = body.operate;
    const redis = this.app.redis;
    const userBalance = username + ":Balance";
    const money = toInt(await redis.get(userBalance));

    try {
      await ctx.service.transaction.createTransaction(username);
    } catch (amountError) {
      await ctx.render('money.njk', {
        operateName: (operate === 'deposit') ? '存款' : "提款",
        money: money,
        operate: operate,
        btnName: (operate === 'deposit') ? '存入' : "提領",
        amountError: amountError
      });

      return;
    }

    ctx.redirect('/users');
  }

  async operate() {
    const { ctx, app } = this;
    const body = ctx.request.body;
    const username = ctx.session.username;
    const operate = body.operate;
    const redis = app.redis;
    const userBalanceRedis = username + ':Balance';
    let money;

    let userBalance = await redis.get(userBalanceRedis);
    if (userBalance) {
      money = userBalance;
    } else {
      userBalance = await ctx.model.Transaction.findOne({ 
        where: { user: username },
        order: [[ 'id', 'DESC' ]],
      });
      money = userBalance.balance;
      await redis.set(userBalanceRedis, money);
    }

    await ctx.render('money.njk', {
      operateName: (operate === 'deposit') ? '存款' : "提款",
      money: money,
      operate: operate,
      btnName: (operate === 'deposit') ? '存入' : "提領",
    });
  }
}

module.exports = TransactionController;
