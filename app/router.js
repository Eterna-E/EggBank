'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.get('/logout', controller.user.logout);

  router.post('/login', controller.user.login);
  router.post('/operate', controller.transaction.operate);

  router.resources('users', '/users', controller.user);
  router.resources('trans', '/trans', controller.transaction);
  router.resources('trans', '/api/trans', controller.apiTransaction);
};
