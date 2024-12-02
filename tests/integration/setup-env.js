const Redis = require('ioredis-mock');

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.PORT = 3001;
  
  // Mock external services
  jest.mock('../../src/core/SurferAPI');
  jest.mock('../../src/core/GoogleDriveUploader');
  
  // Mock Redis
  jest.mock('ioredis', () => require('ioredis-mock'));
});

afterAll(async () => {
  // Cleanup
  jest.restoreAllMocks();
});