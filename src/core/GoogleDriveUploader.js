const { google } = require('googleapis');
const winston = require('winston');
const stream = require('stream');
const { promisify } = require('util');

class GoogleDriveUploader {
  constructor(credentials, options = {}) {
    this.auth = this._initializeAuth(credentials);
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.logger = this._initializeLogger();
    this.pipeline = promisify(stream.pipeline);
  }

  _initializeAuth(credentials) {
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
  }

  _initializeLogger() {
    return winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'google-drive' },
      transports: [
        new winston.transports.File({ filename: 'logs/gdrive-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/gdrive.log' })
      ]
    });
  }

  async uploadFile(fileStream, fileName, options = {}) {
    const startTime = Date.now();
    try {
      const fileMetadata = {
        name: fileName,
        ...options.metadata
      };

      const media = {
        mimeType: options.mimeType || 'application/octet-stream',
        body: fileStream
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, size',
        supportsAllDrives: true
      });

      this._logSuccess('uploadFile', response.data, startTime);
      return response.data;
    } catch (error) {
      this._logError('uploadFile', error, fileName);
      throw this._handleError(error);
    }
  }

  _logSuccess(operation, data, startTime) {
    this.logger.info({
      operation,
      fileId: data.id,
      size: data.size,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }

  _logError(operation, error, fileName) {
    this.logger.error({
      operation,
      fileName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  _handleError(error) {
    if (error.response) {
      return new Error(`Google Drive API Error: ${error.response.data.error.message}`);
    }
    return new Error(`Upload Error: ${error.message}`);
  }
}

module.exports = GoogleDriveUploader;