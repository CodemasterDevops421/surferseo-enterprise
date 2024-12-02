const { MongoMemoryServer } = require('mongodb-memory-server');
const Redis = require('ioredis-mock');

module.exports = async () => {
  global.__MONGOD__ = await MongoMemoryServer.create();
  process.env.MONGO_URI = global.__MONGOD__.getUri();
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.NODE_ENV = 'test';
};