'use strict';

const sd = require('silly-datetime');
const { toInt } = require('../utils/utils')

const Controller = require('egg').Controller;

class ApiTransactionController extends Controller {
  async index() { // 交易紀錄查詢
    const { ctx, app } = this;
    // const username = ctx.session.username;
    const username = 'root';
    const redis = app.redis;
    const userTransactionsAll = username + ':TransactionsAll';
    const transactionName = username + ':Transactions:'; // 交易紀錄的 hash key 前綴
    let transactionsList;
    
    let transactionIdList = await redis.lrange(userTransactionsAll, 0, 99);

    // console.log(transactionIdList.length)
    // console.log(123)

    if (! transactionIdList.length) { // key userTransactionsAll 不存在
      const transactionAll = await ctx.service.transaction.getAllTransactions(username, 100000);
      for (let i in transactionAll){
        await redis.rpush(userTransactionsAll, transactionAll[i].id);
        await redis.hset(username + ":Transactions:" + transactionAll[i].id, transactionAll[i]);
      }
      transactionIdList = await redis.lrange(userTransactionsAll, 0, 99);
      transactionsList = await ctx.service.transaction.getList(transactionName, transactionIdList)
    }
    else{
      transactionsList = await ctx.service.transaction.getList(transactionName, transactionIdList)
    }

    
    // console.log(transactionsList);
    // console.log("transactionsList Length", transactionsList.length);
    ctx.body = transactionsList;
  }

  async new() {
    const { ctx, app } = this;
    const redis = app.redis;

    const test = await redis.setnx('test', 123);
    console.log(test);
    // let username = "root"
    // const userTransactionsTemp = username + ':TransactionsTemp';
    // const transactionName = username + ':Transactions:'; // 交易紀錄的 hash key 前綴
    // let tempListLen = await redis.llen(userTransactionsTemp);

    // // console.log(tempListLen);

    // if (tempListLen) {
    //   console.log("Has data");
    //   const transactionsTempIdList = await redis.lrange(userTransactionsTemp, 0, tempListLen);
    //   // console.log(transactionsTempIdList);
    //   const transactionsList = await ctx.service.transaction.getList(transactionName, transactionsTempIdList);
    //   // console.log(transactionsList);
    //   await ctx.model.Transaction.bulkCreate(transactionsList);
    //   await redis.ltrim(userTransactionsTemp, tempListLen + 1, -1);
    //   // ctx.body = transactionsList;
    // }
    // else{
    //   let str = "No data on Temp List !!!";
    //   // console.log(str);
    //   // ctx.body = str;
    // }
  }

  async create() { // 建立存提款交易
    const { ctx } = this;
    // const username = ctx.session.username
    const username = 'root';
    // 方式1：
    // const balance = await ctx.service.transaction.balance(username);
    // if (! balance) return;
    // await ctx.service.transaction.insertOne(username, balance);

    // 方式2：
    const balance = await ctx.service.transaction.createTransaction(username);

    ctx.body = {
      user: username,
      balance: balance
    };
  }
}

module.exports = ApiTransactionController;
