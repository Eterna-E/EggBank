'use strict';

const sd = require('silly-datetime');
const fs = require('fs');
const { toInt } = require('../utils/utils')

const Service = require('egg').Service;

class TransactionService extends Service {
  async searchTransaction(username){
    const { ctx, app } = this;
    const redis = app.redis;
    const userTransactions = username + ':TransactionsAll';
    const transactionName = 'Transactions:'; // 單筆交易紀錄的 hash key 前綴
    let transactionsList;
    let transactionIdList = await redis.lrange(userTransactions, 0, 99);

    if (! transactionIdList.length) { // key userTransactionsAll 不存在
      const transactionAll = await this.getAllTransactions(username, 100000);
      for (let i in transactionAll){
        await redis.rpush(userTransactions, transactionAll[i].id);
        await redis.hset("Transactions:" + transactionAll[i].id, transactionAll[i]);
        await redis.expire("Transactions:" + transactionAll[i].id, 3600);
      }
      await redis.expire(userTransactions, 3600);
      transactionIdList = await redis.lrange(userTransactions, 0, 99);
      transactionsList = await this.getList(transactionIdList);
    }
    else{
      transactionsList = await this.getList(transactionIdList);
    }

    return transactionsList;
  }

  async createTransactionNoLock(username){ //改善方法3：建立存提款交易-採用Lua腳本
    const { app } = this;
    const redis = app.redis;
    const userTransactions = username + ':TransactionsAll';
    const transactionList = await redis.llen(userTransactions);
    const expireTime = 3600;
    let balance;

    if (! transactionList) { // transactionList 不存在，Mysql to Redis 資料同步
      const transactionList = await this.getAllTransactions(username, 100000); // 查詢 mysql 10萬筆交易資料
      for (let i in transactionList){ // 同步資料到 redis
        await redis.rpush(userTransactions, transactionList[i].id);
        await redis.hset("Transactions:" + transactionList[i].id, transactionList[i]);
        await redis.expire("Transactions:" + transactionList[i].id, expireTime);
      }
      await redis.expire(userTransactions, expireTime);
      balance = this.insertTransactionByLua(username, userTransactions); //寫入 1 筆交易紀錄到 redis 
    }
    else{ // transactionList 存在
      balance = this.insertTransactionByLua(username, userTransactions); //寫入 1 筆交易紀錄到 redis 
    }

    return balance;
  }

  async insertTransactionByLua(username, userTransactions) { //寫入 1 筆交易紀錄到 redis 
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const redis = app.redis;
    const operate = body.operate;
    let amount = toInt(body.amount);
    if (operate === 'withdraw'){
      amount = amount * -1;
    }
    const redisLuaScript = fs.readFileSync('app/service/transaction.lua');
    redis.defineCommand("createTransaction", { numberOfKeys: 1, lua: redisLuaScript });
    const deposit = (operate === 'deposit') ? amount : 0;
    const withdraw = (operate === 'withdraw') ? amount : 0;
    const date = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
    const balance = await redis.createTransaction(
      userTransactions, // key
      amount, username, deposit, withdraw, date //argv
    );
    
    return balance;
  }

  async createTransaction(username){ //改善方法2：重寫建立存提款交易-程式架構
    const { app } = this;
    const redis = app.redis;
    const userTransactions = username + ':TransactionsAll';
    const userBalanceHandling = username + 'Balance' + "Handling";

    let lock = await redis.set(userBalanceHandling, "Handling", "EX", 1, "NX");
    while (! lock){
      lock = await redis.set(userBalanceHandling, "Handling", "EX", 1, "NX");
    }

    const transactionList = await redis.llen(userTransactions);
    let balance;
    if (! transactionList) { // transactionList 不存在，Mysql to Redis 資料同步
      const transactionList = await this.getAllTransactions(username, 100000); // 查詢 mysql 10萬筆交易資料
      for (let i in transactionList){ // 同步資料到 redis
        await redis.rpush(userTransactions, transactionList[i].id);
        await redis.hset("Transactions:" + transactionList[i].id, transactionList[i]);
        await redis.expire("Transactions:" + transactionList[i].id, 3600);
      }
      await redis.expire(userTransactions, 3600);
      balance = this.insertTransactionNew(username, userTransactions); //寫入 1 筆交易紀錄到 redis 
    }
    else{ // transactionList 存在
      balance = this.insertTransactionNew(username, userTransactions); //寫入 1 筆交易紀錄到 redis 
    }
    await redis.del(userBalanceHandling);

    return balance;
  }

  async insertTransactionNew(username, userTransactions) { //寫入 1 筆交易紀錄到 redis 
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const redis = app.redis;
    const operate = body.operate;
    const amount = toInt(body.amount);
    let newestTransactionId = await redis.lindex(userTransactions, 0);
    let transactionId = (toInt(newestTransactionId)) + 1;

    let transactionIdLock = await redis.set("transactionId:" + transactionId, "transactionId", "EX", 10, "NX");
    while (! transactionIdLock){
      transactionId = transactionId + 1;
      transactionIdLock = await redis.set("transactionId:" + transactionId, "transactionId", "EX", 10, "NX");
    }

    const transactionKey = "Transactions:" + transactionId;
    const transactionIdTempList = "Transactions:Temp";
    newestTransactionId = await redis.lindex(userTransactions, 0);
    let balance = toInt(await redis.hget("Transactions:" + newestTransactionId, "balance"));
    if (operate === 'deposit'){
      balance = balance + amount;
    }
    else{
      balance = balance - amount;
    }
    await redis.lpush(userTransactions, transactionId);
    await redis.hset(transactionKey, {
      id: transactionId,
      user: username,
      deposit: (operate === 'deposit') ? amount : 0,
      withdraw: (operate === 'withdraw') ? amount : 0,
      balance: balance,
      date: sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    });
    await redis.expire(transactionKey, 3600);
    await redis.rpush(transactionIdTempList, transactionId); // 寫入還沒同步到 mysql 的 交易紀錄 id

    return balance;
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

  async get(key){
    if(this.app.redis){
        var data = await this.app.redis.get(key);
        if(!data) return;
        return JSON.parse(data)
    }
  }   

}

module.exports = TransactionService;