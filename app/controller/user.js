'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {

  async index() { // 使用者首頁
    const { ctx, app } = this;
    const username = ctx.session.username;
    const redis = app.redis;
    const userBalanceRedis = username + ':Balance';
    let money;

    if (!username){
      await ctx.render('home.njk', { userNotFound: "請登入" });

      return;
    }
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
    }

    await ctx.render('user.njk', { username: username, money: money });
  }

  async create() { // 註冊
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const username = body.username;
    const password = body.password;

    let user = await this.ctx.service.cache.get(username);
    if(!user){
      user = await ctx.model.User.findOne({ where: { name: username } });
      await ctx.service.cache.set(username, user, 3600);
    }

    if(!user){
      await ctx.model.User.create({ 
        name: username,
        password: password,
      });
      await ctx.model.Transaction.create({
        user: username,
        deposit: 100,
        withdraw: 0,
        balance: 100,
      });
      ctx.session.username = username;
  
      ctx.redirect('/users');
    }
    else{
      await ctx.render('home.njk', { userExist: "帳號已存在，請重新輸入" });
    }
  }

  async login() { // 登入
    const { ctx } = this;
    const { request: { body } } = ctx;

    let user = await this.ctx.service.cache.get(body.username);
    if(!user){
      user = await ctx.model.User.findOne({ where: { name: body.username } });
      await ctx.service.cache.set(body.username, user, 3600);
    }
    if(!user) {
      await ctx.render('home.njk', { userNotFound: "使用者不存在" });

      return;
    }
    const username = user.name;
    const password = user.password;

    if(username === body.username && password === body.password){
      ctx.session.username = username;
      ctx.redirect('/users');
    }
    else{
      await ctx.render('home.njk', { passWordIncorrect: "密碼錯誤" });
    }
  }

  async logout() {
    const { ctx } = this;
    ctx.session = null;

    ctx.redirect('/');
  }
}

module.exports = UserController;
