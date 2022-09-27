'use strict';

const Controller = require('egg').Controller;

class TransactionController extends Controller {
  async index() {
    const { ctx } = this;
    
    await ctx.render('transaction.njk');
  }

  async create() {
    const { ctx } = this;

    const { request: { body } } = ctx;
    const username = body.username;
    const password = body.password;

    const savemoney = await ctx.model.Transaction.create();

    await ctx.render('transaction.njk');
  }

  async savemoneyPage() {
    const { ctx } = this;
    
    await ctx.render('savemoney.njk');
  }
}

module.exports = TransactionController;
