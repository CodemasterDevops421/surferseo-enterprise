const SurferAPI = require('../../core/SurferAPI');
const GoogleDriveUploader = require('../../core/GoogleDriveUploader');
const metrics = require('../../monitoring/metrics');
const logger = require('../../utils/logger');

class DocumentController {
  constructor(user) {
    this.surferApi = new SurferAPI(process.env.SURFER_API_KEY);
    this.driveUploader = new GoogleDriveUploader(require('../../config/google-credentials.json'));
    this.user = user;
  }

  async getDocument(id) {
    const timer = metrics.documentProcessingDuration.startTimer();
    try {
      logger.info(`Fetching document ${id} for user ${this.user.id}`);
      const document = await this.surferApi.getDocument(id);
      timer({ operation: 'get_document' });
      return document;
    } catch (error) {
      logger.error(`Error fetching document ${id}:`, error);
      throw error;
    }
  }

  async downloadDocument(id) {
    const timer = metrics.documentProcessingDuration.startTimer();
    try {
      logger.info(`Downloading document ${id} for user ${this.user.id}`);
      const stream = await this.surferApi.downloadDocument(id);
      timer({ operation: 'download_document' });
      return stream;
    } catch (error) {
      logger.error(`Error downloading document ${id}:`, error);
      throw error;
    }
  }

  async exportToGoogleDrive(id, options = {}) {
    const timer = metrics.documentProcessingDuration.startTimer();
    try {
      logger.info(`Exporting document ${id} to Google Drive for user ${this.user.id}`);
      
      // Get document metadata
      const metadata = await this.surferApi.getDocument(id);
      
      // Download document
      const documentStream = await this.surferApi.downloadDocument(id);
      
      // Upload to Google Drive
      const uploadResult = await this.driveUploader.uploadFile(
        documentStream,
        options.fileName || `${metadata.title}.pdf`,
        {
          metadata: {
            description: `Exported from SurferSEO - Document ID: ${id}`,
            ...options.metadata
          }
        }
      );

      timer({ operation: 'export_to_drive' });
      
      return {
        success: true,
        fileId: uploadResult.id,
        webViewLink: uploadResult.webViewLink,
        fileName: uploadResult.name
      };
    } catch (error) {
      logger.error(`Error exporting document ${id} to Google Drive:`, error);
      throw error;
    }
  }
}

module.exports = DocumentController;