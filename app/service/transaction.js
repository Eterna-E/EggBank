'use strict';

const sd = require('silly-datetime');
const { toInt } = require('../utils/utils')

const Service = require('egg').Service;

class TransactionService extends Service {

  async createTransaction(username){ //改善方法2：重寫建立存提款交易-程式架構
    const { app } = this;
    const redis = app.redis;
    const userTransactions = username + ':TransactionsAll';
    const userBalanceRedis = username + 'Balance';
    const userBalanceHandling = userBalanceRedis + "Handling";

    let lock = await redis.set(userBalanceHandling, "Handling", "EX", 1, "NX");
    while (! lock){
      lock = await redis.set(userBalanceHandling, "Handling", "EX", 1, "NX");
    }

    const transactionList = await redis.llen(userTransactions);
    let balance;

    if (! transactionList) { // transactionList 不存在，Mysql to Redis 資料同步
      const transactionList = await this.getAllTransactions(username, 100000); // 查詢 mysql 全部交易資料
      // console.log("userTransactions.length", transactionList.length);
      for (let i in transactionList){ // 同步資料到 redis
        await redis.rpush(userTransactions, transactionList[i].id);
        await redis.hset(username + ":Transactions:" + transactionList[i].id, transactionList[i]);
      }
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

    const transactionKey = username + ":Transactions:" + transactionId;
    const transactionIdTempList = username + ":TransactionsTemp";
    newestTransactionId = await redis.lindex(userTransactions, 0);

    let balance = toInt(await redis.hget(username + ":Transactions:" + newestTransactionId, "balance"));

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
    
    await redis.rpush(transactionIdTempList, transactionId); // 寫入還沒同步到 mysql 的 交易紀錄 id

    return balance;
  }

  async balance(username) { // 存提款金額加減完後存入 Redis
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const operate = body.operate;
    const amount = toInt(body.amount);
    const redis = app.redis;
    const userBalanceRedis = username + 'Balance';
    const userBalanceHandling = userBalanceRedis + "Handling";

    let lock = await redis.set(userBalanceHandling, "Handling", "EX", 1, "NX");
    while (! lock){
      lock = await redis.set(userBalanceHandling, "Handling", "EX", 1, "NX");
    }

    if (isNaN(amount)){
      ctx.body = {
        inputTypeError: '請輸入數字'
      }

      return false;
    }
    let balance = await redis.get(userBalanceRedis);
    if (balance){
      balance = toInt(balance);
    }
    else{
      let userBalance = await ctx.model.Transaction.findOne({ 
        where: { user: username },
        order: [[ 'id', 'DESC' ]],
      });
      balance = toInt(userBalance.balance);
      await redis.set(userBalanceRedis, balance);
      // await redis.expire(userBalanceRedis, 3600);
    }
    
    if (operate === 'withdraw' && amount > balance){
      ctx.body = {
        amountError: '提款金額不得大於餘額'
      }

      return false;
    }
    balance = toInt(balance);
    balance = (operate === 'deposit') ? balance + amount : balance - amount;
    await redis.set(userBalanceRedis, balance);

    await redis.del(userBalanceHandling);

    return balance;
  }

  async insertOne(username, balance) { // 寫入1筆交易紀錄 到 Redis 的 <user>:TransactionsAll 鍵上
    const { app } = this;
    const redis = app.redis;
    const userTransactions = username + ':TransactionsAll';
    const transactionList = await redis.llen(userTransactions);

    if (! transactionList) { // transactionList 不存在，Mysql to Redis 資料同步
      const transactionList = await this.getAllTransactions(username, 100000); // 查詢 mysql 全部交易資料
      // console.log("userTransactions.length", transactionList.length);
      for (let i in transactionList){ // 同步資料到 redis
        await redis.rpush(userTransactions, transactionList[i].id);
        await redis.hset(username + ":Transactions:" + transactionList[i].id, transactionList[i]);
      }
      this.insertTransaction(username, userTransactions, balance); //寫入 1 筆交易紀錄到 redis 
    }
    else{ // transactionList 存在
      this.insertTransaction(username, userTransactions, balance); //寫入 1 筆交易紀錄到 redis 
    }
  }

  async insertTransaction(username, userTransactions, balance) { //寫入 1 筆交易紀錄到 redis 
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const redis = app.redis;
    const operate = body.operate;
    const amount = toInt(body.amount);
    const transactionId = (toInt(await redis.lindex(userTransactions, 0))) + 1;
    await redis.lpush(userTransactions, transactionId);

    const transactionKey = username + ":Transactions:" + transactionId;
    const transactionIdTempList = username + ":TransactionsTemp";

    await redis.rpush(transactionIdTempList, transactionId); // 寫入還沒同步到 mysql 的 交易紀錄 id
    await redis.hset(transactionKey, {
      id: transactionId,
      user: username,
      deposit: (operate === 'deposit') ? amount : 0,
      withdraw: (operate === 'withdraw') ? amount : 0,
      balance: balance,
      date: sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    });
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

  async getList(transactionName, transactionIdList) {
    const { app } = this;
    const redis = app.redis;
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