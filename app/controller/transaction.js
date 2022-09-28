'use strict';

const Controller = require('egg').Controller;

function toInt(str) {
  if (typeof str === 'number') return str;
  if (!str) return str;
  return parseInt(str, 10) || 0;
}

class TransactionController extends Controller {
  async index() {
    const { ctx } = this;
    const username = ctx.session.username;
    const transactions = await ctx.model.Transaction.findAll({
      where: {
        user: username
      },
      order: [[ 'date', 'DESC' ]]
    });
    // console.log(transactions);

    await ctx.render('transaction.njk', { transactions: transactions });
    // ctx.body = transactions;
  }

  async create() {
    const { ctx } = this;
    const { request: { body } } = ctx;
    const username = ctx.session.username;
    const operate = body.operate;

    if (isNaN(body.amount)){
      await ctx.render('money.njk', { typeNumber: '請輸入數字' });
      ctx.redirect('/deposit');

      return;
    }
    const amount = toInt(body.amount);
    // console.log(amount);
    const user = await ctx.model.User.findOne({ where: { name: username } });
    const money = toInt(user.money);
    // console.log(user);
    if (operate === 'withdraw' && amount > money){
      await ctx.render('money.njk', {
        operateName: "提款",
        money: money,
        operate: operate,
        btnName: "提領",
        typeNumber: '提款金額不得大於餘額'
      });

      return;
    }
    let balance = (operate === 'deposit') ? money + amount : money - amount;
    await user.update({ money: balance });
    await ctx.model.Transaction.create({
      user: username,
      deposit: (operate === 'deposit') ? amount : 0,
      withdraw: (operate === 'withdraw') ? amount : 0,
      balance: balance,
    });

    ctx.redirect('/users');
  }

  async operate() {
    const { ctx } = this;
    const { request: { body } } = ctx;
    const username = ctx.session.username;
    const operate = body.operate;
    // console.log(operate);
    const user = await ctx.model.User.findOne({ where: { name: username } });
    const money = toInt(user.money);

    await ctx.render('money.njk', {
      operateName: (operate === 'deposit') ? '存款' : "提款",
      money: money,
      operate: operate,
      btnName: (operate === 'deposit') ? '存入' : "提領",
    });
  }
}

module.exports = TransactionController;
