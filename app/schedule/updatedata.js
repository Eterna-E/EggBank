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
    const transactionsIdTempList = "Transactions:Temp";
    let tempListLen = await redis.llen(transactionsIdTempList);

    if (tempListLen) {
      console.log("Has data");
      const idList = await redis.lpop(transactionsIdTempList, tempListLen);
      // console.log(idList)
      const transactionsList = await ctx.service.transaction.getList(idList);
      // console.log(transactionsList)
      await ctx.model.Transaction.bulkCreate(transactionsList);
    }
  }
}

module.exports = UpdateData;