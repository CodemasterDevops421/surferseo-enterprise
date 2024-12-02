const crypto = require('crypto');
const { Dataset, KeyValueStore } = require('apify');

class ApifyHandlers {
  constructor(surferApi, driveUploader) {
    this.surferApi = surferApi;
    this.driveUploader = driveUploader;
    this.store = KeyValueStore.getInput();
  }

  async processDocument(documentId, destinationFolder) {
    const requestId = crypto.randomUUID();
    console.log(`Processing document ${documentId}, request: ${requestId}`);

    try {
      const documentStream = await this.surferApi.downloadDocument(documentId);
      
      const uploadResult = await this.driveUploader.uploadFile(
        documentStream,
        `surfer-doc-${documentId}.pdf`,
        { destinationFolderId: destinationFolder }
      );

      await Dataset.pushData({
        requestId,
        status: 'success',
        documentId,
        driveFileId: uploadResult.id,
        webViewLink: uploadResult.webViewLink,
        timestamp: new Date().toISOString()
      });

      return uploadResult;
    } catch (error) {
      await Dataset.pushData({
        requestId,
        status: 'error',
        documentId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async handleBatchProcess(documents) {
    const results = [];
    const errors = [];

    for (const doc of documents) {
      try {
        const result = await this.processDocument(doc.id, doc.folder);
        results.push(result);
      } catch (error) {
        errors.push({
          documentId: doc.id,
          error: error.message
        });
      }
    }

    return {
      successful: results,
      failed: errors
    };
  }
}