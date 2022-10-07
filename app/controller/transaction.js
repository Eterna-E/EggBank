'use strict';

const Controller = require('egg').Controller;

function toInt(str) {
  if (typeof str === 'number') return str;
  if (!str) return str;
  return parseInt(str, 10) || 0;
}

class TransactionController extends Controller {
  async index() { // 交易紀錄
    const { ctx, app } = this;
    // const username = ctx.session.username;
    const username = 'root';
    const redis = app.redis;
    const userTransactionsAll = username + ':TransactionsAll';
    const transactionName = username + ':Transactions:'
    
    let transactionIdList = await redis.lrange(userTransactionsAll, 0, 99);
    //   1~100 0 1+0*100 100+0*100
    // 101~200 1 1+1*100 100+1*100
    // 0 12345
    // 1 23456
    let transactionsList = await ctx.service.transaction.getList(transactionName, transactionIdList)

    await ctx.render('transaction.njk', { transactions: transactionsList, page: 1 });
  }

  async show(){
    const { ctx, app } = this;
    // const username = ctx.session.username;
    let page = toInt(ctx.params.id);
    if (!page) {
      page = 1;
    }
    const username = 'root';
    const redis = app.redis;
    const userTransactionsAll = username + ':TransactionsAll';
    const transactionName = username + ':Transactions:'
    const offset =  (page - 1) * 100;
    let transactionIdList = await redis.lrange(userTransactionsAll, 0 + offset, 99 + offset);
    //   1~100 0 1+0*100 100+0*100
    // 101~200 1 1+1*100 100+1*100
    // 0 12345
    // 1 23456
    let transactionsList = await ctx.service.transaction.getList(transactionName, transactionIdList)

    await ctx.render('transaction.njk', { transactions: transactionsList, page: page });
    // ctx.body = {
    //   name: `hello ${ctx.params.id}`,
    // };
  }

  async create() {
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const username = 'root';
    // const username = ctx.session.username

    const balance = await ctx.service.transaction.balance(username);
    if (! balance) return;
    await ctx.service.transaction.insertOne(username, balance);

    ctx.redirect('/users');
  }

  async operate() {
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const username = ctx.session.username;
    const operate = body.operate;
    const redis = app.redis;
    const userBalanceRedis = username + 'Balance';
    let money;

    let userBalance = await redis.get(userBalanceRedis);
    if (userBalance){
      money = userBalance;
    }
    else{
      userBalance = await ctx.model.Transaction.findOne({ 
        where: { user: username },
        order: [[ 'id', 'DESC' ]],
      });
      money = userBalance.balance;
      await redis.set(userBalanceRedis, money);
      // await redis.expire(userBalanceRedis, 3);
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
