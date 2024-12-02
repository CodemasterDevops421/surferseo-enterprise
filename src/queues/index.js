const Queue = require('bull');
const SurferAPI = require('../core/SurferAPI');
const GoogleDriveUploader = require('../core/GoogleDriveUploader');
const metrics = require('../monitoring/metrics');

const documentQueue = new Queue('document-processing', process.env.REDIS_URL);

documentQueue.process('processDocument', async (job) => {
  const { documentId, destination, userId } = job.data;
  const startTime = Date.now();

  try {
    // Initialize services
    const surferApi = new SurferAPI(process.env.SURFER_API_KEY);
    const driveUploader = new GoogleDriveUploader(require('../credentials/google.json'));

    // Download document
    job.progress(25);
    const documentStream = await surferApi.downloadDocument(documentId);

    // Upload to Google Drive
    job.progress(75);
    const uploadResult = await driveUploader.uploadFile(
      documentStream,
      `document-${documentId}.pdf`,
      { destinationFolderId: destination }
    );

    // Record metrics
    metrics.documentProcessingDuration.observe({
      operation: 'complete'
    }, (Date.now() - startTime) / 1000);

    job.progress(100);
    return {
      status: 'success',
      fileId: uploadResult.id,
      webViewLink: uploadResult.webViewLink
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
});

module.exports = {
  documentQueue
};