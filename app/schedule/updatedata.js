const Subscription = require('egg').Subscription;

const sd = require('silly-datetime');

class UpdateData extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '1s', // 1 分钟间隔
      type: 'worker', // 指定所有的 worker 都需要执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() { // 更新 Redis 資料到 Mysql
    const { ctx, app } = this;
    const redis = app.redis;
    const transactionsTemp = "Transactions:Temp";
    let tempListLen = await redis.llen(transactionsTemp);
    let transactionsList = [];

    if (tempListLen) {
      const tempList = await redis.lpop(transactionsTemp, tempListLen);
      for (let i in tempList) {
        transactionsList.push(JSON.parse(tempList[i]));
      }
      await ctx.model.Transaction.bulkCreate(transactionsList);
    }
  }
}

module.exports = UpdateData;
