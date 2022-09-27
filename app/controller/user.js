'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  async signUp() {
    const { ctx, app } = this;
    const { request: { body } } = ctx;

    const username = body.username;
    const passwd = body.password;

    await app.redis.hmset(username, {
      username: username,
      passwd: passwd,
      money: 0,
    });

    ctx
  }

  async login() {
    const { ctx, app } = this;
    const { request: { body } } = ctx;

    const username = await app.redis.hget(body.username, 'username');
    const passwd = await app.redis.hget(body.username, 'passwd');

    if(username === body.username && passwd === body.password){
      ctx.session.username = username;
      ctx.redirect('/user');
    }
    else{
      ctx.body = 'Login Failed';
    }
  }

  async logout() {
    const { ctx } = this;
    ctx.session.username = null;
    ctx.redirect('/');
  }

  async userPage() {
    const { ctx, app } = this;

    if (!ctx.session.username){
      ctx.redirect('/');
    }

    const username = await app.redis.hget(ctx.session.username, 'username');
    const money = await app.redis.hget(ctx.session.username, 'money');
    if (!username) return;
    if (!money) return;

    await ctx.render('user.njk', { username: username, money: money });
  }
}

module.exports = UserController;
