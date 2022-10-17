'use strict';

const sd = require('silly-datetime');
const fs = require('fs');
const { toInt } = require('../utils/utils')

const Service = require('egg').Service;

class TransactionService extends Service {
  async searchTransaction(username){
    const redis = this.app.redis;
    const userTransactions = username + ':Transactions';
    let transactionsList = await redis.lrange(userTransactions, 0, 99);
    let transactions = [];

    if (! transactionsList.length) { // transactionList 不存在
      await this.dataSyncMysqlToRedis(username); // Mysql to Redis 資料同步
      transactionsList = await redis.lrange(userTransactions, 0, 99);
    }
    for (let i in transactionsList){
      await transactions.push(JSON.parse(transactionsList[i]))
    }

    return transactions;
  }

  async createTransactionNoLock(username){ //建立存提款交易-採用Lua腳本
    const redis = this.app.redis;
    const userTransactions = username + ':Transactions';
    const transactionList = await redis.llen(userTransactions);

    if (! transactionList) { // transactionList 不存在
      await this.dataSyncMysqlToRedis(username); // Mysql to Redis 資料同步
    }
    const balance = await this.insertTransactionByLua(username, userTransactions); //寫入 1 筆交易紀錄到 redis 

    return balance;
  }

  async insertTransactionByLua(username, userTransactions) { //寫入 1 筆交易紀錄到 redis 
    const { ctx } = this;
    const { request: { body } } = ctx;
    const redis = this.app.redis;
    const operate = body.operate;
    const newestId = "newest:TransactionId";
    const userBalance = username + ":Balance";
    const money = toInt(await redis.get(userBalance));
    let amount = toInt(body.amount);
    if (operate === 'withdraw' && amount > money) {
      await ctx.render('money.njk', {
        operateName: (operate === 'deposit') ? '存款' : "提款",
        money: money,
        operate: operate,
        btnName: (operate === 'deposit') ? '存入' : "提領",
        amountError: "提領金額不可大於可用餘額"
      });

      return;
    }

    if (operate === 'withdraw') { 
      amount = amount * -1; 
    }
    const redisLuaScript = fs.readFileSync('app/service/transaction.lua');
    redis.defineCommand("createTransaction", { numberOfKeys: 2, lua: redisLuaScript });
    const result = await redis.createTransaction(newestId, userBalance, amount);
    const balance = result[1];
    const data = JSON.stringify({
      id: result[0],
      user: username,
      deposit: (operate === 'deposit') ? amount : 0,
      withdraw: (operate === 'withdraw') ? amount : 0,
      balance: balance,
      date: sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    });
    await redis.lpush(userTransactions, data);
    await redis.rpush("Transactions:Temp", data);
    
    return balance;
  }

  async dataSyncMysqlToRedis(username){
    const { ctx } = this;
    const redis = this.app.redis;
    const expireTime = 3600;
    const userBalance = username + ":Balance";
    const userTransactions = username + ':Transactions';
    const newest = await ctx.model.Transaction.findOne({ 
      attributes: ['id'], 
      order: [[ 'id', 'DESC' ]] 
    });
    const newestId = newest.id;
    await redis.setex("newest:TransactionId", expireTime, newestId);

    const transactionList = await this.getAllTransactions(username, 100000); // 查詢 mysql 10萬筆交易資料
    
    await redis.setex(userBalance, expireTime, transactionList[0].balance);
    for (let i in transactionList){ // 同步資料到 redis
      await redis.rpush(userTransactions, JSON.stringify(transactionList[i]));
    }

    await redis.expire(userTransactions, expireTime);
  }

  async getAllTransactions(username, limit) {
    const { ctx } = this;
    if (limit) {
      return await ctx.model.Transaction.findAll({
        raw: true,
        limit: limit,
        where: {
          user: username
        },
        order: [[ 'id', 'DESC' ]]
      });
    }

    return await ctx.model.Transaction.findAll({
      raw: true,
      where: {
        user: username
      },
      order: [[ 'id', 'DESC' ]]
    });
  }

  async getList(transactionIdList) {
    const { app } = this;
    const redis = app.redis;
    const transactionName = 'Transactions:'; // 單筆交易紀錄的 hash key 前綴
    let transactionsList = [];
    for (let i in transactionIdList) {
      const transaction = await redis.hgetall(transactionName + transactionIdList[i]);
      transactionsList.push(transaction);
    }

    return transactionsList;
  }

}

module.exports = TransactionService;