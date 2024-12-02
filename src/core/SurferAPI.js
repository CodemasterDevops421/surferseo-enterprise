const axios = require('axios');
const { CircuitBreaker } = require('opossum');
const winston = require('winston');

class SurferAPI {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.surferseo.com/v1';
    this.logger = this._initializeLogger();
    this.client = this._initializeClient();
    this.circuitBreaker = this._initializeCircuitBreaker(options.circuitBreaker);
  }

  _initializeLogger() {
    return winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'surfer-api' },
      transports: [
        new winston.transports.File({ filename: 'logs/surfer-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/surfer.log' })
      ]
    });
  }

  _initializeClient() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  _initializeCircuitBreaker(options = {}) {
    return new CircuitBreaker(async (operation) => {
      return await operation();
    }, {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      ...options
    });
  }

  async getDocument(documentId) {
    return this.circuitBreaker.fire(async () => {
      try {
        const startTime = Date.now();
        const response = await this.client.get(`/documents/${documentId}`);
        this._logSuccess('getDocument', documentId, startTime);
        return response.data;
      } catch (error) {
        this._logError('getDocument', error, documentId);
        throw this._handleError(error);
      }
    });
  }

  async downloadDocument(documentId, options = {}) {
    return this.circuitBreaker.fire(async () => {
      try {
        const startTime = Date.now();
        const response = await this.client.get(`/documents/${documentId}/export`, {
          responseType: 'stream',
          ...options
        });
        this._logSuccess('downloadDocument', documentId, startTime);
        return response.data;
      } catch (error) {
        this._logError('downloadDocument', error, documentId);
        throw this._handleError(error);
      }
    });
  }

  _logSuccess(operation, documentId, startTime) {
    this.logger.info({
      operation,
      documentId,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }

  _logError(operation, error, documentId) {
    this.logger.error({
      operation,
      documentId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  _handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(`API Error: ${status} - ${data.message || 'Unknown error'}`);
    }
    if (error.request) {
      return new Error(`Network Error: ${error.message}`);
    }
    return new Error(`Request Error: ${error.message}`);
  }
}

module.exports = SurferAPI;