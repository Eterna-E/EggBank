'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;

    if (ctx.session.username){
      ctx.redirect('/userpage');

      return;
    }
    
    await ctx.render('home.njk');
  }
}

module.exports = HomeController;
