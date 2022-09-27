'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);

  router.get('/userpage', controller.user.userPage);
  router.get('/logout', controller.user.logout);

  router.post('/login', controller.user.login);
  router.post('/signup', controller.user.signUp);

  router.resources('trans', '/trans', controller.transaction);
  router.get('/deposit', controller.transaction.savemoneyPage);
};
