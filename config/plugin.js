'use strict';

/** @type Egg.EggPlugin */
module.exports = {
  nunjucks : {
    enable: true,
    package: 'egg-view-nunjucks',
  },
  sequelize : {
    enable: true,
    package: 'egg-sequelize',
  },
  redis : {
    enable: true,
    package: 'egg-redis',
  }
};
