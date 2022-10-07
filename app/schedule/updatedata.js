const Subscription = require('egg').Subscription;

const sd = require('silly-datetime');

class UpdateData extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '1s', // 1 分钟间隔
      type: 'all', // 指定所有的 worker 都需要执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    // console.log(Math.floor(Math.random() * 101), sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss'));
    // console.log(sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss'))

    // 更新 Redis 資料到 Mysql
    const { ctx, app } = this;
    const redis = app.redis;
    let username = "root"
    const userTransactionsTemp = username + ':TransactionsTemp';
    const transactionName = username + ':Transactions:'; // 交易紀錄的 hash key 前綴
    let tempListLen = await redis.llen(userTransactionsTemp);

    // console.log(tempListLen);

    if (tempListLen) {
      console.log("Has data");
      const transactionsTempIdList = await redis.lrange(userTransactionsTemp, 0, tempListLen);
      // console.log(transactionsTempIdList);
      const transactionsList = await ctx.service.transaction.getList(transactionName, transactionsTempIdList);
      // console.log(transactionsList);
      await ctx.model.Transaction.bulkCreate(transactionsList);
      await redis.ltrim(userTransactionsTemp, tempListLen + 1, -1);
      // ctx.body = transactionsList;
    }
  }
}

module.exports = UpdateData;