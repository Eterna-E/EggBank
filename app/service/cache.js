'use strict';

const Service = require('egg').Service;

class CacheService extends Service {
  async set(key,value,seconds) {
    value = JSON.stringify(value);
    if (this.app.redis) {
      if (!seconds) {
        await this.app.redis.set(key, value);
      } else {
        await this.app.redis.set(key, value, 'EX', seconds);
      }
    }
  }

  async get(key) {
    if (this.app.redis) {
      var data = await this.app.redis.get(key);
      if (!data) {
        return;
      }

      return JSON.parse(data);
    }
  }   

  async hmset(key, object) {
    if (this.app.redis) {
      await this.app.redis.hmset(key, object);
    }
  }

  async hget(key, field) {
    if (this.app.redis) {
      await this.app.redis.hget(key, field);
    }
  }
}

module.exports = CacheService;
