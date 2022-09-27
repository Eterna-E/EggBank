'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  async signUp() {
    const { ctx, app } = this;
    const { request: { body } } = ctx;
    const username = body.username;
    const password = body.password;

    const user = await ctx.model.User.create({ 
      name: username,
      password: password,
      money: 100,
    });
    ctx.session.username = username;

    ctx.redirect('/userpage');
  }

  async login() {
    const { ctx, app } = this;
    const { request: { body } } = ctx;

    const user = await ctx.model.User.findOne({ where: { name: body.username } });
    if(!user) {
      await ctx.render('home.njk', { userNotFound: "使用者不存在" });
      return;
    }
    const username = user.name;
    const password = user.password;

    if(username === body.username && password === body.password){
      ctx.session.username = username;
      ctx.redirect('/userpage');
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

  async userPage() {
    const { ctx, app } = this;

    if (!ctx.session.username){
      await ctx.render('home.njk', { userNotFound: "請登入" });

      return;
    }

    const user = await ctx.model.User.findOne({ where: { name: ctx.session.username } });
    
    if (!user) ctx.redirect('/');
    // console.log(user);
    const username = user.name;
    const money = user.money;
    // if (!username) return;
    // if (!money) return;

    await ctx.render('user.njk', { username: username, money: money });
  }
}

module.exports = UserController;
